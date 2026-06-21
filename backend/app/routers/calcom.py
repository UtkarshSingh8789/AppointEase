"""Cal.com-inspired feature hub router."""

from __future__ import annotations

from datetime import date
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import calcom_service

router = APIRouter(prefix="/api/calcom", tags=["Calcom Hub"])


class CollectiveSlotsRequest(BaseModel):
    provider_ids: List[UUID] = Field(..., min_length=2)
    appointment_date: date
    timezone: str = "Asia/Kolkata"


class RoundRobinRequest(BaseModel):
    category_id: UUID
    appointment_date: date


@router.get("/catalog")
async def get_catalog():
    """Return the Cal.com-inspired feature catalog."""
    return calcom_service.get_catalog_payload()


@router.get("/providers/{provider_id}/booking-link")
async def get_booking_link(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Return shareable booking and embed links for a provider."""
    return await calcom_service.get_booking_link(db, provider_id)


@router.get("/me/snapshot")
async def get_my_snapshot(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's scheduling snapshot."""
    return await calcom_service.get_provider_snapshot(db, current_user)


@router.post("/round-robin-preview")
async def round_robin_preview(
    data: RoundRobinRequest,
    db: AsyncSession = Depends(get_db),
):
    """Preview a simple round-robin assignment order for a category."""
    return await calcom_service.preview_round_robin(db, data.category_id, data.appointment_date)


@router.post("/collective-slots-preview")
async def collective_slots_preview(
    data: CollectiveSlotsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Preview overlapping slots for a group booking."""
    return await calcom_service.preview_collective_slots(
        db,
        data.provider_ids,
        data.appointment_date,
        timezone_name=data.timezone,
    )
