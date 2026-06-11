"""Achievement service with business logic."""

import math
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import (
    Achievement,
    AchievementCategory,
    RequirementType,
    UserAchievement,
)


# Default achievements to seed
DEFAULT_ACHIEVEMENTS = [
    {
        "name": "First Booking",
        "description": "Complete your first appointment booking",
        "icon": "🎯",
        "category": AchievementCategory.BOOKING,
        "requirement_type": RequirementType.COUNT,
        "requirement_value": 1,
        "xp_reward": 50,
        "badge_color": "#4CAF50",
    },
    {
        "name": "Regular",
        "description": "Complete 5 appointment bookings",
        "icon": "⭐",
        "category": AchievementCategory.BOOKING,
        "requirement_type": RequirementType.COUNT,
        "requirement_value": 5,
        "xp_reward": 100,
        "badge_color": "#2196F3",
    },
    {
        "name": "Power User",
        "description": "Complete 10 appointment bookings",
        "icon": "🚀",
        "category": AchievementCategory.BOOKING,
        "requirement_type": RequirementType.COUNT,
        "requirement_value": 10,
        "xp_reward": 200,
        "badge_color": "#9C27B0",
    },
    {
        "name": "Loyal Customer",
        "description": "Complete 25 appointment bookings",
        "icon": "💎",
        "category": AchievementCategory.BOOKING,
        "requirement_type": RequirementType.COUNT,
        "requirement_value": 25,
        "xp_reward": 500,
        "badge_color": "#FF9800",
    },
    {
        "name": "5-Star Reviewer",
        "description": "Leave a 5-star review for a service",
        "icon": "⭐",
        "category": AchievementCategory.REVIEW,
        "requirement_type": RequirementType.RATING,
        "requirement_value": 5,
        "xp_reward": 75,
        "badge_color": "#FFC107",
    },
    {
        "name": "Review Master",
        "description": "Write 10 reviews for services",
        "icon": "📝",
        "category": AchievementCategory.REVIEW,
        "requirement_type": RequirementType.COUNT,
        "requirement_value": 10,
        "xp_reward": 150,
        "badge_color": "#00BCD4",
    },
    {
        "name": "Early Bird",
        "description": "Book an appointment 7 or more days in advance",
        "icon": "🌅",
        "category": AchievementCategory.MILESTONE,
        "requirement_type": RequirementType.SPECIAL,
        "requirement_value": 7,
        "xp_reward": 50,
        "badge_color": "#FF5722",
    },
    {
        "name": "Night Owl",
        "description": "Book an appointment after 8 PM",
        "icon": "🦉",
        "category": AchievementCategory.MILESTONE,
        "requirement_type": RequirementType.SPECIAL,
        "requirement_value": 20,
        "xp_reward": 50,
        "badge_color": "#3F51B5",
    },
]


