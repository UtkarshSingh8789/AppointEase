"""Achievement and gamification database models."""

import enum
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AchievementCategory(str, enum.Enum):
    """Achievement category enumeration."""

    BOOKING = "booking"
    REVIEW = "review"
    LOYALTY = "loyalty"
    SOCIAL = "social"
    MILESTONE = "milestone"


class RequirementType(str, enum.Enum):
    """Achievement requirement type enumeration."""

    COUNT = "count"
    STREAK = "streak"
    RATING = "rating"
    SPECIAL = "special"


class Achievement(Base):
    """Achievement model for gamification badges and milestones."""

    __tablename__ = "achievements"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(
        String(50), nullable=False, default="🏆"
    )
    category: Mapped[AchievementCategory] = mapped_column(
        Enum(AchievementCategory), nullable=False
    )
    requirement_type: Mapped[RequirementType] = mapped_column(
        Enum(RequirementType), nullable=False
    )
    requirement_value: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )
    xp_reward: Mapped[int] = mapped_column(
        Integer, nullable=False, default=50
    )
    badge_color: Mapped[str] = mapped_column(
        String(20), nullable=False, default="#4CAF50"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user_achievements = relationship(
        "UserAchievement", back_populates="achievement", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Achievement {self.name} ({self.category.value})>"


class UserAchievement(Base):
    """Join table tracking user progress toward achievements."""

    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    achievement_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("achievements.id", ondelete="CASCADE"),
        nullable=False,
    )
    earned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    progress: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    # Relationships
    user = relationship("User", backref="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")

    def __repr__(self) -> str:
        return f"<UserAchievement user={self.user_id} achievement={self.achievement_id}>"
