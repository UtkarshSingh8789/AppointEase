"""
AI Feature #7 — Dynamic Pricing Suggestion for Providers.

Analyzes platform data to suggest optimal hourly rate and
peak/off-peak pricing strategy for a provider.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.appointment import Appointment, AppointmentStatus
from app.models.invoice import Invoice
from app.models.provider import ServiceProvider
from app.models.review import Review

logger = logging.getLogger(__name__)


async def get_pricing_insights(db: AsyncSession, provider_id: UUID) -> dict[str, Any]:
    """
    Return pricing insights for a provider, including:
    - current_rate: their current hourly rate
    - category_avg: average rate for their category
    - category_min / category_max: rate range in their category
    - booking_rate: completed / total appointments ratio
    - avg_rating: their average rating
    - competitor_avg_rating: category average rating
    - peak_days: days with most appointments
    - suggestion: AI-generated recommendation text
    """
    # Load provider
    prov_result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.id == provider_id)
    )
    provider = prov_result.scalar_one_or_none()
    if not provider:
        return {"error": "Provider not found"}

    current_rate = float(provider.hourly_rate or 0)
    category_id = provider.category_id

    # Category rate stats
    cat_stats_result = await db.execute(
        select(
            func.avg(ServiceProvider.hourly_rate),
            func.min(ServiceProvider.hourly_rate),
            func.max(ServiceProvider.hourly_rate),
            func.count(ServiceProvider.id),
        ).where(
            ServiceProvider.category_id == category_id,
            ServiceProvider.is_verified.is_(True),
            ServiceProvider.hourly_rate > 0,
        )
    )
    cat_avg, cat_min, cat_max, cat_count = cat_stats_result.one()
    cat_avg = float(cat_avg or current_rate)
    cat_min = float(cat_min or current_rate)
    cat_max = float(cat_max or current_rate)

    # Provider booking rate
    total_result = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.provider_id == provider_id)
    )
    total_appts = total_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.provider_id == provider_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
    )
    completed_appts = completed_result.scalar() or 0
    booking_rate = round(completed_appts / max(total_appts, 1) * 100, 1)

    # Provider rating
    rating_result = await db.execute(
        select(func.avg(Review.rating)).where(Review.provider_id == provider_id)
    )
    avg_rating = float(rating_result.scalar() or 0)

    # Category average rating
    cat_rating_result = await db.execute(
        select(func.avg(Review.rating))
        .join(ServiceProvider, Review.provider_id == ServiceProvider.id)
        .where(ServiceProvider.category_id == category_id)
    )
    cat_avg_rating = float(cat_rating_result.scalar() or 0)

    # Peak days (by appointment count per day of week)
    # We use a simpler approach: count by weekday from appointment_date
    # Returns top 2 days with most appointments
    appt_dates_result = await db.execute(
        select(Appointment.appointment_date).where(
            Appointment.provider_id == provider_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
    )
    appt_dates = appt_dates_result.scalars().all()
    day_counts: dict[str, int] = {}
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for d in appt_dates:
        dn = day_names[d.weekday()]
        day_counts[dn] = day_counts.get(dn, 0) + 1
    peak_days = sorted(day_counts, key=lambda x: day_counts[x], reverse=True)[:2]

    # Build AI prompt
    stats_text = f"""
Provider: {provider.specialization} ({provider.category.name if provider.category else 'Unknown'})
Current hourly rate: ₹{current_rate:.0f}
Category average rate: ₹{cat_avg:.0f} (range ₹{cat_min:.0f}–₹{cat_max:.0f}, {cat_count} providers)
Provider avg rating: {avg_rating:.1f}/5
Category avg rating: {cat_avg_rating:.1f}/5
Booking completion rate: {booking_rate}%
Peak days: {', '.join(peak_days) if peak_days else 'Insufficient data'}
""".strip()

    suggestion = await _generate_pricing_suggestion(stats_text)

    return {
        "current_rate": current_rate,
        "category_avg": round(cat_avg, 0),
        "category_min": round(cat_min, 0),
        "category_max": round(cat_max, 0),
        "category_provider_count": cat_count,
        "booking_rate_percent": booking_rate,
        "avg_rating": round(avg_rating, 2),
        "category_avg_rating": round(cat_avg_rating, 2),
        "peak_days": peak_days,
        "suggestion": suggestion,
    }


async def _generate_pricing_suggestion(stats_text: str) -> str:
    prompt = f"""You are a pricing advisor for an appointment scheduling platform in India.
Based on the market data below, provide a specific, actionable pricing recommendation
(2–3 sentences max). Include a specific suggested rate and whether to use peak pricing.

{stats_text}

Be direct and specific. Respond in plain text only."""

    rag_key = settings.GEMINI_RAG_API_KEY or settings.GEMINI_API_KEY
    if rag_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={rag_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 200},
                    },
                )
            if resp.status_code == 200:
                return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as exc:
            logger.warning("Gemini pricing suggestion failed: %s", exc)

    if settings.GROK_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": settings.GROK_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 200,
                    },
                )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as exc:
            logger.warning("Grok pricing suggestion failed: %s", exc)

    return "Based on market data, consider adjusting your rate closer to the category average to improve booking rates."
