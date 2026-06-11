"""Review database model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Review(Base):
    """Review model for provider ratings."""

    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    appointment_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("service_providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=True)
    # AI feature #6: Sentiment analysis fields
    sentiment: Mapped[str] = mapped_column(String(10), nullable=True, default=None)  # positive/neutral/negative
    sentiment_topics: Mapped[str] = mapped_column(Text, nullable=True, default=None)  # JSON list of topics
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    customer = relationship("User", backref="reviews_written")
    provider = relationship("ServiceProvider", backref="reviews")
    appointment = relationship("Appointment", backref="review")

    __table_args__ = (
        UniqueConstraint("appointment_id", name="uq_reviews_appointment_id"),
    )

    def __repr__(self) -> str:
        return f"<Review rating={self.rating} for provider {self.provider_id}>"
