"""Availability router."""

from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.provider import ServiceProvider
from app.models.user import User, UserRole
from app.schemas.availability import (
    AvailabilityCreate,
    AvailabilityResponse,
    AvailabilityUpdate,
    AvailableSlotsResponse,
)
from app.schemas.availability_exception import (
    AvailabilityExceptionCreate,
    AvailabilityExceptionResponse,
)
from app.services.availability_service import AvailabilityService

router = APIRouter(prefix="/api/availability", tags=["Availability"])


async def _get_provider_id(user: User, db: AsyncSession) -> UUID:
    """Helper to get provider ID from user."""
    if user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only providers can manage availability",
        )
    result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.user_id == user.id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider profile not found",
        )
    return provider.id


@router.get(
    "/{provider_id}",
    response_model=List[AvailabilityResponse],
    summary="Get provider availability schedule",
)
async def get_provider_availability(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get the availability schedule for a specific provider."""
    service = AvailabilityService(db)
    slots = await service.get_provider_availability(provider_id)
    return slots


@router.get(
    "/{provider_id}/slots",
    response_model=AvailableSlotsResponse,
    summary="Get available time slots for a date",
)
async def get_available_slots(
    provider_id: UUID,
    date: date = Query(..., description="Date in YYYY-MM-DD format"),
    timezone: Optional[str] = Query("Asia/Kolkata", description="Timezone for slot generation"),
    db: AsyncSession = Depends(get_db),
):
    """Get available time slots for a provider on a specific date."""
    service = AvailabilityService(db)
    slots = await service.get_available_slots(provider_id, date, timezone=timezone or "Asia/Kolkata")
    return AvailableSlotsResponse(
        date=str(date),
        provider_id=provider_id,
        slots=slots,
    )


@router.get(
    "/{provider_id}/exceptions",
    response_model=List[AvailabilityExceptionResponse],
    summary="Get provider availability exceptions",
)
async def get_provider_exceptions(
    provider_id: UUID,
    month: Optional[str] = Query(None, description="Month filter in YYYY-MM format"),
    db: AsyncSession = Depends(get_db),
):
    """Get availability exceptions (holidays/special hours) for a provider."""
    service = AvailabilityService(db)
    exceptions = await service.get_exceptions(provider_id, month)
    return exceptions


@router.post(
    "",
    response_model=AvailabilityResponse,
    status_code=201,
    summary="Create availability slot",
)
async def create_availability(
    data: AvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new availability slot. Provider only."""
    provider_id = await _get_provider_id(current_user, db)
    service = AvailabilityService(db)
    slot = await service.create_availability(provider_id, data)
    return slot


@router.put(
    "/{availability_id}",
    response_model=AvailabilityResponse,
    summary="Update availability slot",
)
async def update_availability(
    availability_id: UUID,
    data: AvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an availability slot. Provider only."""
    provider_id = await _get_provider_id(current_user, db)
    service = AvailabilityService(db)
    slot = await service.update_availability(availability_id, provider_id, data)
    return slot


@router.delete(
    "/{availability_id}",
    status_code=204,
    summary="Delete availability slot",
)
async def delete_availability(
    availability_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an availability slot. Provider only."""
    provider_id = await _get_provider_id(current_user, db)
    service = AvailabilityService(db)
    await service.delete_availability(availability_id, provider_id)


@router.post(
    "/exceptions",
    response_model=AvailabilityExceptionResponse,
    status_code=201,
    summary="Create availability exception",
)
async def create_exception(
    data: AvailabilityExceptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create an availability exception (holiday or special hours). Provider only."""
    provider_id = await _get_provider_id(current_user, db)
    service = AvailabilityService(db)
    exception = await service.create_exception(provider_id, data)
    return exception


@router.delete(
    "/exceptions/{exception_id}",
    status_code=204,
    summary="Delete availability exception",
)
async def delete_exception(
    exception_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an availability exception. Provider only."""
    provider_id = await _get_provider_id(current_user, db)
    service = AvailabilityService(db)
    await service.delete_exception(exception_id, provider_id)


# ── AI Feature #2: Smart Slot Suggestions ─────────────────────────────
@router.get(
    "/{provider_id}/smart-slots",
    summary="AI-powered smart slot suggestions for a customer",
)
async def get_smart_slot_suggestions(
    provider_id: UUID,
    date: date = Query(..., description="Target date in YYYY-MM-DD format"),
    timezone: Optional[str] = Query("Asia/Kolkata"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return top 3 AI-recommended time slots for a customer on a given date.
    Ranks slots by predicted match quality based on historical booking patterns.
    Falls back to first 3 available slots if customer has no history.
    """
    from app.services.smart_slots_service import get_smart_slot_suggestions as _smart

    service = AvailabilityService(db)
    all_slots = await service.get_available_slots(provider_id, date, timezone=timezone or "Asia/Kolkata")

    slots_dicts = [
        {
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "is_available": s.is_available,
        }
        for s in all_slots
    ]

    suggestions = await _smart(
        db=db,
        customer_id=current_user.id,
        provider_id=provider_id,
        available_slots=slots_dicts,
        target_date=date,
        top_n=3,
    )

    return {
        "provider_id": str(provider_id),
        "date": str(date),
        "suggestions": suggestions,
    }
