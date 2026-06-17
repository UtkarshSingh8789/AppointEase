"""Admin service with business logic."""

import math
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.appointment import Appointment, AppointmentStatus
from app.models.provider import ServiceProvider
from app.models.review import Review
from app.models.service_category import ServiceCategory
from app.models.user import User, UserRole
from app.schemas.service_category import CategoryCreate, CategoryUpdate
from app.services.provider_application_service import build_application_summary, get_application


class AdminService:
    """Service handling admin operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_platform_stats(self) -> dict:
        """Get platform-wide statistics with enhanced metrics."""
        today = date.today()
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        total_users_result = await self.db.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar()

        total_customers_result = await self.db.execute(
            select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)
        )
        total_customers = total_customers_result.scalar()

        total_providers_result = await self.db.execute(
            select(func.count(ServiceProvider.id))
        )
        total_providers = total_providers_result.scalar()

        total_appointments_result = await self.db.execute(
            select(func.count(Appointment.id))
        )
        total_appointments = total_appointments_result.scalar()

        pending_appointments_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                Appointment.status == AppointmentStatus.PENDING
            )
        )
        pending_appointments = pending_appointments_result.scalar()

        confirmed_appointments_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                Appointment.status == AppointmentStatus.CONFIRMED
            )
        )
        confirmed_appointments = confirmed_appointments_result.scalar()

        completed_appointments_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                Appointment.status == AppointmentStatus.COMPLETED
            )
        )
        completed_appointments = completed_appointments_result.scalar()

        cancelled_appointments_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                Appointment.status == AppointmentStatus.CANCELLED
            )
        )
        cancelled_appointments = cancelled_appointments_result.scalar()

        total_categories_result = await self.db.execute(
            select(func.count(ServiceCategory.id))
        )
        total_categories = total_categories_result.scalar()

        # Review stats
        total_reviews_result = await self.db.execute(
            select(func.count(Review.id))
        )
        total_reviews = total_reviews_result.scalar()

        avg_rating_result = await self.db.execute(
            select(func.avg(Review.rating))
        )
        avg_rating_raw = avg_rating_result.scalar()
        average_rating = round(float(avg_rating_raw), 2) if avg_rating_raw else 0.0

        # Appointments today
        appointments_today_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                Appointment.appointment_date == today
            )
        )
        appointments_today = appointments_today_result.scalar()

        # New users this week
        new_users_week_result = await self.db.execute(
            select(func.count(User.id)).where(User.created_at >= week_ago)
        )
        new_users_this_week = new_users_week_result.scalar()

        # New users this month
        new_users_month_result = await self.db.execute(
            select(func.count(User.id)).where(User.created_at >= month_ago)
        )
        new_users_this_month = new_users_month_result.scalar()

        return {
            "total_users": total_users,
            "total_customers": total_customers,
            "total_providers": total_providers,
            "total_appointments": total_appointments,
            "pending_appointments": pending_appointments,
            "confirmed_appointments": confirmed_appointments,
            "completed_appointments": completed_appointments,
            "cancelled_appointments": cancelled_appointments,
            "total_categories": total_categories,
            "total_reviews": total_reviews,
            "average_rating": average_rating,
            "appointments_today": appointments_today,
            "new_users_this_week": new_users_this_week,
            "new_users_this_month": new_users_this_month,
        }

    async def get_all_appointments(
        self,
        page: int = 1,
        per_page: int = 20,
        status_filter: Optional[AppointmentStatus] = None,
        provider_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        search: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> dict:
        """Get all appointments with filters (admin only)."""
        query = select(Appointment).options(
            joinedload(Appointment.customer),
            joinedload(Appointment.provider).joinedload(ServiceProvider.user),
            joinedload(Appointment.provider).joinedload(ServiceProvider.category),
        )

        count_query = select(func.count(Appointment.id))

        if status_filter:
            query = query.where(Appointment.status == status_filter)
            count_query = count_query.where(Appointment.status == status_filter)

        if provider_id:
            query = query.where(Appointment.provider_id == provider_id)
            count_query = count_query.where(Appointment.provider_id == provider_id)

        if category_id:
            query = query.join(
                ServiceProvider, Appointment.provider_id == ServiceProvider.id
            ).where(ServiceProvider.category_id == category_id)
            count_query = count_query.select_from(Appointment).join(
                ServiceProvider, Appointment.provider_id == ServiceProvider.id
            ).where(ServiceProvider.category_id == category_id)

        if search:
            term = f"%{search.strip()}%"
            search_filter = (
                Appointment.customer.has(
                    User.full_name.ilike(term) | User.email.ilike(term)
                )
                | Appointment.provider.has(
                    ServiceProvider.specialization.ilike(term)
                    | ServiceProvider.user.has(
                        User.full_name.ilike(term) | User.email.ilike(term)
                    )
                )
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if date_from:
            query = query.where(Appointment.appointment_date >= date_from)
            count_query = count_query.where(Appointment.appointment_date >= date_from)

        if date_to:
            query = query.where(Appointment.appointment_date <= date_to)
            count_query = count_query.where(Appointment.appointment_date <= date_to)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(
            Appointment.created_at.desc()
        )

        result = await self.db.execute(query)
        appointments = result.unique().scalars().all()

        return {
            "appointments": appointments,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 0,
        }

    async def get_pending_providers(self) -> list[dict]:
        """Get all providers that have submitted onboarding — pending, approved, and rejected.

        Approved/rejected providers from the last 30 days are included so admins
        can see the full review history without entries vanishing after action.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        result = await self.db.execute(
            select(ServiceProvider)
            .options(
                joinedload(ServiceProvider.user),
                joinedload(ServiceProvider.category),
            )
            .join(ServiceProvider.user)
            .where(
                # Pending (not verified, active user) OR recently processed (updated in last 30 days)
                (
                    (ServiceProvider.is_verified == False) |
                    (ServiceProvider.updated_at >= cutoff)
                ),
                User.role == UserRole.PROVIDER,
            )
            .order_by(ServiceProvider.updated_at.desc())
        )
        providers = result.unique().scalars().all()
        approvals: list[dict] = []
        for provider in providers:
            application = get_application(str(provider.id)) or {}
            # Determine review status
            if provider.is_verified:
                review_status = "approved"
            elif provider.user and not provider.user.is_active:
                review_status = "rejected"
            else:
                review_status = "pending"
            approvals.append(
                {
                    "provider": provider,
                    "avatar": application.get("avatar"),
                    "documents": application.get("documents", []),
                    "application": application.get("payload"),
                    "summary": build_application_summary(application),
                    "review_status": review_status,
                }
            )
        return approvals

    async def update_provider_approval(
        self, provider_id: UUID, approve: bool, reason: Optional[str] = None
    ) -> ServiceProvider:
        """Approve or reject a provider onboarding application."""
        result = await self.db.execute(
            select(ServiceProvider)
            .options(
                joinedload(ServiceProvider.user),
                joinedload(ServiceProvider.category),
            )
            .where(ServiceProvider.id == provider_id)
        )
        provider = result.scalar_one_or_none()

        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found",
            )

        provider.is_verified = approve
        if provider.user:
            provider.user.is_active = True if approve else False

        await self.db.flush()
        await self.db.refresh(provider)

        from app.services.notification_service import NotificationService
        from app.models.notification import NotificationType

        notification_service = NotificationService(self.db)
        await notification_service.create_notification(
            user_id=provider.user_id,
            type=NotificationType.SYSTEM,
            title="Provider application approved" if approve else "Provider application rejected",
            message=(
                "Your provider application has been approved. You can now access the provider panel."
                if approve
                else f"Your provider application was rejected. {reason or 'Please contact support for more information.'}"
            ),
            link="/provider/dashboard" if approve else "/login",
        )

        return provider

    async def create_category(self, data: CategoryCreate) -> ServiceCategory:
        """Create a new service category."""
        # Check for duplicate name
        result = await self.db.execute(
            select(ServiceCategory).where(ServiceCategory.name == data.name)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category with this name already exists",
            )

        category = ServiceCategory(
            name=data.name,
            description=data.description,
            icon=data.icon,
        )

        self.db.add(category)
        await self.db.flush()
        await self.db.refresh(category)
        return category

    async def update_category(
        self, category_id: UUID, data: CategoryUpdate
    ) -> ServiceCategory:
        """Update a service category."""
        result = await self.db.execute(
            select(ServiceCategory).where(ServiceCategory.id == category_id)
        )
        category = result.scalar_one_or_none()

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

        update_dict = data.model_dump(exclude_unset=True)

        # Check for duplicate name if name is being updated
        if "name" in update_dict:
            name_check = await self.db.execute(
                select(ServiceCategory).where(
                    ServiceCategory.name == update_dict["name"],
                    ServiceCategory.id != category_id,
                )
            )
            if name_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Category with this name already exists",
                )

        for field, value in update_dict.items():
            setattr(category, field, value)

        await self.db.flush()
        await self.db.refresh(category)
        return category

    async def delete_category(self, category_id: UUID) -> None:
        """Delete a service category."""
        result = await self.db.execute(
            select(ServiceCategory).where(ServiceCategory.id == category_id)
        )
        category = result.scalar_one_or_none()

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

        # Check if category has providers
        provider_count = await self.db.execute(
            select(func.count(ServiceProvider.id)).where(
                ServiceProvider.category_id == category_id
            )
        )
        if provider_count.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category with active providers",
            )

        await self.db.delete(category)
        await self.db.flush()

    async def list_categories(self) -> list:
        """List all service categories."""
        result = await self.db.execute(
            select(ServiceCategory).order_by(ServiceCategory.name)
        )
        return result.scalars().all()

    async def deactivate_provider_soft(self, user_id, is_active: bool):
        """Soft-delete/reactivate a provider by setting is_active on User and ServiceProvider."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user.is_active = is_active

        # If user is a provider, also update the ServiceProvider record
        if user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user_id)
            )
            provider = provider_result.scalar_one_or_none()
            if provider:
                provider.is_verified = is_active

        await self.db.flush()
        await self.db.refresh(user)
        return user
