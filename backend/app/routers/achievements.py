"""Achievements router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.achievement import (
    AchievementListResponse,
    UserAchievementListResponse,
    UserProgressResponse,
)
from app.services.achievement_service import AchievementService

router = APIRouter(prefix="/api/achievements", tags=["Achievements"])


@router.get(
    "",
    response_model=AchievementListResponse,
    summary="List all achievements",
)
async def list_achievements(
    db: AsyncSession = Depends(get_db),
):
    """Get all available achievements in the system."""
    service = AchievementService(db)
    # Ensure default achievements are seeded
    await service.seed_achievements()
    result = await service.get_all_achievements()
    return result


@router.get(
    "/me",
    response_model=UserAchievementListResponse,
    summary="Get current user's achievements",
)
async def get_my_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's achievements with progress and earned status."""
    service = AchievementService(db)
    # Ensure default achievements are seeded
    await service.seed_achievements()
    result = await service.get_user_achievements(user_id=current_user.id)
    return result


@router.get(
    "/me/progress",
    response_model=UserProgressResponse,
    summary="Get current user's progress",
)
async def get_my_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's XP, level, and achievement stats."""
    service = AchievementService(db)
    result = await service.get_user_progress(user_id=current_user.id)
    return result
