"""Waitlist router."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.waitlist import WaitlistCreate, WaitlistResponse
from app.services.waitlist_service import WaitlistService

router = APIRouter(prefix="/api/waitlist", tags=["Waitlist"])


@router.post(
    "",
    response_model=WaitlistResponse,
    status_code=201,
    summary="Join waitlist",
)
async def join_waitlist(
    data: WaitlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join the waitlist for a provider on a specific date."""
    service = WaitlistService(db)
    entry = await service.join_waitlist(current_user, data)
    return entry


@router.get(
    "/me",
    response_model=List[WaitlistResponse],
    summary="Get my waitlist entries",
)
async def get_my_waitlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all waitlist entries for the current user."""
    service = WaitlistService(db)
    entries = await service.get_my_waitlist(current_user.id)
    return entries


@router.delete(
    "/{entry_id}",
    status_code=204,
    summary="Remove from waitlist",
)
async def remove_from_waitlist(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a waitlist entry."""
    service = WaitlistService(db)
    await service.remove_from_waitlist(entry_id, current_user.id)