class AchievementService:
    """Service handling achievement and gamification operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def seed_achievements(self) -> None:
        """Seed default achievements if they don't exist."""
        for achievement_data in DEFAULT_ACHIEVEMENTS:
            result = await self.db.execute(
                select(Achievement).where(Achievement.name == achievement_data["name"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                achievement = Achievement(**achievement_data)
                self.db.add(achievement)
        await self.db.flush()

    async def get_all_achievements(self) -> dict:
        """Get all available active achievements."""
        result = await self.db.execute(
            select(Achievement)
            .where(Achievement.is_active == True)
            .order_by(Achievement.category, Achievement.requirement_value)
        )
        achievements = result.scalars().all()

        return {
            "achievements": achievements,
            "total": len(achievements),
        }

    async def get_user_achievements(self, user_id: UUID) -> dict:
        """Get user's earned and in-progress achievements with progress summary."""
        # Get all active achievements
        all_result = await self.db.execute(
            select(Achievement)
            .where(Achievement.is_active == True)
            .order_by(Achievement.category, Achievement.requirement_value)
        )
        all_achievements = all_result.scalars().all()

        # Get user's achievement records
        user_result = await self.db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
        user_achievements_map = {
            ua.achievement_id: ua for ua in user_result.scalars().all()
        }

        # Build combined response
        achievements_response = []
        for achievement in all_achievements:
            user_achievement = user_achievements_map.get(achievement.id)
            achievements_response.append({
                "id": achievement.id,
                "name": achievement.name,
                "description": achievement.description,
                "icon": achievement.icon,
                "category": achievement.category.value,
                "requirement_type": achievement.requirement_type.value,
                "requirement_value": achievement.requirement_value,
                "xp_reward": achievement.xp_reward,
                "badge_color": achievement.badge_color,
                "progress": user_achievement.progress if user_achievement else 0,
                "earned_at": user_achievement.earned_at if user_achievement else None,
                "is_earned": user_achievement.earned_at is not None if user_achievement else False,
            })

        progress = await self._calculate_progress(user_id)

        return {
            "achievements": achievements_response,
            "progress": progress,
        }

    async def get_user_progress(self, user_id: UUID) -> dict:
        """Get user's XP, level, and achievement stats."""
        return await self._calculate_progress(user_id)

    async def check_and_award(
        self,
        user_id: UUID,
        event_type: str,
        event_data: Optional[dict] = None,
    ) -> list[dict]:
        """
        Check if user earned new achievements after an event.

        Args:
            user_id: The user's ID.
            event_type: Type of event (e.g., 'booking_completed', 'review_created').
            event_data: Additional event context (e.g., rating, booking_time).

        Returns:
            List of newly earned achievements.
        """
        if event_data is None:
            event_data = {}

        newly_earned = []

        # Get relevant achievements based on event type
        achievements = await self._get_relevant_achievements(event_type)

        for achievement in achievements:
            # Get or create user achievement record
            user_achievement = await self._get_or_create_user_achievement(
                user_id, achievement.id
            )

            # Skip if already earned
            if user_achievement.earned_at is not None:
                continue

            # Update progress and check if earned
            earned = await self._evaluate_achievement(
                achievement, user_achievement, event_type, event_data
            )

            if earned:
                user_achievement.earned_at = datetime.now(timezone.utc)
                newly_earned.append({
                    "id": achievement.id,
                    "name": achievement.name,
                    "description": achievement.description,
                    "icon": achievement.icon,
                    "xp_reward": achievement.xp_reward,
                    "badge_color": achievement.badge_color,
                })

        await self.db.flush()
        return newly_earned

    async def check_and_award_with_wallet(
        self,
        user_id: UUID,
        event_type: str,
        event_data: Optional[dict] = None,
    ) -> list[dict]:
        """Award achievements and credit the earned XP to the user's wallet."""
        newly_earned = await self.check_and_award(user_id, event_type, event_data)
        if not newly_earned:
            return newly_earned

        from app.services.loyalty_service import LoyaltyService

        loyalty_service = LoyaltyService(self.db)
        for achievement in newly_earned:
            await loyalty_service.award_points(
                user_id=user_id,
                points=achievement["xp_reward"],
                description=f"Achievement unlocked: {achievement['name']}",
            )

        return newly_earned

    async def _calculate_progress(self, user_id: UUID) -> dict:
        """Calculate user's total XP, level, and stats."""
        # Get earned achievements with XP
        result = await self.db.execute(
            select(UserAchievement, Achievement)
            .join(Achievement, UserAchievement.achievement_id == Achievement.id)
            .where(
                UserAchievement.user_id == user_id,
                UserAchievement.earned_at.isnot(None),
            )
        )
        earned_rows = result.all()

        total_xp = sum(row.Achievement.xp_reward for row in earned_rows)
        achievements_earned = len(earned_rows)

        # Count total available achievements
        total_result = await self.db.execute(
            select(func.count(Achievement.id)).where(Achievement.is_active == True)
        )
        achievements_available = total_result.scalar() or 0

        # Level calculation: level = floor(total_xp / 100) + 1
        level = math.floor(total_xp / 100) + 1
        current_level_xp = total_xp % 100
        next_level_xp = 100 - current_level_xp

        return {
            "total_xp": total_xp,
            "level": level,
            "achievements_earned": achievements_earned,
            "achievements_available": achievements_available,
            "next_level_xp": next_level_xp,
            "current_level_xp": current_level_xp,
        }

    async def _get_relevant_achievements(self, event_type: str) -> list[Achievement]:
        """Get achievements relevant to the given event type."""
        category_map = {
            "booking_completed": AchievementCategory.BOOKING,
            "review_created": AchievementCategory.REVIEW,
            "booking_early": AchievementCategory.MILESTONE,
            "booking_night": AchievementCategory.MILESTONE,
        }

        category = category_map.get(event_type)
        if category is None:
            return []

        query = select(Achievement).where(
            Achievement.is_active == True,
            Achievement.category == category,
        )

        # For milestone events, filter by specific achievements
        if event_type == "booking_early":
            query = query.where(Achievement.name == "Early Bird")
        elif event_type == "booking_night":
            query = query.where(Achievement.name == "Night Owl")

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _get_or_create_user_achievement(
        self, user_id: UUID, achievement_id: UUID
    ) -> UserAchievement:
        """Get existing user achievement record or create a new one."""
        result = await self.db.execute(
            select(UserAchievement).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id,
            )
        )
        user_achievement = result.scalar_one_or_none()

        if user_achievement is None:
            user_achievement = UserAchievement(
                user_id=user_id,
                achievement_id=achievement_id,
                progress=0,
            )
            self.db.add(user_achievement)
            await self.db.flush()

        return user_achievement

    async def _evaluate_achievement(
        self,
        achievement: Achievement,
        user_achievement: UserAchievement,
        event_type: str,
        event_data: dict,
    ) -> bool:
        """
        Evaluate whether an achievement should be awarded.

        Returns True if the achievement is newly earned.
        """
        if achievement.requirement_type == RequirementType.COUNT:
            # Increment progress
            user_achievement.progress += 1
            return user_achievement.progress >= achievement.requirement_value

        elif achievement.requirement_type == RequirementType.RATING:
            # Check if the rating meets the requirement
            rating = event_data.get("rating", 0)
            if rating >= achievement.requirement_value:
                user_achievement.progress = achievement.requirement_value
                return True
            return False

        elif achievement.requirement_type == RequirementType.SPECIAL:
            # Special achievements are awarded based on event context
            if event_type == "booking_early":
                days_ahead = event_data.get("days_ahead", 0)
                if days_ahead >= achievement.requirement_value:
                    user_achievement.progress = achievement.requirement_value
                    return True
            elif event_type == "booking_night":
                booking_hour = event_data.get("booking_hour", 0)
                if booking_hour >= achievement.requirement_value:
                    user_achievement.progress = achievement.requirement_value
                    return True
            return False

        elif achievement.requirement_type == RequirementType.STREAK:
            # Streak-based: increment and check
            user_achievement.progress += 1
            return user_achievement.progress >= achievement.requirement_value

        return False
