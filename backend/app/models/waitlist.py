"""Waitlist database model."""

import enum
import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, Time
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WaitlistStatus(str, enum.Enum):
    """Waitlist entry status enumeration."""

    WAITING = "waiting"
    OFFERED = "offered"
    BOOKED = "booked"
    EXPIRED = "expired"


class WaitlistEntry(Base):
    """Waitlist entry model for customers waiting for availability."""

    __tablename__ = "waitlist"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("service_providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    preferred_time_start: Mapped[time] = mapped_column(Time, nullable=True)
    preferred_time_end: Mapped[time] = mapped_column(Time, nullable=True)
    status: Mapped[WaitlistStatus] = mapped_column(
        Enum(WaitlistStatus),
        default=WaitlistStatus.WAITING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    customer = relationship("User", backref="waitlist_entries")
    provider = relationship("ServiceProvider", backref="waitlist_entries")

    __table_args__ = (
        Index("ix_waitlist_provider_date", "provider_id", "preferred_date"),
        Index("ix_waitlist_customer", "customer_id"),
    )

    def __repr__(self) -> str:
        return f"<WaitlistEntry customer={self.customer_id} provider={self.provider_id} date={self.preferred_date}>"
