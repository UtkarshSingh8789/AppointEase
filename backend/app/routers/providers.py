"""Providers router."""

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.appointment import Appointment, AppointmentStatus
from app.models.provider import ServiceProvider
from app.models.user import User
from app.schemas.provider import (
    ProviderCreate,
    ProviderListResponse,
    ProviderResponse,
    ProviderStats,
    ProviderUpdate,
)
from app.services.provider_application_service import store_application
from app.services.provider_service import ProviderService

router = APIRouter(prefix="/api/providers", tags=["Providers"])


class VacationRequest(BaseModel):
    """Schema for setting vacation mode."""

    start_date: date
    end_date: date


class EarningsByDay(BaseModel):
    """Schema for daily earnings."""

    date: str
    amount: float


class EarningsResponse(BaseModel):
    """Schema for earnings response."""

    total_earned: float
    appointments_count: int
    earnings_by_day: list[EarningsByDay]


@router.get(
    "/locations",
    summary="Get all unique provider locations",
)
async def get_provider_locations(db: AsyncSession = Depends(get_db)):
    """Get all unique locations from verified providers."""
    result = await db.execute(
        select(ServiceProvider.location).distinct().where(ServiceProvider.is_verified == True)
    )
    return [row[0] for row in result.all()]


@router.get(
    "",
    response_model=ProviderListResponse,
    summary="List service providers",
)
async def list_providers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    location: Optional[str] = None,
    pincode: Optional[str] = None,
    area: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List service providers with search, filter, and pagination."""
    service = ProviderService(db)
    result = await service.list_providers(
        page=page,
        per_page=per_page,
        search=search,
        category_id=category_id,
        location=location,
        pincode=pincode,
        area=area,
        min_rating=min_rating,
    )
    return result


@router.get(
    "/me",
    response_model=ProviderResponse,
    summary="Get current provider profile",
)
async def get_my_provider_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's provider profile with user and category loaded."""
    service = ProviderService(db)
    provider = await service.get_provider_by_user_id(current_user.id)
    return provider


@router.get(
    "/me/stats",
    response_model=ProviderStats,
    summary="Get provider statistics",
)
async def get_provider_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for the current provider."""
    service = ProviderService(db)
    stats = await service.get_provider_stats(current_user)
    return stats


@router.get(
    "/me/earnings",
    response_model=EarningsResponse,
    summary="Get provider earnings",
)
async def get_provider_earnings(
    period: str = Query("30d", description="Period: 7d, 30d, or 90d"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get earnings for the current provider over a specified period."""
    # Get provider
    provider_result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.user_id == current_user.id)
    )
    provider = provider_result.scalar_one_or_none()
    if not provider:
        return EarningsResponse(total_earned=0, appointments_count=0, earnings_by_day=[])

    # Parse period
    days_map = {"7d": 7, "30d": 30, "90d": 90}
    days = days_map.get(period, 30)
    start_date = date.today() - timedelta(days=days)

    # Get completed appointments in period
    result = await db.execute(
        select(Appointment).where(
            Appointment.provider_id == provider.id,
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.appointment_date >= start_date,
        )
    )
    appointments = result.scalars().all()

    hourly_rate = provider.hourly_rate or 0.0
    total_earned = len(appointments) * hourly_rate
    appointments_count = len(appointments)

    # Group by day
    earnings_map: dict[str, float] = {}
    for appt in appointments:
        day_str = appt.appointment_date.isoformat()
        earnings_map[day_str] = earnings_map.get(day_str, 0) + hourly_rate

    earnings_by_day = [
        EarningsByDay(date=d, amount=a)
        for d, a in sorted(earnings_map.items())
    ]

    return EarningsResponse(
        total_earned=total_earned,
        appointments_count=appointments_count,
        earnings_by_day=earnings_by_day,
    )


@router.post(
    "/me/vacation",
    summary="Set vacation mode",
)
async def set_vacation(
    data: VacationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set vacation mode for the current provider."""
    from fastapi import HTTPException, status

    provider_result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.user_id == current_user.id)
    )
    provider = provider_result.scalar_one_or_none()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider profile not found",
        )

    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )

    provider.vacation_start = data.start_date
    provider.vacation_end = data.end_date
    await db.flush()
    await db.refresh(provider)

    return {
        "message": "Vacation mode set",
        "vacation_start": data.start_date.isoformat(),
        "vacation_end": data.end_date.isoformat(),
    }


@router.delete(
    "/me/vacation",
    summary="Cancel vacation mode",
)
async def cancel_vacation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel vacation mode for the current provider."""
    from fastapi import HTTPException, status

    provider_result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.user_id == current_user.id)
    )
    provider = provider_result.scalar_one_or_none()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider profile not found",
        )

    provider.vacation_start = None
    provider.vacation_end = None
    await db.flush()

    return {"message": "Vacation mode cancelled"}


