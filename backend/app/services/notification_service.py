"""Notification service with business logic."""

import math
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType


class NotificationService:
    """Service handling notification operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_notification(
        self,
        user_id: UUID,
        type: NotificationType,
        title: str,
        message: str,
        link: Optional[str] = None,
    ) -> Notification:
        """Create a new notification for a user."""
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
        )
        self.db.add(notification)
        await self.db.flush()
        await self.db.refresh(notification)
        return notification

    async def get_notifications(
        self,
        user_id: UUID,
        page: int = 1,
        size: int = 20,
        unread_only: bool = False,
    ) -> dict:
        """Get paginated notifications for a user."""
        query = select(Notification).where(Notification.user_id == user_id)
        count_query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id
        )

        if unread_only:
            query = query.where(Notification.is_read == False)
            count_query = count_query.where(Notification.is_read == False)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(
            Notification.created_at.desc()
        )

        result = await self.db.execute(query)
        notifications = result.scalars().all()

        return {
            "notifications": notifications,
            "total": total,
            "page": page,
            "per_page": size,
            "total_pages": math.ceil(total / size) if total > 0 else 0,
        }

    async def get_unread_count(self, user_id: UUID) -> int:
        """Get the count of unread notifications for a user."""
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        return result.scalar()

    async def mark_read(self, notification_id: UUID, user_id: UUID) -> Notification:
        """Mark a single notification as read."""
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()

        if not notification:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        notification.is_read = True
        await self.db.flush()
        await self.db.refresh(notification)
        return notification

    async def mark_all_read(self, user_id: UUID) -> int:
        """Mark all notifications as read for a user. Returns count updated."""
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .values(is_read=True)
        )
        await self.db.flush()
        return result.rowcount

    async def delete_notification(self, notification_id: UUID, user_id: UUID) -> None:
        """Delete a notification."""
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()

        if not notification:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        await self.db.delete(notification)
        await self.db.flush()
