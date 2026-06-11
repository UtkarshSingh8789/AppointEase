"""Coupon Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CouponCreate(BaseModel):
    """Schema for creating a coupon."""

    code: str = Field(..., min_length=3, max_length=50, description="Unique coupon code")
    description: Optional[str] = Field(None, description="Coupon description")
    discount_type: str = Field(..., description="Either 'percentage' or 'flat_amount'")
    discount_value: float = Field(..., gt=0, description="Discount value")
    min_order_amount: Optional[float] = Field(
        None, ge=0, description="Minimum order amount to apply coupon"
    )
    max_discount_amount: Optional[float] = Field(
        None, ge=0, description="Maximum discount cap for percentage discounts"
    )
    usage_limit: Optional[int] = Field(
        None, ge=1, description="Total usage limit (null=unlimited)"
    )
    per_user_limit: int = Field(1, ge=1, description="Max uses per user")
    valid_from: datetime = Field(..., description="Coupon validity start")
    valid_until: datetime = Field(..., description="Coupon validity end")
    category_id: Optional[UUID] = Field(
        None, description="Restrict coupon to a specific service category"
    )

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        """Ensure coupon code is uppercase."""
        return v.strip().upper()

    @field_validator("discount_type")
    @classmethod
    def validate_discount_type(cls, v: str) -> str:
        """Validate discount type value."""
        allowed = ("percentage", "flat_amount")
        if v not in allowed:
            raise ValueError(f"discount_type must be one of {allowed}")
        return v

    @field_validator("discount_value")
    @classmethod
    def validate_discount_value(cls, v: float, info) -> float:
        """Validate discount value based on type."""
        # Note: percentage validation happens in service since we need discount_type context
        if v <= 0:
            raise ValueError("discount_value must be greater than 0")
        return v


class CouponUpdate(BaseModel):
    """Schema for updating a coupon."""

    description: Optional[str] = None
    discount_value: Optional[float] = Field(None, gt=0)
    min_order_amount: Optional[float] = Field(None, ge=0)
    max_discount_amount: Optional[float] = Field(None, ge=0)
    usage_limit: Optional[int] = Field(None, ge=1)
    per_user_limit: Optional[int] = Field(None, ge=1)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None
    category_id: Optional[UUID] = None


class CouponResponse(BaseModel):
    """Schema for coupon response."""

    id: UUID
    code: str
    description: Optional[str]
    discount_type: str
    discount_value: float
    min_order_amount: Optional[float]
    max_discount_amount: Optional[float]
    usage_limit: Optional[int]
    usage_count: int
    per_user_limit: int
    valid_from: datetime
    valid_until: datetime
    is_active: bool
    category_id: Optional[UUID]
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CouponListResponse(BaseModel):
    """Schema for paginated coupon list."""

    coupons: List[CouponResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class ApplyCouponRequest(BaseModel):
    """Schema for applying a coupon code."""

    code: str = Field(..., min_length=1, description="Coupon code to apply")
    amount: float = Field(..., gt=0, description="Order amount before discount")
    category_id: Optional[str] = Field(
        None, description="Service category ID for category-restricted coupons"
    )

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        """Normalize coupon code to uppercase."""
        return v.strip().upper()


class ApplyCouponResponse(BaseModel):
    """Schema for coupon application result."""

    valid: bool
    discount: float
    message: str
    final_amount: float
