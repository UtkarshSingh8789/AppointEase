"""Coupon usage tracking model."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CouponUsage(Base):
    """Tracks per-user coupon usage."""

    __tablename__ = "coupon_usages"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    coupon_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("coupons.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    appointment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
    )
    discount_applied: Mapped[float] = mapped_column(Float, nullable=False)
    used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    coupon = relationship("Coupon", back_populates="usages")
    user = relationship("User", backref="coupon_usages")
    appointment = relationship("Appointment", backref="coupon_usage")

    def __repr__(self) -> str:
        return f"<CouponUsage coupon={self.coupon_id} user={self.user_id} discount={self.discount_applied}>"
