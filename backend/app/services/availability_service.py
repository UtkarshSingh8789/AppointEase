"""Availability service with business logic."""

import math
from datetime import date, datetime, time, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus
from app.models.availability import Availability
from app.models.availability_exception import AvailabilityException
from app.models.provider import ServiceProvider
from app.schemas.availability import AvailabilityCreate, AvailabilityUpdate, TimeSlot


class AvailabilityService:
    """Service handling availability operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_availability(
        self, provider_id: UUID, data: AvailabilityCreate
    ) -> Availability:
        """Create a new availability slot for a provider."""
        # Check for overlapping slots on the same day
        result = await self.db.execute(
            select(Availability).where(
                Availability.provider_id == provider_id,
                Availability.day_of_week == data.day_of_week,
                Availability.is_active == True,
                Availability.start_time < data.end_time,
                Availability.end_time > data.start_time,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Overlapping availability slot exists for this day",
            )

        availability = Availability(
            provider_id=provider_id,
            day_of_week=data.day_of_week,
            start_time=data.start_time,
            end_time=data.end_time,
            slot_duration_minutes=data.slot_duration_minutes,
        )

        self.db.add(availability)
        await self.db.flush()
        await self.db.refresh(availability)
        return availability

    async def get_provider_availability(self, provider_id: UUID) -> List[Availability]:
        """Get all availability slots for a provider."""
        # Verify provider exists
        provider_result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.id == provider_id)
        )
        if not provider_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found",
            )

        result = await self.db.execute(
            select(Availability)
            .where(
                Availability.provider_id == provider_id,
                Availability.is_active == True,
            )
            .order_by(Availability.day_of_week, Availability.start_time)
        )
        return result.scalars().all()

    async def update_availability(
        self, availability_id: UUID, provider_id: UUID, data: AvailabilityUpdate
    ) -> Availability:
        """Update an availability slot."""
        result = await self.db.execute(
            select(Availability).where(
                Availability.id == availability_id,
                Availability.provider_id == provider_id,
            )
        )
        availability = result.scalar_one_or_none()

        if not availability:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability slot not found",
            )

        update_dict = data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(availability, field, value)

        await self.db.flush()
        await self.db.refresh(availability)
        return availability

    async def delete_availability(
        self, availability_id: UUID, provider_id: UUID
    ) -> None:
        """Delete an availability slot."""
        result = await self.db.execute(
            select(Availability).where(
                Availability.id == availability_id,
                Availability.provider_id == provider_id,
            )
        )
        availability = result.scalar_one_or_none()

        if not availability:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability slot not found",
            )

        await self.db.delete(availability)
        await self.db.flush()

    async def get_available_slots(
        self, provider_id: UUID, target_date: date, timezone: str = "Asia/Kolkata"
    ) -> List[TimeSlot]:
        """Get available time slots for a provider on a specific date.

        Args:
            provider_id: The provider's UUID.
            target_date: The date to check availability for.
            timezone: The timezone to use for slot generation (default: Asia/Kolkata / IST).
        """
        # Verify provider exists
        provider_result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.id == provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found",
            )

        # Check if provider is on vacation
        if provider.vacation_start and provider.vacation_end:
            if provider.vacation_start <= target_date <= provider.vacation_end:
                return []

        # Check for availability exceptions on this date
        exception_result = await self.db.execute(
            select(AvailabilityException).where(
                AvailabilityException.provider_id == provider_id,
                AvailabilityException.date == target_date,
            )
        )
        exception = exception_result.scalar_one_or_none()

        if exception:
            if exception.is_blocked:
                # Day is blocked (holiday) - return empty
                return []
            else:
                # Special hours - use exception times instead of regular availability
                if exception.start_time and exception.end_time:
                    # Get slot duration from regular availability
                    day_of_week = target_date.weekday()
                    avail_result = await self.db.execute(
                        select(Availability).where(
                            Availability.provider_id == provider_id,
                            Availability.day_of_week == day_of_week,
                            Availability.is_active == True,
                        )
                    )
                    regular_avail = avail_result.scalars().first()
                    slot_duration_minutes = regular_avail.slot_duration_minutes if regular_avail else 30

                    return await self._generate_slots(
                        provider_id,
                        target_date,
                        exception.start_time,
                        exception.end_time,
                        slot_duration_minutes,
                        timezone,
                    )

        # Get day of week (Python: Monday=0, Sunday=6)
        day_of_week = target_date.weekday()

        # Get availability for this day
        result = await self.db.execute(
            select(Availability).where(
                Availability.provider_id == provider_id,
                Availability.day_of_week == day_of_week,
                Availability.is_active == True,
            )
        )
        availabilities = result.scalars().all()

        if not availabilities:
            return []

        # Generate time slots for all availability windows
        all_slots: List[TimeSlot] = []
        for avail in availabilities:
            slots = await self._generate_slots(
                provider_id,
                target_date,
                avail.start_time,
                avail.end_time,
                avail.slot_duration_minutes,
                timezone,
            )
            all_slots.extend(slots)

        return all_slots

    async def _generate_slots(
        self,
        provider_id: UUID,
        target_date: date,
        start_time: time,
        end_time: time,
        slot_duration_minutes: int,
        timezone: str = "Asia/Kolkata",
    ) -> List[TimeSlot]:
        """Generate time slots for a given time window."""
        # Get existing appointments for this date
        appt_result = await self.db.execute(
            select(Appointment).where(
                Appointment.provider_id == provider_id,
                Appointment.appointment_date == target_date,
                Appointment.status.in_([
                    AppointmentStatus.PENDING,
                    AppointmentStatus.CONFIRMED,
                ]),
            )
        )
        booked_appointments = appt_result.scalars().all()

        slots: List[TimeSlot] = []
        current_time = start_time
        slot_duration = timedelta(minutes=slot_duration_minutes)

        # Get current time in the specified timezone
        try:
            import zoneinfo
            tz = zoneinfo.ZoneInfo(timezone)
            now_in_tz = datetime.now(tz)
        except Exception:
            now_in_tz = datetime.now()

        while True:
            # Calculate end time for this slot
            current_dt = datetime.combine(target_date, current_time)
            end_dt = current_dt + slot_duration
            slot_end_time = end_dt.time()

            # Check if slot is within availability window
            if slot_end_time > end_time:
                break

            # Check if slot is already booked
            is_available = True
            for appt in booked_appointments:
                if (
                    current_time < appt.end_time
                    and slot_end_time > appt.start_time
                ):
                    is_available = False
                    break

            # Don't show past slots for today (using timezone-aware time)
            if target_date == now_in_tz.date():
                now_time = now_in_tz.time()
                if current_time <= now_time:
                    is_available = False

            slots.append(
                TimeSlot(
                    start_time=current_time,
                    end_time=slot_end_time,
                    is_available=is_available,
                )
            )

            # Move to next slot
            current_time = slot_end_time

        return slots

    # --- Availability Exception Methods ---

    async def create_exception(
        self, provider_id: UUID, data
    ) -> AvailabilityException:
        """Create an availability exception (holiday or special hours)."""
        # Check for existing exception on same date
        existing_result = await self.db.execute(
            select(AvailabilityException).where(
                AvailabilityException.provider_id == provider_id,
                AvailabilityException.date == data.date,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An exception already exists for this date",
            )

        exception = AvailabilityException(
            provider_id=provider_id,
            date=data.date,
            reason=data.reason,
            is_blocked=data.is_blocked,
            start_time=data.start_time,
            end_time=data.end_time,
        )

        self.db.add(exception)
        await self.db.flush()
        await self.db.refresh(exception)
        return exception

    async def get_exceptions(
        self, provider_id: UUID, month: Optional[str] = None
    ) -> List[AvailabilityException]:
        """Get availability exceptions for a provider, optionally filtered by month."""
        query = select(AvailabilityException).where(
            AvailabilityException.provider_id == provider_id
        )

        if month:
            # Parse month string like "2026-06"
            try:
                year, month_num = month.split("-")
                query = query.where(
                    extract("year", AvailabilityException.date) == int(year),
                    extract("month", AvailabilityException.date) == int(month_num),
                )
            except (ValueError, AttributeError):
                pass

        query = query.order_by(AvailabilityException.date)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def delete_exception(
        self, exception_id: UUID, provider_id: UUID
    ) -> None:
        """Delete an availability exception."""
        result = await self.db.execute(
            select(AvailabilityException).where(
                AvailabilityException.id == exception_id,
                AvailabilityException.provider_id == provider_id,
            )
        )
        exception = result.scalar_one_or_none()

        if not exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability exception not found",
            )

        await self.db.delete(exception)
        await self.db.flush()
