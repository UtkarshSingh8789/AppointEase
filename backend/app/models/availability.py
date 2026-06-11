"""Availability database model."""

import uuid
from datetime import datetime, time, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Time
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Availability(Base):
    """Provider availability schedule model."""

    __tablename__ = "availabilities"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("service_providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    day_of_week: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # 0=Monday, 6=Sunday
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_duration_minutes: Mapped[int] = mapped_column(
        Integer, default=30, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    provider = relationship("ServiceProvider", back_populates="availability_slots")

    __table_args__ = (
        Index("ix_availability_provider_day", "provider_id", "day_of_week"),
    )

    def __repr__(self) -> str:
        return f"<Availability day={self.day_of_week} {self.start_time}-{self.end_time}>"
