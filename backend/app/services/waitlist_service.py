"""Waitlist service with business logic."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationType
from app.models.provider import ServiceProvider
from app.models.user import User
from app.models.waitlist import WaitlistEntry, WaitlistStatus
from app.schemas.waitlist import WaitlistCreate
from app.services.notification_service import NotificationService


class WaitlistService:
    """Service handling waitlist operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def join_waitlist(self, user: User, data: WaitlistCreate) -> WaitlistEntry:
        """Add a customer to the waitlist for a provider."""
        # Verify provider exists
        provider_result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.id == data.provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found",
            )

        # Check if already on waitlist for same provider/date
        existing_result = await self.db.execute(
            select(WaitlistEntry).where(
                WaitlistEntry.customer_id == user.id,
                WaitlistEntry.provider_id == data.provider_id,
                WaitlistEntry.preferred_date == data.preferred_date,
                WaitlistEntry.status == WaitlistStatus.WAITING,
            )
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already on waitlist for this provider and date",
            )

        entry = WaitlistEntry(
            customer_id=user.id,
            provider_id=data.provider_id,
            preferred_date=data.preferred_date,
            preferred_time_start=data.preferred_time_start,
            preferred_time_end=data.preferred_time_end,
            status=WaitlistStatus.WAITING,
        )

        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    async def get_my_waitlist(self, user_id: UUID) -> list:
        """Get all waitlist entries for a customer."""
        result = await self.db.execute(
            select(WaitlistEntry)
            .where(WaitlistEntry.customer_id == user_id)
            .order_by(WaitlistEntry.created_at.desc())
        )
        return result.scalars().all()

    async def remove_from_waitlist(self, entry_id: UUID, user_id: UUID) -> None:
        """Remove a customer from the waitlist."""
        result = await self.db.execute(
            select(WaitlistEntry).where(
                WaitlistEntry.id == entry_id,
                WaitlistEntry.customer_id == user_id,
            )
        )
        entry = result.scalar_one_or_none()

        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Waitlist entry not found",
            )

        await self.db.delete(entry)
        await self.db.flush()

    async def notify_waitlist_on_cancellation(
        self, provider_id: UUID, appointment_date, start_time=None, end_time=None
    ) -> None:
        """Notify the first eligible waitlist entry when an appointment is cancelled."""
        query = select(WaitlistEntry).where(
            WaitlistEntry.provider_id == provider_id,
            WaitlistEntry.preferred_date == appointment_date,
            WaitlistEntry.status == WaitlistStatus.WAITING,
        ).order_by(WaitlistEntry.created_at.asc()).limit(1)

        result = await self.db.execute(query)
        entry = result.scalar_one_or_none()

        if entry:
            # Update status to offered
            entry.status = WaitlistStatus.OFFERED
            await self.db.flush()

            # Send notification
            notification_service = NotificationService(self.db)
            await notification_service.create_notification(
                user_id=entry.customer_id,
                type=NotificationType.SYSTEM,
                title="Slot Available!",
                message=f"A slot has opened up on {appointment_date}. Book now before it's taken!",
                link=f"/providers/{provider_id}",
            )
