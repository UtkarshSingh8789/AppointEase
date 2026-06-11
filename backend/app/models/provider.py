"""Service Provider database model."""

import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ServiceProvider(Base):
    """Service provider profile model."""

    __tablename__ = "service_providers"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    specialization: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("service_categories.id"),
        nullable=False,
    )
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_description: Mapped[str] = mapped_column(Text, nullable=True)
    hourly_rate: Mapped[float] = mapped_column(Float, nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Enhanced fields
    pincode: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    response_time_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    vacation_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    vacation_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
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
    user = relationship("User", back_populates="provider_profile")
    category = relationship("ServiceCategory", back_populates="providers")
    availability_slots = relationship(
        "Availability", back_populates="provider", cascade="all, delete-orphan"
    )
    appointments = relationship(
        "Appointment", back_populates="provider", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_providers_category", "category_id"),
        Index("ix_providers_verified", "is_verified"),
    )

    def __repr__(self) -> str:
        return f"<ServiceProvider {self.specialization}>"
