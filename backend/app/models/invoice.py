"""Invoice database model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Invoice(Base):
    """Invoice model for appointment billing."""

    __tablename__ = "invoices"

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
    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
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
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    gst_rate: Mapped[float] = mapped_column(Float, default=18.0, nullable=False)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="generated", nullable=False
    )  # generated, paid, cancelled
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    appointment = relationship("Appointment", backref="invoice")
    customer = relationship("User", backref="invoices")
    provider = relationship("ServiceProvider", backref="invoices")

    __table_args__ = (
        Index("ix_invoices_customer", "customer_id"),
        Index("ix_invoices_provider", "provider_id"),
    )

    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number} amount={self.total_amount}>"
