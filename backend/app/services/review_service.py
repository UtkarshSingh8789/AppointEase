"""Review service with business logic."""

import math
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.appointment import Appointment, AppointmentStatus
from app.models.provider import ServiceProvider
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate


class ReviewService:
    """Service handling review operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_review(self, customer: User, data: ReviewCreate) -> Review:
        """Create a new review for a completed appointment."""
        # Verify appointment exists and belongs to customer
        appt_result = await self.db.execute(
            select(Appointment).where(Appointment.id == data.appointment_id)
        )
        appointment = appt_result.scalar_one_or_none()

        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

        if appointment.customer_id != customer.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only review your own appointments",
            )

        if appointment.status != AppointmentStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only review completed appointments",
            )

        # Validate minimum comment length
        if data.comment and len(data.comment.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Review comment must be at least 5 characters.",
            )

        # Check for existing review
        existing_result = await self.db.execute(
            select(Review).where(Review.appointment_id == data.appointment_id)
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A review already exists for this appointment",
            )

        # Create review
        review = Review(
            appointment_id=data.appointment_id,
            customer_id=customer.id,
            provider_id=appointment.provider_id,
            rating=data.rating,
            comment=data.comment,
        )

        self.db.add(review)
        await self.db.flush()

        # AI Feature #6: Run sentiment analysis on the new review
        try:
            from app.services.sentiment_service import analyze_and_persist
            await analyze_and_persist(review, self.db)
        except Exception:
            pass  # Sentiment failure must not block review creation

        # Recalculate provider rating
        await self._recalculate_provider_rating(appointment.provider_id)

        from app.services.achievement_service import AchievementService

        achievement_service = AchievementService(self.db)
        await achievement_service.check_and_award_with_wallet(
            user_id=customer.id,
            event_type="review_created",
            event_data={"rating": data.rating},
        )

        await self.db.refresh(review)

        # Load relationships
        result = await self.db.execute(
            select(Review)
            .options(joinedload(Review.customer))
            .where(Review.id == review.id)
        )
        return result.scalar_one()

    async def get_provider_reviews(
        self, provider_id: UUID, page: int = 1, size: int = 10
    ) -> dict:
        """Get paginated reviews for a provider."""
        # Verify provider exists
        provider_result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.id == provider_id)
        )
        if not provider_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found",
            )

        count_query = select(func.count(Review.id)).where(
            Review.provider_id == provider_id
        )
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * size
        query = (
            select(Review)
            .options(joinedload(Review.customer))
            .where(Review.provider_id == provider_id)
            .offset(offset)
            .limit(size)
            .order_by(Review.created_at.desc())
        )

        result = await self.db.execute(query)
        reviews = result.unique().scalars().all()

        return {
            "reviews": reviews,
            "total": total,
            "page": page,
            "per_page": size,
            "total_pages": math.ceil(total / size) if total > 0 else 0,
        }

    async def get_my_reviews(
        self, customer_id: UUID, page: int = 1, size: int = 10
    ) -> dict:
        """Get reviews written by a customer."""
        count_query = select(func.count(Review.id)).where(
            Review.customer_id == customer_id
        )
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * size
        query = (
            select(Review)
            .options(joinedload(Review.customer))
            .where(Review.customer_id == customer_id)
            .offset(offset)
            .limit(size)
            .order_by(Review.created_at.desc())
        )

        result = await self.db.execute(query)
        reviews = result.unique().scalars().all()

        return {
            "reviews": reviews,
            "total": total,
            "page": page,
            "per_page": size,
            "total_pages": math.ceil(total / size) if total > 0 else 0,
        }

    async def delete_review(self, review_id: UUID, user_id: UUID) -> None:
        """Delete a review (only by the customer who wrote it)."""
        result = await self.db.execute(
            select(Review).where(Review.id == review_id)
        )
        review = result.scalar_one_or_none()

        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )

        if review.customer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own reviews",
            )

        provider_id = review.provider_id
        await self.db.delete(review)
        await self.db.flush()

        # Recalculate provider rating
        await self._recalculate_provider_rating(provider_id)

    async def _recalculate_provider_rating(self, provider_id: UUID) -> None:
        """Recalculate a provider's average rating and total reviews."""
        result = await self.db.execute(
            select(
                func.avg(Review.rating),
                func.count(Review.id),
            ).where(Review.provider_id == provider_id)
        )
        row = result.one()
        avg_rating = float(row[0]) if row[0] else 0.0
        total_reviews = row[1]

        # Update provider
        provider_result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.id == provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if provider:
            provider.rating = round(avg_rating, 2)
            provider.total_reviews = total_reviews
            await self.db.flush()
