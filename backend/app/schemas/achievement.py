"""Achievement Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class AchievementResponse(BaseModel):
    """Schema for achievement response."""

    id: UUID
    name: str
    description: Optional[str]
    icon: str
    category: str
    requirement_type: str
    requirement_value: int
    xp_reward: int
    badge_color: str

    model_config = {"from_attributes": True}


class UserAchievementResponse(BaseModel):
    """Schema for user achievement with progress info."""

    id: UUID
    name: str
    description: Optional[str]
    icon: str
    category: str
    requirement_type: str
    requirement_value: int
    xp_reward: int
    badge_color: str
    progress: int
    earned_at: Optional[datetime]
    is_earned: bool

    model_config = {"from_attributes": True}


class UserProgressResponse(BaseModel):
    """Schema for user gamification progress summary."""

    total_xp: int
    level: int
    achievements_earned: int
    achievements_available: int
    next_level_xp: int
    current_level_xp: int

    model_config = {"from_attributes": True}


class AchievementListResponse(BaseModel):
    """Schema for list of achievements."""

    achievements: List[AchievementResponse]
    total: int


class UserAchievementListResponse(BaseModel):
    """Schema for user achievements list with progress."""

    achievements: List[UserAchievementResponse]
    progress: UserProgressResponse
