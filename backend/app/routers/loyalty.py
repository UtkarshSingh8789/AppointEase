"""Loyalty router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.loyalty import (
    LoyaltyAccountResponse,
    LoyaltyRedeemRequest,
    LoyaltyTransactionListResponse,
)
from app.services.loyalty_service import LoyaltyService

router = APIRouter(prefix="/api/loyalty", tags=["Loyalty"])


@router.get(
    "/me",
    response_model=LoyaltyAccountResponse,
    summary="Get my loyalty account",
)
async def get_my_loyalty_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's loyalty account. Auto-creates if not exists."""
    service = LoyaltyService(db)
    account = await service.get_or_create_account(current_user.id)
    return account


@router.get(
    "/me/transactions",
    response_model=LoyaltyTransactionListResponse,
    summary="Get my loyalty transactions",
)
async def get_my_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated loyalty transactions for the current user."""
    service = LoyaltyService(db)
    result = await service.get_transactions(current_user.id, page, per_page)
    return result


@router.post(
    "/redeem",
    response_model=LoyaltyAccountResponse,
    summary="Redeem loyalty points",
)
async def redeem_points(
    data: LoyaltyRedeemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Redeem loyalty points."""
    service = LoyaltyService(db)
    account = await service.redeem_points(current_user.id, data.points)
    return account
