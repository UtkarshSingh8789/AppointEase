"""Loyalty database models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LoyaltyAccount(Base):
    """Loyalty account model for tracking customer points."""

    __tablename__ = "loyalty_accounts"

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
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tier: Mapped[str] = mapped_column(String(20), default="bronze", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", backref="loyalty_account")
    transactions = relationship(
        "LoyaltyTransaction", back_populates="account", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<LoyaltyAccount user={self.user_id} points={self.points} tier={self.tier}>"


class LoyaltyTransaction(Base):
    """Loyalty transaction model for tracking point changes."""

    __tablename__ = "loyalty_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("loyalty_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # earned, redeemed, expired
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    account = relationship("LoyaltyAccount", back_populates="transactions")

    def __repr__(self) -> str:
        return f"<LoyaltyTransaction account={self.account_id} points={self.points} type={self.type}>"
