"""Coupon database model."""

import enum
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DiscountType(str, enum.Enum):
    """Discount type enumeration."""

    PERCENTAGE = "percentage"
    FLAT_AMOUNT = "flat_amount"


class Coupon(Base):
    """Coupon model for promo codes and discounts."""

    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType), nullable=False
    )
    discount_value: Mapped[float] = mapped_column(Float, nullable=False)
    min_order_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_discount_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    usage_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    per_user_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    valid_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    valid_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("service_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    category = relationship("ServiceCategory", backref="coupons")
    creator = relationship("User", backref="created_coupons")
    usages = relationship(
        "CouponUsage", back_populates="coupon", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Coupon {self.code} ({self.discount_type.value}: {self.discount_value})>"
