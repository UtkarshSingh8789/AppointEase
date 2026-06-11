"""
AI Feature #9 — Personalized Customer Journey Nudges.

Generates personalized in-app notifications for customers based on
behaviour patterns. AI phrases each nudge naturally using Gemini/Grok.
Stores as Notification with type=SYSTEM.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.appointment import Appointment, AppointmentStatus
from app.models.loyalty import LoyaltyAccount
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


async def generate_nudges_for_customer(
    db: AsyncSession,
    customer: User,
) -> list[dict[str, Any]]:
    """
    Check all nudge triggers for a customer and generate personalized
    notification text for each triggered rule.

    Returns list of {title, message} dicts — caller persists them.
    """
    nudges: list[dict[str, str]] = []
    today = date.today()

    # ── Trigger 1: Follow-up reminder (last appointment > 60 days ago) ──
    last_appt_result = await db.execute(
        select(Appointment.appointment_date, Appointment.provider_id).where(
            Appointment.customer_id == customer.id,
            Appointment.status == AppointmentStatus.COMPLETED,
        ).order_by(Appointment.appointment_date.desc()).limit(1)
    )
    last_appt = last_appt_result.first()
    if last_appt:
        days_since = (today - last_appt.appointment_date).days
        if days_since >= 60:
            nudges.append({
                "trigger": "follow_up",
                "context": f"last appointment was {days_since} days ago",
                "name": customer.full_name,
            })

    # ── Trigger 2: Loyalty points reminder ───────────────────────────────
    loyalty_result = await db.execute(
        select(LoyaltyAccount).where(LoyaltyAccount.user_id == customer.id)
    )
    loyalty = loyalty_result.scalar_one_or_none()
    if loyalty and loyalty.points >= 200:
        nudges.append({
            "trigger": "loyalty_reminder",
            "context": f"has {loyalty.points} unredeemed loyalty points worth ₹{loyalty.points}",
            "name": customer.full_name,
        })

    # ── Trigger 3: No appointments in 30 days ─────────────────────────────
    recent_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.customer_id == customer.id,
            Appointment.appointment_date >= today - timedelta(days=30),
        )
    )
    recent_count = recent_result.scalar() or 0
    total_result = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.customer_id == customer.id)
    )
    total_count = total_result.scalar() or 0

    if total_count > 0 and recent_count == 0:
        nudges.append({
            "trigger": "re_engage",
            "context": "no bookings in the past 30 days",
            "name": customer.full_name,
        })

    # Generate personalized text for each nudge
    result: list[dict[str, str]] = []
    for nudge in nudges[:2]:  # Max 2 nudges per run to avoid spam
        title, message = await _phrase_nudge(nudge)
        result.append({"title": title, "message": message})

    return result


async def _phrase_nudge(nudge: dict[str, str]) -> tuple[str, str]:
    """Use AI to phrase a nudge naturally. Falls back to template text."""
    name = nudge.get("name", "there")
    trigger = nudge["trigger"]
    context = nudge["context"]

    prompt = f"""You are writing a short, friendly in-app notification for an appointment booking platform.
Customer name: {name}
Trigger: {trigger}
Context: {context}

Write a notification with:
1. A short title (max 8 words)
2. A friendly message (1–2 sentences, personal, not salesy)

Format your response as:
TITLE: <title>
MESSAGE: <message>"""

    rag_key = settings.GEMINI_RAG_API_KEY or settings.GEMINI_API_KEY
    if rag_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={rag_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.5, "maxOutputTokens": 150},
                    },
                )
            if resp.status_code == 200:
                raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                return _parse_nudge_response(raw, trigger, name)
        except Exception as exc:
            logger.warning("Gemini nudge generation failed: %s", exc)

    if settings.GROK_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": settings.GROK_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.5,
                        "max_tokens": 150,
                    },
                )
            if resp.status_code == 200:
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                return _parse_nudge_response(raw, trigger, name)
        except Exception as exc:
            logger.warning("Grok nudge generation failed: %s", exc)

    # Fallback templates
    templates = {
        "follow_up": ("Time for a follow-up?", f"Hi {name}, it's been a while since your last appointment. Ready to book again?"),
        "loyalty_reminder": ("You have loyalty points waiting!", f"Hi {name}, you have unredeemed points. Use them on your next booking for a discount!"),
        "re_engage": ("We miss you!", f"Hi {name}, you haven't booked recently. Explore what's new on AppointEase today."),
    }
    return templates.get(trigger, ("Stay connected", f"Hi {name}, check out AppointEase for your next appointment."))


def _parse_nudge_response(raw: str, trigger: str, name: str) -> tuple[str, str]:
    """Parse TITLE: / MESSAGE: format from AI response."""
    lines = raw.splitlines()
    title = ""
    message = ""
    for line in lines:
        if line.startswith("TITLE:"):
            title = line[6:].strip()
        elif line.startswith("MESSAGE:"):
            message = line[8:].strip()
    if title and message:
        return title, message
    # If parsing fails, use the first two lines
    clean_lines = [l.strip() for l in lines if l.strip()]
    if len(clean_lines) >= 2:
        return clean_lines[0], clean_lines[1]
    return f"A note for {name}", raw[:120]


async def run_daily_nudges(db: AsyncSession) -> dict[str, int]:
    """
    Entry point for the daily nudge job.
    Generates and persists nudges for all active customers.
    Returns {"customers_processed": N, "nudges_sent": M}
    """
    customers_result = await db.execute(
        select(User).where(
            User.role == UserRole.CUSTOMER,
            User.is_active.is_(True),
        ).limit(500)  # Process in batches
    )
    customers = customers_result.scalars().all()

    total_nudges = 0
    for customer in customers:
        try:
            nudges = await generate_nudges_for_customer(db, customer)
            for n in nudges:
                notif = Notification(
                    user_id=customer.id,
                    type=NotificationType.SYSTEM,
                    title=n["title"],
                    message=n["message"],
                    link="/dashboard",
                )
                db.add(notif)
                total_nudges += 1
        except Exception as exc:
            logger.warning("Nudge generation failed for customer %s: %s", customer.id, exc)

    await db.commit()
    return {"customers_processed": len(customers), "nudges_sent": total_nudges}
