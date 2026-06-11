"""
AI Feature #1 — Smart Appointment No-Show Predictor.

Rule-based scoring model that computes a no-show risk level before
confirming an appointment. Uses historical patterns from the database:
cancellation rate, booking lead time, time-of-day, day-of-week.

No external model or GPU needed. Pure SQL + Python math.
"""

from __future__ import annotations

from datetime import date, time
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus


async def compute_no_show_risk(
    db: AsyncSession,
    customer_id: UUID,
    appointment_date: date,
    start_time: time,
) -> str:
    """
    Return 'low', 'medium', or 'high' risk based on customer history
    and booking characteristics.

    Scoring factors (additive, higher = more risk):
    - Past cancellation rate > 50%  →  +3
    - Booking lead time < 1 day     →  +2  (same-day booking)
    - Booking lead time 1–2 days    →  +1  (short notice)
    - Early morning slot (< 8 AM)   →  +1
    - Late evening slot (>= 19:00)  →  +1
    - Monday slot                   →  +1  (historically higher no-show)
    - Weekend slot (Sat/Sun)        →  +1
    - 0 completed appointments      →  +2  (new customer, no track record)
    - >= 3 past cancellations        →  +1

    Thresholds:
    - score <= 2  →  low
    - score 3–4   →  medium
    - score >= 5  →  high
    """
    score = 0

    # --- Historical cancel rate ---
    count_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.customer_id == customer_id
        )
    )
    total_appts: int = count_result.scalar() or 0

    cancel_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.customer_id == customer_id,
            Appointment.status == AppointmentStatus.CANCELLED,
        )
    )
    total_cancels: int = cancel_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.customer_id == customer_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
    )
    total_completed: int = completed_result.scalar() or 0

    if total_appts > 0:
        cancel_rate = total_cancels / total_appts
        if cancel_rate > 0.5:
            score += 3
        elif total_cancels >= 3:
            score += 1
    else:
        # Brand new customer — no track record
        score += 2

    if total_completed == 0:
        score += 2

    # --- Lead time ---
    today = date.today()
    lead_days = (appointment_date - today).days
    if lead_days == 0:
        score += 2
    elif lead_days <= 2:
        score += 1

    # --- Time of day ---
    hour = start_time.hour
    if hour < 8:
        score += 1
    elif hour >= 19:
        score += 1

    # --- Day of week ---
    weekday = appointment_date.weekday()
    if weekday == 0:  # Monday
        score += 1
    elif weekday >= 5:  # Saturday / Sunday
        score += 1

    if score <= 2:
        return "low"
    elif score <= 4:
        return "medium"
    return "high"