@router.get(
    "/{provider_id}",
    response_model=ProviderResponse,
    summary="Get provider details",
)
async def get_provider(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information about a specific provider."""
    service = ProviderService(db)
    provider = await service.get_provider_by_id(provider_id)
    return provider


@router.post(
    "/register-application",
    response_model=ProviderResponse,
    status_code=201,
    summary="Register as a provider with documents",
)
async def register_provider_application(
    specialization: str = Form(...),
    category_id: UUID = Form(...),
    experience_years: int = Form(...),
    location: str = Form(...),
    area: Optional[str] = Form(None),
    pincode: Optional[str] = Form(None),
    profile_description: Optional[str] = Form(None),
    hourly_rate: Optional[float] = Form(None),
    avatar_file: Optional[UploadFile] = File(None),
    documents: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register the current user as a provider and persist onboarding files."""
    if len(documents) == 0:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one certificate, license, or supporting document is required",
        )

    service = ProviderService(db)
    provider = await service.register_provider(
        current_user,
        ProviderCreate(
            specialization=specialization,
            category_id=category_id,
            experience_years=experience_years,
            location=location,
            area=area,
            pincode=pincode,
            profile_description=profile_description,
            hourly_rate=hourly_rate,
        ),
    )

    application_record = await store_application(
        provider_id=str(provider.id),
        user_id=str(current_user.id),
        payload={
            "specialization": specialization,
            "category_id": str(category_id),
            "experience_years": experience_years,
            "location": location,
            "area": area,
            "pincode": pincode,
            "profile_description": profile_description,
            "hourly_rate": hourly_rate,
        },
        avatar_file=avatar_file,
        documents=documents,
    )

    if application_record.get("avatar"):
        current_user.avatar_url = application_record["avatar"]["path"]

    await db.flush()
    await db.refresh(current_user)
    return provider


@router.post(
    "/register",
    response_model=ProviderResponse,
    status_code=201,
    summary="Register as a provider",
)
async def register_provider(
    data: ProviderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register the current user as a service provider."""
    service = ProviderService(db)
    provider = await service.register_provider(current_user, data)
    return provider


@router.put(
    "/me",
    response_model=ProviderResponse,
    summary="Update provider profile",
)
async def update_provider(
    data: ProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current provider's profile."""
    service = ProviderService(db)
    provider = await service.update_provider(current_user, data)
    return provider


# ── AI Feature #3: Semantic Provider Search ───────────────────────────
@router.post(
    "/semantic-search",
    summary="Natural language provider search using semantic embeddings",
)
async def semantic_provider_search(
    query: str,
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """
    AI Feature #3 — Semantic Provider Search.

    Accepts a natural language query (e.g. 'deep tissue massage in Pune under ₹1500')
    and returns providers ranked by semantic similarity to the query.

    Uses SentenceTransformer embeddings and cosine similarity.
    Falls back to keyword search if embeddings are unavailable.
    """
    from app.services.ai_chat_service import AIChatRetrievalService
    from app.models.user import UserRole

    # Reuse the existing provider scoring logic from AIChatRetrievalService
    # but without a db session context restriction — open search
    class _OpenSession:
        def __init__(self, db): self.db = db

    service = AIChatRetrievalService(db)
    # Use admin role to search all verified providers
    matches = await service.search_providers(message=query, user_role=UserRole.ADMIN.value, limit=limit)

    return {
        "query": query,
        "results": [
            {
                "id": str(m.provider.id),
                "name": m.provider.user.full_name if m.provider.user else None,
                "specialization": m.provider.specialization,
                "category": m.provider.category.name if m.provider.category else None,
                "location": m.provider.location,
                "rating": m.provider.rating,
                "hourly_rate": m.provider.hourly_rate,
                "score": round(m.score, 3),
                "match_reasons": list(m.reasons),
            }
            for m in matches
        ],
    }


# ── AI Feature #7: Provider self-service pricing insights ─────────────
@router.get(
    "/me/pricing-insights",
    summary="Get AI pricing insights for current provider",
)
async def get_my_pricing_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI Feature #7 — Dynamic Pricing Suggestion for Providers.
    Returns market analysis and a concrete pricing recommendation.
    """
    from fastapi import HTTPException, status as http_status
    from app.services.pricing_suggestion_service import get_pricing_insights

    provider_result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.user_id == current_user.id)
    )
    provider = provider_result.scalar_one_or_none()
    if not provider:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Provider profile not found",
        )
    return await get_pricing_insights(db, provider.id)
