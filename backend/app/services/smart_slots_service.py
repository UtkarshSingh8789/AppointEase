"""
AI Feature #2 — AI-Powered Smart Slot Suggestions.

Ranks available time slots by predicted match quality based on:
- Customer's historical booking times (preferred hours)
- Day-of-week booking patterns
- Slot popularity on this provider
- Earlier slots preferred (less chance of running late)

Returns top 3 recommended slots with a reason string.
"""

from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus


async def get_smart_slot_suggestions(
    db: AsyncSession,
    customer_id: UUID,
    provider_id: UUID,
    available_slots: list[dict[str, Any]],
    target_date: date,
    top_n: int = 3,
) -> list[dict[str, Any]]:
    """
    Score and rank available slots.

    Each slot dict should have: {"start_time": str (HH:MM), "end_time": str, "is_available": bool}

    Returns: list of scored slot dicts with added "ai_score" and "ai_reason" fields.
    Only returns available=True slots, sorted by score desc, capped at top_n.
    """
    open_slots = [s for s in available_slots if s.get("is_available")]
    if not open_slots:
        return []

    # Fetch customer's past booking times (last 20 appointments)
    history_result = await db.execute(
        select(Appointment.start_time, Appointment.appointment_date).where(
            Appointment.customer_id == customer_id,
            Appointment.status.in_([AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED]),
        ).order_by(Appointment.created_at.desc()).limit(20)
    )
    history = history_result.all()

    # Count preferred hours and days from history
    preferred_hours: Counter = Counter()
    preferred_days: Counter = Counter()
    for start_time, appt_date in history:
        preferred_hours[start_time.hour] += 1
        preferred_days[appt_date.weekday()] += 1

    target_weekday = target_date.weekday()
    day_is_preferred = preferred_days.get(target_weekday, 0) > 0

    # Fetch slot popularity on this provider
    provider_slots_result = await db.execute(
        select(Appointment.start_time).where(
            Appointment.provider_id == provider_id,
            Appointment.status.in_([AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED]),
        )
    )
    provider_hours: Counter = Counter(row.hour for row in provider_slots_result.scalars().all())

    scored = []
    for slot in open_slots:
        start_str = slot["start_time"]
        # Parse HH:MM
        try:
            hour, minute = map(int, start_str.split(":"))
        except (ValueError, AttributeError):
            continue

        score = 0.0
        reasons = []

        # History preference
        hist_count = preferred_hours.get(hour, 0)
        if hist_count > 0:
            score += hist_count * 2.0
            reasons.append("matches your usual booking time")

        # Day preference
        if day_is_preferred:
            score += 1.0

        # Provider popularity (social proof)
        pop = provider_hours.get(hour, 0)
        if pop > 0:
            score += min(pop * 0.5, 2.0)
            reasons.append("popular time with this provider")

        # Prefer morning/afternoon over very early or very late
        if 9 <= hour <= 17:
            score += 1.5
            if not reasons:
                reasons.append("good time of day")
        elif hour < 8 or hour >= 20:
            score -= 1.0

        # Slight bonus for earlier slots (less scheduling conflict risk)
        score += (24 - hour) * 0.02

        reason = "; ".join(reasons) if reasons else "available slot"

        scored.append({
            **slot,
            "ai_score": round(score, 3),
            "ai_reason": reason,
        })

    scored.sort(key=lambda x: x["ai_score"], reverse=True)
    return scored[:top_n]
