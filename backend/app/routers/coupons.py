"""Coupons router."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_admin_user, get_current_user
from app.models.user import User
from app.schemas.coupon import (
    ApplyCouponRequest,
    ApplyCouponResponse,
    CouponCreate,
    CouponListResponse,
    CouponResponse,
)
from app.services.coupon_service import CouponService

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


@router.post(
    "",
    response_model=CouponResponse,
    status_code=201,
    summary="Create a coupon (admin only)",
)
async def create_coupon(
    data: CouponCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new coupon or promo code. Admin access required."""
    service = CouponService(db)
    coupon = await service.create_coupon(data, admin_id=current_user.id)
    return coupon


@router.get(
    "",
    response_model=CouponListResponse,
    summary="List all coupons (admin only)",
)
async def list_coupons(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a paginated list of all coupons. Admin access required."""
    service = CouponService(db)
    result = await service.get_coupons(page=page, per_page=per_page)
    return result


@router.post(
    "/apply",
    response_model=ApplyCouponResponse,
    summary="Apply a coupon code",
)
async def apply_coupon(
    data: ApplyCouponRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validate and apply a coupon code for the current user."""
    service = CouponService(db)

    # Parse category_id if provided
    category_id = UUID(data.category_id) if data.category_id else None

    result = await service.apply_coupon(
        code=data.code,
        user_id=current_user.id,
        amount=data.amount,
        category_id=category_id,
    )
    return result


@router.delete(
    "/{coupon_id}",
    response_model=CouponResponse,
    summary="Deactivate a coupon (admin only)",
)
async def deactivate_coupon(
    coupon_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a coupon (soft delete). Admin access required."""
    service = CouponService(db)
    coupon = await service.deactivate_coupon(coupon_id)
    return coupon
