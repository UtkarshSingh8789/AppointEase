"""AI Features router — exposes all 50 AI roadmap features."""

from typing import Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_admin_user, get_current_user
from app.models.appointment import Appointment, AppointmentStatus
from app.models.provider import ServiceProvider
from app.models.user import User
from app.services import ai_features_service as ai

router = APIRouter(prefix="/api/ai", tags=["AI Features"])


class QuestionRequest(BaseModel):
    question: str


class SearchRequest(BaseModel):
    query: str


# ── #9: Smart Reschedule Suggestions ─────────────────────────────────
@router.get("/appointments/{appointment_id}/reschedule-suggestions")
async def reschedule_suggestions(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.get_reschedule_suggestions(db, appointment_id, current_user.id)


# ── #10: Appointment Summary ──────────────────────────────────────────
@router.get("/appointments/{appointment_id}/summary")
async def appointment_summary(
    appointment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ai.generate_appointment_summary(db, appointment_id)


# ── #12: Booking Intent Predictor ────────────────────────────────────
@router.get("/recommendations/next-booking")
async def next_booking_prediction(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.predict_next_booking(db, current_user.id)


# ── #15: Provider Match Score ─────────────────────────────────────────
@router.get("/providers/{provider_id}/match-score")
async def provider_match_score(
    provider_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.get_provider_match_score(db, provider_id, current_user.id)


# ── #21: Personalised Recommendations ────────────────────────────────
@router.get("/recommendations/providers")
async def personalised_provider_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.get_personalised_recommendations(db, current_user.id)


# ── #22: Smart NLP Search ─────────────────────────────────────────────
@router.get("/providers/smart-search")
async def smart_provider_search(
    q: str = Query(..., description="Natural language search query"),
    db: AsyncSession = Depends(get_db),
):
    return await ai.smart_search_providers(db, q)


# ── #23: Review Summariser ────────────────────────────────────────────
@router.get("/providers/{provider_id}/review-summary")
async def review_summary(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    return await ai.summarise_provider_reviews(db, provider_id)


# ── #24: Provider FAQ ─────────────────────────────────────────────────
@router.post("/providers/{provider_id}/ask")
async def ask_provider_faq(
    provider_id: UUID,
    data: QuestionRequest,
    db: AsyncSession = Depends(get_db),
):
    return await ai.answer_provider_question(db, provider_id, data.question)


# ── #26: Follow-up Suggestions ────────────────────────────────────────
@router.get("/appointments/{appointment_id}/followup-suggestions")
async def followup_suggestions(
    appointment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ai.get_followup_suggestions(db, appointment_id)


# ── #28: Fraud Alerts (admin) ─────────────────────────────────────────
@router.get("/admin/fraud-alerts")
async def fraud_alerts(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.get_fraud_alerts(db)


# ── #29: Revenue Forecast (admin) ────────────────────────────────────
@router.get("/admin/revenue-forecast")
async def revenue_forecast(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.forecast_revenue(db)


# ── #30: Churn Risk (admin) ───────────────────────────────────────────
@router.get("/admin/churn-risk")
async def churn_risk(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.get_churn_risk_users(db)


# ── #33: Supply-Demand Gaps (admin) ──────────────────────────────────
@router.get("/admin/supply-demand-gaps")
async def supply_demand_gaps(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.get_supply_demand_gaps(db)


# ── #38: Auto-Reply ───────────────────────────────────────────────────
@router.post("/providers/{provider_id}/auto-reply")
async def provider_auto_reply(
    provider_id: UUID,
    data: QuestionRequest,
    db: AsyncSession = Depends(get_db),
):
    return await ai.generate_auto_reply(db, provider_id, data.question)


# ── #46: Trust Score ──────────────────────────────────────────────────
@router.get("/providers/{provider_id}/trust-score")
async def provider_trust_score(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    return await ai.get_provider_trust_score(db, provider_id)


# ── #48: Trend Explainer (admin) ──────────────────────────────────────
@router.get("/admin/trend-explanation")
async def trend_explanation(
    period: str = Query("week", description="week or month"),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.explain_appointment_trend(db, period)


# ── #49: Earnings Insights (provider) ────────────────────────────────
@router.get("/providers/me/earnings-insights")
async def earnings_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.provider import ServiceProvider
    result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.user_id == current_user.id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        return {"insights": ["Set up your provider profile to see earnings insights."]}
    return await ai.get_provider_earnings_insights(db, provider.id)


# ── #50: Customer Lifetime Value (admin) ─────────────────────────────
@router.get("/admin/users/{user_id}/lifetime-value")
async def customer_lifetime_value(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await ai.get_customer_lifetime_value(db, user_id)


# ── #54: Category Suggester ───────────────────────────────────────────
@router.get("/suggest-category")
async def suggest_category(
    specialization: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await ai.suggest_category_for_provider(db, specialization)


# ── #55: Cancellation Classifier ─────────────────────────────────────
@router.post("/classify-cancellation")
async def classify_cancellation(data: QuestionRequest):
    return await ai.classify_cancellation_reason(data.question)


# ── #11: Conflict Detector ────────────────────────────────────────────
@router.get("/appointments/conflict-check")
async def conflict_check(
    appointment_date: str = Query(...),
    start_time: str = Query(...),
    end_time: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as _date, time as _time
    from app.models.appointment import Appointment as _Appt, AppointmentStatus as _S
    try:
        appt_date = _date.fromisoformat(appointment_date)
        s_time = _time.fromisoformat(start_time)
        e_time = _time.fromisoformat(end_time)
    except ValueError:
        return {"conflict": False, "message": "Invalid date/time format"}
    result = await db.execute(
        select(_Appt).where(
            _Appt.customer_id == current_user.id,
            _Appt.appointment_date == appt_date,
            _Appt.status.in_([_S.PENDING, _S.CONFIRMED]),
            _Appt.start_time < e_time,
            _Appt.end_time > s_time,
        )
    )
    conflicts = result.scalars().all()
    return {
        "conflict": len(conflicts) > 0,
        "conflicts": [{"id": str(c.id), "date": str(c.appointment_date), "start": str(c.start_time), "end": str(c.end_time)} for c in conflicts],
        "message": f"You have {len(conflicts)} overlapping appointment(s) on this date." if conflicts else "No conflicts found.",
    }


# ── #14: Appointment Duration Estimator ──────────────────────────────
@router.get("/availability/estimate-duration")
async def estimate_duration(
    category_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    from app.models.appointment import Appointment as _Appt, AppointmentStatus as _S
    from sqlalchemy import func as _func
    result = await db.execute(
        select(
            _func.avg(
                _func.extract('epoch', _func.cast(_Appt.end_time, type_=None)) -
                _func.extract('epoch', _func.cast(_Appt.start_time, type_=None))
            ).label("avg_seconds")
        )
        .join(ServiceProvider, _Appt.provider_id == ServiceProvider.id)
        .where(
            ServiceProvider.category_id == category_id,
            _Appt.status == _S.COMPLETED,
        )
    )
    avg_sec = result.scalar()
    if avg_sec:
        avg_min = max(30, int(avg_sec / 60))
        label = f"~{avg_min} min" if avg_min < 60 else f"~{avg_min // 60}h {avg_min % 60}m" if avg_min % 60 else f"~{avg_min // 60}h"
    else:
        avg_min = 60
        label = "~60 min (estimated)"
    return {"category_id": str(category_id), "estimated_minutes": avg_min, "label": label}


# ── #27: Budget Estimator ─────────────────────────────────────────────
@router.get("/customers/budget-estimate")
async def budget_estimate(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.invoice import Invoice as _Inv
    from app.models.appointment import Appointment as _Appt, AppointmentStatus as _S
    from datetime import datetime as _dt, timezone as _tz, date as _date
    from sqlalchemy import func as _func
    month_start = _dt.now(_tz.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month_r = await db.execute(
        select(_func.sum(_Inv.total_amount)).where(
            _Inv.customer_id == current_user.id,
            _Inv.generated_at >= month_start,
        )
    )
    spent_this_month = float(this_month_r.scalar() or 0)
    upcoming_r = await db.execute(
        select(_func.count(_Appt.id)).where(
            _Appt.customer_id == current_user.id,
            _Appt.status.in_([_S.CONFIRMED, _S.PENDING]),
            _Appt.appointment_date >= _date.today(),
        )
    )
    upcoming_count = upcoming_r.scalar() or 0
    avg_r = await db.execute(
        select(_func.avg(_Inv.total_amount)).where(_Inv.customer_id == current_user.id)
    )
    avg_amt = float(avg_r.scalar() or 1500)
    projected = spent_this_month + upcoming_count * avg_amt
    return {
        "spent_this_month": round(spent_this_month, 2),
        "upcoming_appointments": upcoming_count,
        "avg_appointment_cost": round(avg_amt, 2),
        "projected_total_this_month": round(projected, 2),
        "message": f"Based on your {upcoming_count} upcoming appointment(s), your estimated spend this month is ₹{projected:,.0f}.",
    }
