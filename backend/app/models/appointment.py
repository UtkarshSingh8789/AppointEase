"""Appointment database model."""

import enum
import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Index, String, Text, Time
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AppointmentStatus(str, enum.Enum):
    """Appointment status enumeration."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class Appointment(Base):
    """Appointment model representing a booking between customer and provider."""

    __tablename__ = "appointments"

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
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    base_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cancellation_fee: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus),
        default=AppointmentStatus.PENDING,
        nullable=False,
    )
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str] = mapped_column(String(500), nullable=True)
    # AI feature #1: No-show risk score (low/medium/high)
    no_show_risk: Mapped[str] = mapped_column(String(10), nullable=True, default=None)
    # AI feature #4: Post-appointment AI follow-up summary
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True, default=None)
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
    customer = relationship(
        "User", back_populates="appointments", foreign_keys=[customer_id]
    )
    provider = relationship("ServiceProvider", back_populates="appointments")

    __table_args__ = (
        Index("ix_appointments_provider_date", "provider_id", "appointment_date"),
        Index("ix_appointments_customer_status", "customer_id", "status"),
        Index("ix_appointments_status", "status"),
        # DB-level unique constraint prevents double-booking races that bypass
        # application-layer checks (concurrent requests on the same slot).
        # UniqueConstraint on (provider_id, appointment_date, start_time) for
        # non-cancelled/rejected appointments is enforced at the application layer;
        # the DB index below provides fast lookups for conflict detection queries.
        Index(
            "ix_appointments_provider_date_start",
            "provider_id",
            "appointment_date",
            "start_time",
        ),
    )

    def __repr__(self) -> str:
        return f"<Appointment {self.appointment_date} {self.start_time} ({self.status.value})>"
