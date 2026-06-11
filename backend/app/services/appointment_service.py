"""Appointment service with business logic."""

import math
from datetime import date, datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.appointment import Appointment, AppointmentStatus
from app.models.availability import Availability
from app.models.notification import NotificationType
from app.models.provider import ServiceProvider
from app.models.user import User, UserRole
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentReschedule,
    AppointmentStatusUpdate,
)
from app.services.notification_service import NotificationService


def _appointment_load_options():
    """Standard joinedload options for appointment queries."""
    return [
        joinedload(Appointment.customer),
        joinedload(Appointment.provider).joinedload(ServiceProvider.user),
        joinedload(Appointment.provider).joinedload(ServiceProvider.category),
    ]


class AppointmentService:
    """Service handling appointment operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _calculate_financials(
        hourly_rate: float,
        slot_duration_minutes: int,
        discount_amount: float = 0.0,
    ) -> tuple[float, float, float, float]:
        """Calculate base amount, GST, discount and total payable amount."""
        base_amount = round((hourly_rate * slot_duration_minutes) / 60, 2)
        gst_amount = round(base_amount * 0.18, 2)
        discount_amount = round(max(discount_amount, 0.0), 2)
        total_amount = round(max(base_amount + gst_amount - discount_amount, 0.0), 2)
        return base_amount, gst_amount, discount_amount, total_amount

    async def create_appointment(
        self, customer: User, data: AppointmentCreate
    ) -> Appointment:
        """Create a new appointment booking."""
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

        # Prevent self-booking
        if provider.user_id == customer.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot book an appointment with yourself",
            )

        # Get day of week for the appointment date
        day_of_week = data.appointment_date.weekday()

        # Check provider availability for this day
        avail_result = await self.db.execute(
            select(Availability).where(
                Availability.provider_id == data.provider_id,
                Availability.day_of_week == day_of_week,
                Availability.is_active == True,
            )
        )
        availabilities = avail_result.scalars().all()

        if not availabilities:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider is not available on this day",
            )

        # Calculate end time based on slot duration
        slot_duration = availabilities[0].slot_duration_minutes
        start_dt = datetime.combine(data.appointment_date, data.start_time)
        end_dt = start_dt + timedelta(minutes=slot_duration)
        end_time = end_dt.time()

        # Validate time is within availability window
        time_valid = False
        for avail in availabilities:
            if data.start_time >= avail.start_time and end_time <= avail.end_time:
                time_valid = True
                break

        if not time_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requested time is outside provider's availability hours",
            )

        # Check for double booking without any extra buffer between appointments
        conflict_result = await self.db.execute(
            select(Appointment).where(
                Appointment.provider_id == data.provider_id,
                Appointment.appointment_date == data.appointment_date,
                Appointment.status.in_([
                    AppointmentStatus.PENDING,
                    AppointmentStatus.CONFIRMED,
                ]),
                Appointment.start_time < end_time,
                Appointment.end_time > data.start_time,
            )
        )
        conflict = conflict_result.scalar_one_or_none()

        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This time slot conflicts with another appointment",
            )

        base_amount, gst_amount, discount_amount, total_amount = self._calculate_financials(
            provider.hourly_rate or 0.0,
            slot_duration,
            data.discount_amount or 0.0,
        )

        # Create appointment
        appointment = Appointment(
            customer_id=customer.id,
            provider_id=data.provider_id,
            appointment_date=data.appointment_date,
            start_time=data.start_time,
            end_time=end_time,
            base_amount=base_amount,
            gst_amount=gst_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
            notes=data.notes,
            # Successful payment means the appointment is confirmed and goes to upcoming.
            status=AppointmentStatus.CONFIRMED,
        )

        self.db.add(appointment)
        await self.db.flush()
        await self.db.refresh(appointment)

        # AI Feature #1: Compute no-show risk and store on appointment
        try:
            from app.services.no_show_predictor import compute_no_show_risk
            risk = await compute_no_show_risk(
                self.db, customer.id, data.appointment_date, data.start_time
            )
            appointment.no_show_risk = risk
            await self.db.flush()
        except Exception:
            pass  # Non-blocking

        # Create notification for provider
        notification_service = NotificationService(self.db)
        await notification_service.create_notification(
            user_id=provider.user_id,
            type=NotificationType.APPOINTMENT_BOOKED,
            title="New Appointment Booking",
            message=f"{customer.full_name} has booked an appointment on {data.appointment_date} at {data.start_time.strftime('%H:%M')}.",
            link=f"/appointments/{appointment.id}",
        )
        await notification_service.create_notification(
            user_id=customer.id,
            type=NotificationType.APPOINTMENT_CONFIRMED,
            title="Appointment Confirmed",
            message=(
                f"Your appointment on {data.appointment_date} at {data.start_time.strftime('%H:%M')} "
                f"has been confirmed and added to Upcoming."
            ),
            link=f"/appointments/{appointment.id}",
        )

        await self._award_achievement_rewards(
            user_id=customer.id,
            event_type="booking_early",
            event_data={
                "days_ahead": (data.appointment_date - date.today()).days,
            },
        )
        await self._award_achievement_rewards(
            user_id=customer.id,
            event_type="booking_night",
            event_data={
                "booking_hour": data.start_time.hour,
            },
        )

        # Send booking confirmation email to customer (non-blocking)
        from app.services.email_service import email_service
        provider_user_result = await self.db.execute(
            select(User).where(User.id == provider.user_id)
        )
        provider_user = provider_user_result.scalar_one_or_none()
        try:
            await email_service.send_appointment_confirmation(
                user_email=customer.email,
                user_name=customer.full_name,
                provider_name=provider_user.full_name if provider_user else "Provider",
                date=str(data.appointment_date),
                time=data.start_time.strftime('%I:%M %p'),
            )
        except Exception:
            pass  # Email failure should not block booking

        # Load relationships
        result = await self.db.execute(
            select(Appointment)
            .options(*_appointment_load_options())
            .where(Appointment.id == appointment.id)
        )
        return result.scalar_one()

    async def get_appointment_by_id(
        self, appointment_id: UUID, user: User
    ) -> Appointment:
        """Get appointment by ID with access control."""
        result = await self.db.execute(
            select(Appointment)
            .options(*_appointment_load_options())
            .where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()

        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

        # Access control
        if user.role == UserRole.ADMIN:
            return appointment
        if user.role == UserRole.CUSTOMER and appointment.customer_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        if user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider or appointment.provider_id != provider.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )

        await self._auto_complete_if_due(appointment)

        return appointment

    async def list_appointments(
        self,
        user: User,
        page: int = 1,
        per_page: int = 20,
        status_filter: Optional[List[str]] = None,
    ) -> dict:
        """List appointments filtered by user role. Supports multiple status filters."""
        query = select(Appointment).options(*_appointment_load_options())

        # Filter by role
        if user.role == UserRole.CUSTOMER:
            query = query.where(Appointment.customer_id == user.id)
        elif user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if provider:
                query = query.where(Appointment.provider_id == provider.id)
            else:
                return {
                    "appointments": [],
                    "total": 0,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": 0,
                }

        # Apply status filter (supports list of statuses)
        if status_filter:
            query = query.where(Appointment.status.in_(status_filter))

        # Build count query with same filters
        count_query = select(func.count(Appointment.id))
        if user.role == UserRole.CUSTOMER:
            count_query = count_query.where(Appointment.customer_id == user.id)
        elif user.role == UserRole.PROVIDER:
            provider_result2 = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider2 = provider_result2.scalar_one_or_none()
            if provider2:
                count_query = count_query.where(Appointment.provider_id == provider2.id)
        if status_filter:
            count_query = count_query.where(Appointment.status.in_(status_filter))

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(
            Appointment.appointment_date.desc(), Appointment.start_time.desc()
        )

        result = await self.db.execute(query)
        appointments = result.unique().scalars().all()
        for appointment in appointments:
            await self._auto_complete_if_due(appointment)

        return {
            "appointments": appointments,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 0,
        }

    async def get_appointment_stats(self, user: User) -> dict:
        """Get appointment statistics for the current user.

        Returns: {total, upcoming, completed, cancelled, pending}
        "upcoming" includes both pending AND confirmed appointments with future dates.
        """
        today = date.today()
        query = select(Appointment).options(*_appointment_load_options())

        # Base filter by role
        base_filter = []
        if user.role == UserRole.CUSTOMER:
            base_filter.append(Appointment.customer_id == user.id)
        elif user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider:
                return {
                    "total": 0,
                    "upcoming": 0,
                    "completed": 0,
                    "cancelled": 0,
                    "pending": 0,
                }
            base_filter.append(Appointment.provider_id == provider.id)

        due_result = await self.db.execute(
            query.where(
                *base_filter,
                Appointment.status == AppointmentStatus.CONFIRMED,
            )
        )
        for appointment in due_result.unique().scalars().all():
            await self._auto_complete_if_due(appointment)

        # Total
        total_result = await self.db.execute(
            select(func.count(Appointment.id)).where(*base_filter)
        )
        total = total_result.scalar()

        # Upcoming (future date + pending/confirmed) - Bug 2 fix
        upcoming_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                *base_filter,
                Appointment.appointment_date >= today,
                Appointment.status.in_([
                    AppointmentStatus.PENDING,
                    AppointmentStatus.CONFIRMED,
                ]),
            )
        )
        upcoming = upcoming_result.scalar()

        # Completed
        completed_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                *base_filter,
                Appointment.status == AppointmentStatus.COMPLETED,
            )
        )
        completed = completed_result.scalar()

        # Cancelled
        cancelled_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                *base_filter,
                Appointment.status == AppointmentStatus.CANCELLED,
            )
        )
        cancelled = cancelled_result.scalar()

        # Pending
        pending_result = await self.db.execute(
            select(func.count(Appointment.id)).where(
                *base_filter,
                Appointment.status == AppointmentStatus.PENDING,
            )
        )
        pending = pending_result.scalar()

        return {
            "total": total,
            "upcoming": upcoming,
            "completed": completed,
            "cancelled": cancelled,
            "pending": pending,
        }

    async def update_status(
        self, appointment_id: UUID, user: User, data: AppointmentStatusUpdate
    ) -> Appointment:
        """Update appointment status with role-based access control."""
        appointment = await self.get_appointment_by_id(appointment_id, user)
        await self._auto_complete_if_due(appointment)

        # Validate status transitions
        valid_transitions = {
            AppointmentStatus.PENDING: [
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.REJECTED,
                AppointmentStatus.CANCELLED,
            ],
            AppointmentStatus.CONFIRMED: [
                AppointmentStatus.COMPLETED,
                AppointmentStatus.CANCELLED,
            ],
        }

        allowed = valid_transitions.get(appointment.status, [])
        if data.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {appointment.status.value} to {data.status.value}",
            )

        # Role-based restrictions
        if user.role == UserRole.CUSTOMER:
            if data.status not in [AppointmentStatus.CANCELLED]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Customers can only cancel appointments",
                )
            from datetime import datetime as dt

            now = dt.now()
            appt_start = dt.combine(appointment.appointment_date, appointment.start_time)
            if now >= appt_start:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You can only cancel an appointment before its start time",
                )
        elif user.role == UserRole.PROVIDER:
            if data.status not in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Providers can only complete or cancel appointments",
                )
            from datetime import datetime as dt

            now = dt.now()
            appt_start = dt.combine(appointment.appointment_date, appointment.start_time)
            if data.status == AppointmentStatus.CANCELLED and now >= appt_start:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Providers can only cancel before the appointment starts",
                )

        # Time-based restriction: Cannot mark as completed before appointment end time
        if data.status == AppointmentStatus.COMPLETED:
            from datetime import datetime as dt, timezone as tz
            now = dt.now(tz.utc).replace(tzinfo=None)
            appt_end = dt.combine(appointment.appointment_date, appointment.end_time)
            if now < appt_end + timedelta(minutes=30):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot mark as completed until 30 minutes after the appointment ends",
                )

        appointment.status = data.status
        if data.cancellation_reason:
            appointment.cancellation_reason = data.cancellation_reason

        await self.db.flush()
        await self.db.refresh(appointment)

        # Create notifications based on status change
        notification_service = NotificationService(self.db)
        await self._send_status_notification(
            notification_service, appointment, data.status, user
        )

        # On cancellation, notify waitlist
        if data.status == AppointmentStatus.CANCELLED:
            await self._credit_cancellation_refund(appointment, user)
            await self._notify_waitlist_on_cancellation(appointment)

        # On completion, award loyalty points
        if data.status == AppointmentStatus.COMPLETED:
            await self._award_loyalty_points(appointment)
            await self._award_achievement_rewards(
                user_id=appointment.customer_id,
                event_type="booking_completed",
            )
            # AI Feature #4: Generate post-appointment AI summary (non-blocking)
            try:
                from app.services.appointment_summary_service import generate_appointment_summary
                import json as _json
                provider_res = await self.db.execute(
                    select(ServiceProvider).where(ServiceProvider.id == appointment.provider_id)
                )
                prov = provider_res.scalar_one_or_none()
                cust_res = await self.db.execute(
                    select(User).where(User.id == appointment.customer_id)
                )
                cust = cust_res.scalar_one_or_none()
                if prov and cust:
                    prov_user_res = await self.db.execute(
                        select(User).where(User.id == prov.user_id)
                    )
                    prov_user = prov_user_res.scalar_one_or_none()
                    summary = await generate_appointment_summary(
                        appointment_notes=appointment.notes or "",
                        provider_name=prov_user.full_name if prov_user else prov.specialization,
                        provider_specialization=prov.specialization,
                        customer_name=cust.full_name,
                        appointment_date=str(appointment.appointment_date),
                    )
                    appointment.ai_summary = _json.dumps(summary)
                    await self.db.flush()
            except Exception:
                pass  # Non-blocking

        # Reload with relationships
        result = await self.db.execute(
            select(Appointment)
            .options(*_appointment_load_options())
            .where(Appointment.id == appointment.id)
        )
        return result.scalar_one()

    async def _notify_waitlist_on_cancellation(self, appointment: Appointment) -> None:
        """Notify waitlist entries when an appointment is cancelled."""
        from app.services.waitlist_service import WaitlistService

        waitlist_service = WaitlistService(self.db)
        await waitlist_service.notify_waitlist_on_cancellation(
            provider_id=appointment.provider_id,
            appointment_date=appointment.appointment_date,
            start_time=appointment.start_time,
            end_time=appointment.end_time,
        )

    async def _award_loyalty_points(self, appointment: Appointment) -> None:
        """Award loyalty points when an appointment is completed."""
        from app.services.loyalty_service import LoyaltyService

        # Get provider's hourly rate
        provider_result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.id == appointment.provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if not provider or not provider.hourly_rate:
            return

        # Award 1 point per ₹100 of hourly_rate
        points = int(provider.hourly_rate // 100)
        if points > 0:
            loyalty_service = LoyaltyService(self.db)
            await loyalty_service.award_points(
                user_id=appointment.customer_id,
                points=points,
                description=f"Earned for completed appointment on {appointment.appointment_date}",
            )

    async def _credit_cancellation_refund(
        self, appointment: Appointment, actor: User
    ) -> None:
        """Credit a refund back to the customer wallet when an appointment is cancelled."""
        refund_amount = float(appointment.total_amount or 0)
        if refund_amount <= 0:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.id == appointment.provider_id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider:
                return
            base_amount = provider.hourly_rate or 0
            refund_amount = round(base_amount + (base_amount * 0.18), 2)

        if actor.id == appointment.customer_id:
            refund_amount = max(refund_amount - float(appointment.cancellation_fee or 50), 0)

        refund_amount = int(round(refund_amount))
        if refund_amount <= 0:
            return

        from app.services.loyalty_service import LoyaltyService

        loyalty_service = LoyaltyService(self.db)
        await loyalty_service.credit_refund(
            user_id=appointment.customer_id,
            amount=refund_amount,
            description=(
                f"Refund for cancelled appointment on {appointment.appointment_date} "
                f"by {actor.full_name}"
            ),
        )

    async def _auto_complete_if_due(self, appointment: Appointment) -> None:
        """Auto-complete confirmed appointments 30 minutes after they end."""
        if appointment.status != AppointmentStatus.CONFIRMED:
            return

        from datetime import datetime as dt

        now = dt.now()
        appt_end = dt.combine(appointment.appointment_date, appointment.end_time)
        if now < appt_end + timedelta(minutes=30):
            return

        appointment.status = AppointmentStatus.COMPLETED
        await self.db.flush()
        await self._award_loyalty_points(appointment)
        await self._award_achievement_rewards(
            user_id=appointment.customer_id,
            event_type="booking_completed",
        )

        notification_service = NotificationService(self.db)
        if appointment.customer:
            await self._send_status_notification(
                notification_service,
                appointment,
                AppointmentStatus.COMPLETED,
                appointment.customer,
            )

    async def _send_status_notification(
        self,
        notification_service: NotificationService,
        appointment: Appointment,
        new_status: AppointmentStatus,
        actor: User,
    ) -> None:
        """Send notification based on appointment status change."""
        # Load provider user_id if needed
        provider_result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.id == appointment.provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if not provider:
            return

        # Load customer info
        customer_result = await self.db.execute(
            select(User).where(User.id == appointment.customer_id)
        )
        customer = customer_result.scalar_one_or_none()
        if not customer:
            return

        date_str = appointment.appointment_date.strftime("%b %d, %Y")
        time_str = appointment.start_time.strftime("%I:%M %p")
        link = f"/appointments/{appointment.id}"

        # Import email service for sending emails
        from app.services.email_service import email_service

        if new_status == AppointmentStatus.CONFIRMED:
            # Notify customer
            await notification_service.create_notification(
                user_id=appointment.customer_id,
                type=NotificationType.APPOINTMENT_CONFIRMED,
                title="Appointment Confirmed",
                message=f"Your appointment on {date_str} has been confirmed.",
                link=link,
            )
            # Send confirmation email
            provider_user_result = await self.db.execute(
                select(User).where(User.id == provider.user_id)
            )
            provider_user = provider_user_result.scalar_one_or_none()
            try:
                await email_service.send_appointment_confirmation(
                    user_email=customer.email,
                    user_name=customer.full_name,
                    provider_name=provider_user.full_name if provider_user else "Provider",
                    date=date_str,
                    time=time_str,
                )
            except Exception:
                pass  # Email failure should not block status update
        elif new_status == AppointmentStatus.REJECTED:
            # Notify customer
            await notification_service.create_notification(
                user_id=appointment.customer_id,
                type=NotificationType.APPOINTMENT_REJECTED,
                title="Appointment Rejected",
                message=f"Your appointment on {date_str} has been rejected.",
                link=link,
            )
        elif new_status == AppointmentStatus.CANCELLED:
            # Notify the other party
            if actor.id == appointment.customer_id:
                # Customer cancelled - notify provider
                await notification_service.create_notification(
                    user_id=provider.user_id,
                    type=NotificationType.APPOINTMENT_CANCELLED,
                    title="Appointment Cancelled",
                    message=f"{customer.full_name} has cancelled the appointment on {date_str}.",
                    link=link,
                )
            else:
                # Provider cancelled - notify customer
                await notification_service.create_notification(
                    user_id=appointment.customer_id,
                    type=NotificationType.APPOINTMENT_CANCELLED,
                    title="Appointment Cancelled",
                    message=f"Your appointment on {date_str} has been cancelled by the provider.",
                    link=link,
                )
                # Send cancellation email to customer
                provider_user_result2 = await self.db.execute(
                    select(User).where(User.id == provider.user_id)
                )
                provider_user2 = provider_user_result2.scalar_one_or_none()
                try:
                    await email_service.send_appointment_cancelled(
                        user_email=customer.email,
                        user_name=customer.full_name,
                        cancelled_by=provider_user2.full_name if provider_user2 else "Provider",
                        date=date_str,
                        time=time_str,
                    )
                except Exception:
                    pass
        elif new_status == AppointmentStatus.COMPLETED:
            # Notify customer
            await notification_service.create_notification(
                user_id=appointment.customer_id,
                type=NotificationType.APPOINTMENT_COMPLETED,
                title="Appointment Completed",
                message=f"Your appointment on {date_str} has been marked as completed. Please leave a review!",
                link=link,
            )

    async def reschedule_appointment(
        self, appointment_id: UUID, user: User, data: AppointmentReschedule
    ) -> Appointment:
        """Reschedule an appointment to a new date/time."""
        appointment = await self.get_appointment_by_id(appointment_id, user)

        # Only pending or confirmed appointments can be rescheduled
        if appointment.status not in [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending or confirmed appointments can be rescheduled",
            )

        # Validate new time against provider availability
        day_of_week = data.appointment_date.weekday()
        avail_result = await self.db.execute(
            select(Availability).where(
                Availability.provider_id == appointment.provider_id,
                Availability.day_of_week == day_of_week,
                Availability.is_active == True,
            )
        )
        availabilities = avail_result.scalars().all()

        if not availabilities:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider is not available on the new date",
            )

        # Calculate new end time
        slot_duration = availabilities[0].slot_duration_minutes
        start_dt = datetime.combine(data.appointment_date, data.start_time)
        end_dt = start_dt + timedelta(minutes=slot_duration)
        new_end_time = end_dt.time()

        # Validate time is within availability
        time_valid = False
        for avail in availabilities:
            if data.start_time >= avail.start_time and new_end_time <= avail.end_time:
                time_valid = True
                break

        if not time_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requested time is outside provider's availability hours",
            )

        # Check for conflicts (excluding current appointment)
        conflict_result = await self.db.execute(
            select(Appointment).where(
                Appointment.provider_id == appointment.provider_id,
                Appointment.appointment_date == data.appointment_date,
                Appointment.id != appointment_id,
                Appointment.status.in_([
                    AppointmentStatus.PENDING,
                    AppointmentStatus.CONFIRMED,
                ]),
                Appointment.start_time < new_end_time,
                Appointment.end_time > data.start_time,
            )
        )
        conflict = conflict_result.scalar_one_or_none()

        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The new time slot is already booked",
            )

        # Update appointment in-place so the old slot is freed immediately.
        previous_date = appointment.appointment_date
        previous_start_time = appointment.start_time
        appointment.appointment_date = data.appointment_date
        appointment.start_time = data.start_time
        appointment.end_time = new_end_time

        await self.db.flush()
        await self.db.refresh(appointment)

        # Send reschedule notifications to the affected party only
        notification_service = NotificationService(self.db)
        await self._send_reschedule_notifications(
            notification_service,
            appointment,
            user,
            data,
            previous_date=previous_date,
            previous_start_time=previous_start_time,
        )

        # Reload with relationships
        result = await self.db.execute(
            select(Appointment)
            .options(*_appointment_load_options())
            .where(Appointment.id == appointment.id)
        )
        return result.scalar_one()

    async def _send_reschedule_notifications(
        self,
        notification_service: NotificationService,
        appointment: Appointment,
        actor: User,
        data: AppointmentReschedule,
        previous_date: date,
        previous_start_time,
    ) -> None:
        """Send reschedule notifications to the affected party."""
        # Load provider
        provider_result = await self.db.execute(
            select(ServiceProvider).where(ServiceProvider.id == appointment.provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if not provider:
            return

        date_str = data.appointment_date.strftime("%b %d, %Y")
        time_str = data.start_time.strftime("%H:%M")
        previous_date_str = previous_date.strftime("%b %d, %Y")
        previous_time_str = previous_start_time.strftime("%H:%M")
        link = f"/appointments/{appointment.id}"
        actor_name = actor.full_name

        # Notify customer if someone other than the customer rescheduled it.
        if actor.id != appointment.customer_id:
            await notification_service.create_notification(
                user_id=appointment.customer_id,
                type=NotificationType.APPOINTMENT_RESCHEDULED,
                title="Appointment Rescheduled",
                message=(
                    f"Your appointment moved from {previous_date_str} at {previous_time_str} "
                    f"to {date_str} at {time_str} by {actor_name}."
                ),
                link=link,
            )

        # Notify provider when the customer reschedules.
        if actor.id == appointment.customer_id:
            await notification_service.create_notification(
                user_id=provider.user_id,
                type=NotificationType.APPOINTMENT_RESCHEDULED,
                title="Appointment Rescheduled",
                message=(
                    f"{actor_name} rescheduled the appointment from {previous_date_str} "
                    f"at {previous_time_str} to {date_str} at {time_str}."
                ),
                link=link,
            )

    async def _award_achievement_rewards(
        self,
        user_id: UUID,
        event_type: str,
        event_data: Optional[dict] = None,
    ) -> None:
        """Award achievements and credit the XP reward to the wallet."""
        from app.services.achievement_service import AchievementService

        achievement_service = AchievementService(self.db)
        await achievement_service.check_and_award_with_wallet(
            user_id=user_id,
            event_type=event_type,
            event_data=event_data,
        )

    async def get_upcoming_appointments(self, user: User) -> list:
        """Get upcoming appointments for the user."""
        today = date.today()
        query = select(Appointment).options(*_appointment_load_options())

        if user.role == UserRole.CUSTOMER:
            query = query.where(Appointment.customer_id == user.id)
        elif user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider:
                return []
            query = query.where(Appointment.provider_id == provider.id)

        query = query.where(
            Appointment.appointment_date >= today,
            Appointment.status.in_([
                AppointmentStatus.PENDING,
                AppointmentStatus.CONFIRMED,
            ]),
        ).order_by(
            Appointment.created_at.desc(),
            Appointment.appointment_date.desc(),
            Appointment.start_time.desc(),
        )

        result = await self.db.execute(query)
        appointments = result.unique().scalars().all()
        for appointment in appointments:
            await self._auto_complete_if_due(appointment)
        return appointments

    async def get_appointment_history(self, user: User) -> list:
        """Get past appointments for the user."""
        today = date.today()
        query = select(Appointment).options(*_appointment_load_options())

        if user.role == UserRole.CUSTOMER:
            query = query.where(Appointment.customer_id == user.id)
        elif user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider:
                return []
            query = query.where(Appointment.provider_id == provider.id)

        query = query.where(
            (Appointment.appointment_date < today)
            | (Appointment.status.in_([
                AppointmentStatus.COMPLETED,
                AppointmentStatus.CANCELLED,
                AppointmentStatus.REJECTED,
            ]))
        ).order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())

        result = await self.db.execute(query)
        appointments = result.unique().scalars().all()
        for appointment in appointments:
            await self._auto_complete_if_due(appointment)
        return appointments
