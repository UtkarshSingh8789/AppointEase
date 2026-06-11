"""Provider service with business logic."""

import math
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.appointment import Appointment, AppointmentStatus
from app.models.provider import ServiceProvider
from app.models.service_category import ServiceCategory
from app.models.user import User, UserRole
from app.schemas.provider import ProviderCreate, ProviderUpdate


class ProviderService:
    """Service handling provider operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_provider(self, user: User, data: ProviderCreate) -> ServiceProvider:
        """Register a user as a service provider."""
        # Check if user already has a provider profile
        result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.user_id == user.id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already registered as a provider",
            )

        # Validate category exists
        cat_result = await self.db.execute(
            select(ServiceCategory).where(ServiceCategory.id == data.category_id)
        )
        category = cat_result.scalar_one_or_none()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service category not found",
            )

        # Create provider profile
        provider = ServiceProvider(
            user_id=user.id,
            specialization=data.specialization,
            category_id=data.category_id,
            experience_years=data.experience_years,
            location=data.location,
            pincode=data.pincode,
            area=data.area,
            profile_description=data.profile_description,
            hourly_rate=data.hourly_rate,
        )

        self.db.add(provider)

        # Update user role to provider
        user.role = UserRole.PROVIDER
        await self.db.flush()
        await self.db.refresh(provider)

        # Load relationships
        result = await self.db.execute(
            select(ServiceProvider)
            .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
            .where(ServiceProvider.id == provider.id)
        )
        return result.scalar_one()

    async def get_provider_by_id(self, provider_id: UUID) -> ServiceProvider:
        """Get a provider by ID with relationships loaded."""
        result = await self.db.execute(
            select(ServiceProvider)
            .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
            .where(ServiceProvider.id == provider_id)
        )
        provider = result.scalar_one_or_none()

        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found",
            )
        return provider

    async def get_provider_by_user_id(self, user_id: UUID) -> ServiceProvider:
        """Get a provider by their user ID."""
        result = await self.db.execute(
            select(ServiceProvider)
            .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
            .where(ServiceProvider.user_id == user_id)
        )
        provider = result.scalar_one_or_none()

        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider profile not found",
            )
        return provider

    async def list_providers(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        category_id: Optional[UUID] = None,
        location: Optional[str] = None,
        pincode: Optional[str] = None,
        area: Optional[str] = None,
        min_rating: Optional[float] = None,
    ) -> dict:
        """List providers with filters and pagination."""
        query = select(ServiceProvider).options(
            joinedload(ServiceProvider.user),
            joinedload(ServiceProvider.category),
        )

        # Build filters list
        filters = [ServiceProvider.is_verified == True]

        if search:
            query = query.join(ServiceProvider.user)
            filters.append(
                (ServiceProvider.specialization.ilike(f"%{search}%"))
                | (User.full_name.ilike(f"%{search}%"))
            )
        if category_id:
            filters.append(ServiceProvider.category_id == category_id)
        if location:
            filters.append(ServiceProvider.location.ilike(f"%{location}%"))
        if pincode:
            filters.append(ServiceProvider.pincode == pincode)
        if area:
            filters.append(ServiceProvider.area.ilike(f"%{area}%"))
        if min_rating is not None and min_rating > 0:
            filters.append(ServiceProvider.rating >= min_rating)

        # Apply all filters to main query
        query = query.where(*filters)

        # Build count query with the SAME filters
        count_subquery = select(ServiceProvider.id)
        if search:
            count_subquery = count_subquery.join(ServiceProvider.user)
        count_subquery = count_subquery.where(*filters).subquery()
        count_query = select(func.count()).select_from(count_subquery)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(
            ServiceProvider.rating.desc()
        )

        result = await self.db.execute(query)
        providers = result.unique().scalars().all()

        return {
            "providers": providers,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 0,
        }

    async def update_provider(
        self, user: User, update_data: ProviderUpdate
    ) -> ServiceProvider:
        """Update provider profile."""
        provider = await self.get_provider_by_user_id(user.id)

        update_dict = update_data.model_dump(exclude_unset=True)

        # Validate category if being updated
        if "category_id" in update_dict:
            cat_result = await self.db.execute(
                select(ServiceCategory).where(
                    ServiceCategory.id == update_dict["category_id"]
                )
            )
            if not cat_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service category not found",
                )

        for field, value in update_dict.items():
            setattr(provider, field, value)

        await self.db.flush()
        await self.db.refresh(provider)

        # Reload with relationships
        result = await self.db.execute(
            select(ServiceProvider)
            .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
            .where(ServiceProvider.id == provider.id)
        )
        return result.scalar_one()

    async def get_provider_stats(self, user: User) -> dict:
        """Get statistics for a provider."""
        provider = await self.get_provider_by_user_id(user.id)

        # Get appointment counts by status
        total_result = await self.db.execute(
            select(func.count()).where(Appointment.provider_id == provider.id)
        )
        total = total_result.scalar()

        completed_result = await self.db.execute(
            select(func.count()).where(
                Appointment.provider_id == provider.id,
                Appointment.status == AppointmentStatus.COMPLETED,
            )
        )
        completed = completed_result.scalar()

        pending_result = await self.db.execute(
            select(func.count()).where(
                Appointment.provider_id == provider.id,
                Appointment.status == AppointmentStatus.PENDING,
            )
        )
        pending = pending_result.scalar()

        cancelled_result = await self.db.execute(
            select(func.count()).where(
                Appointment.provider_id == provider.id,
                Appointment.status == AppointmentStatus.CANCELLED,
            )
        )
        cancelled = cancelled_result.scalar()

        return {
            "total_appointments": total,
            "completed_appointments": completed,
            "pending_appointments": pending,
            "cancelled_appointments": cancelled,
            "rating": provider.rating,
            "total_reviews": provider.total_reviews,
        }
