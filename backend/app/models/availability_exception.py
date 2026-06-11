"""Availability Exception database model."""

import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AvailabilityException(Base):
    """Availability exception model for holidays and special hours."""

    __tablename__ = "availability_exceptions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("service_providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=True)
    end_time: Mapped[time] = mapped_column(Time, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    provider = relationship("ServiceProvider", backref="availability_exceptions")

    def __repr__(self) -> str:
        return f"<AvailabilityException {self.date} blocked={self.is_blocked}>"
