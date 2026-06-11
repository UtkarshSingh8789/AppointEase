"""Appointment reminders router — sends reminder notifications and emails."""

import logging
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.notification import NotificationType
from app.models.provider import ServiceProvider
from app.models.user import User
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])


@router.post("/send-upcoming", summary="Send reminders for upcoming appointments")
async def send_upcoming_reminders(
    db: AsyncSession = Depends(get_db),
):
    """Send reminder notifications for appointments happening in the next 24 hours.
    This endpoint should be called by a cron job every hour.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    tomorrow = now + timedelta(hours=24)

    # Find confirmed appointments in the next 24 hours
    result = await db.execute(
        select(Appointment)
        .options(
            joinedload(Appointment.customer),
            joinedload(Appointment.provider).joinedload(ServiceProvider.user),
        )
        .where(
            Appointment.status == AppointmentStatus.CONFIRMED,
            Appointment.appointment_date == tomorrow.date(),
        )
    )
    appointments = result.unique().scalars().all()

    notification_service = NotificationService(db)
    sent_count = 0

    for appt in appointments:
        # Send reminder to customer
        if appt.customer:
            provider_name = appt.provider.user.full_name if appt.provider and appt.provider.user else "Provider"
            await notification_service.create_notification(
                user_id=appt.customer_id,
                type=NotificationType.APPOINTMENT_REMINDER,
                title="Appointment Tomorrow",
                message=f"Reminder: You have an appointment with {provider_name} tomorrow at {appt.start_time.strftime('%I:%M %p')}.",
                link=f"/appointments/{appt.id}",
            )

            # Send reminder email
            from app.services.email_service import email_service
            try:
                await email_service.send_appointment_reminder(
                    user_email=appt.customer.email,
                    user_name=appt.customer.full_name,
                    provider_name=provider_name,
                    date=appt.appointment_date.strftime("%b %d, %Y"),
                    time=appt.start_time.strftime("%I:%M %p"),
                )
            except Exception:
                pass

            sent_count += 1

    await db.commit()
    return {"reminders_sent": sent_count, "date": str(tomorrow.date())}
