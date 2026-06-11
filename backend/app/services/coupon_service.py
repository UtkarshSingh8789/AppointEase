"""Coupon service with business logic."""

import math
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coupon import Coupon, DiscountType
from app.models.coupon_usage import CouponUsage
from app.schemas.coupon import CouponCreate, CouponUpdate


class CouponService:
    """Service handling coupon operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_coupon(self, data: CouponCreate, admin_id: UUID) -> Coupon:
        """Create a new coupon (admin only)."""
        # Validate percentage discount is <= 100
        if data.discount_type == "percentage" and data.discount_value > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Percentage discount cannot exceed 100%",
            )

        # Validate valid_until is after valid_from
        if data.valid_until <= data.valid_from:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="valid_until must be after valid_from",
            )

        # Check for duplicate code
        existing = await self.db.execute(
            select(Coupon).where(Coupon.code == data.code)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Coupon code '{data.code}' already exists",
            )

        coupon = Coupon(
            code=data.code,
            description=data.description,
            discount_type=DiscountType(data.discount_type),
            discount_value=data.discount_value,
            min_order_amount=data.min_order_amount,
            max_discount_amount=data.max_discount_amount,
            usage_limit=data.usage_limit,
            per_user_limit=data.per_user_limit,
            valid_from=data.valid_from,
            valid_until=data.valid_until,
            category_id=data.category_id,
            created_by=admin_id,
        )
        self.db.add(coupon)
        await self.db.flush()
        await self.db.refresh(coupon)
        return coupon

    async def get_coupons(self, page: int = 1, per_page: int = 20) -> dict:
        """Get paginated list of all coupons."""
        count_result = await self.db.execute(select(func.count(Coupon.id)))
        total = count_result.scalar()

        offset = (page - 1) * per_page
        result = await self.db.execute(
            select(Coupon)
            .order_by(Coupon.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        coupons = result.scalars().all()

        return {
            "coupons": coupons,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 0,
        }

    async def validate_coupon(
        self,
        code: str,
        user_id: UUID,
        amount: float,
        category_id: Optional[UUID] = None,
    ) -> tuple[Coupon, float, str]:
        """
        Validate a coupon code for a given user and amount.

        Returns:
            Tuple of (coupon, discount_amount, message)

        Raises:
            HTTPException if coupon is invalid.
        """
        # Find the coupon
        result = await self.db.execute(
            select(Coupon).where(Coupon.code == code)
        )
        coupon = result.scalar_one_or_none()

        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coupon code not found",
            )

        # Check if active
        if not coupon.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This coupon is no longer active",
            )

        # Check validity period
        now = datetime.now(timezone.utc)
        if now < coupon.valid_from:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This coupon is not yet valid",
            )
        if now > coupon.valid_until:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This coupon has expired",
            )

        # Check total usage limit
        if coupon.usage_limit is not None and coupon.usage_count >= coupon.usage_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This coupon has reached its usage limit",
            )

        # Check per-user usage limit
        user_usage_result = await self.db.execute(
            select(func.count(CouponUsage.id)).where(
                CouponUsage.coupon_id == coupon.id,
                CouponUsage.user_id == user_id,
            )
        )
        user_usage_count = user_usage_result.scalar()
        if user_usage_count >= coupon.per_user_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already used this coupon the maximum number of times",
            )

        # Check minimum order amount
        if coupon.min_order_amount is not None and amount < coupon.min_order_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum order amount of ₹{coupon.min_order_amount:.2f} required",
            )

        # Check category restriction
        if coupon.category_id is not None:
            if category_id is None or category_id != coupon.category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This coupon is not valid for the selected service category",
                )

        # Calculate discount
        if coupon.discount_type == DiscountType.PERCENTAGE:
            discount = amount * (coupon.discount_value / 100)
            # Apply max discount cap
            if coupon.max_discount_amount is not None:
                discount = min(discount, coupon.max_discount_amount)
        else:
            # Flat amount discount
            discount = min(coupon.discount_value, amount)

        # Round to 2 decimal places
        discount = round(discount, 2)
        message = f"Coupon '{coupon.code}' applied! You save ₹{discount:.2f}"

        return coupon, discount, message

    async def apply_coupon(
        self,
        code: str,
        user_id: UUID,
        amount: float,
        category_id: Optional[UUID] = None,
        appointment_id: Optional[UUID] = None,
    ) -> dict:
        """
        Validate and record coupon usage.

        Returns:
            Dict with valid, discount, message, final_amount.
        """
        coupon, discount, message = await self.validate_coupon(
            code=code,
            user_id=user_id,
            amount=amount,
            category_id=category_id,
        )

        # Record usage
        usage = CouponUsage(
            coupon_id=coupon.id,
            user_id=user_id,
            appointment_id=appointment_id,
            discount_applied=discount,
        )
        self.db.add(usage)

        # Increment usage count
        coupon.usage_count += 1

        await self.db.flush()

        final_amount = round(amount - discount, 2)

        return {
            "valid": True,
            "discount": discount,
            "message": message,
            "final_amount": final_amount,
        }

    async def deactivate_coupon(self, coupon_id: UUID) -> Coupon:
        """Deactivate a coupon (soft delete)."""
        result = await self.db.execute(
            select(Coupon).where(Coupon.id == coupon_id)
        )
        coupon = result.scalar_one_or_none()

        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coupon not found",
            )

        coupon.is_active = False
        await self.db.flush()
        await self.db.refresh(coupon)
        return coupon
