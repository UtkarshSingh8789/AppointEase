"""Notifications router."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List notifications",
)
async def list_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List notifications for the current user with pagination."""
    service = NotificationService(db)
    result = await service.get_notifications(
        user_id=current_user.id,
        page=page,
        size=size,
        unread_only=unread_only,
    )
    return result


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notification count",
)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the count of unread notifications."""
    service = NotificationService(db)
    count = await service.get_unread_count(current_user.id)
    return {"count": count}


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark notification as read",
)
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    service = NotificationService(db)
    notification = await service.mark_read(notification_id, current_user.id)
    return notification


@router.put(
    "/read-all",
    summary="Mark all notifications as read",
)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for the current user."""
    service = NotificationService(db)
    count = await service.mark_all_read(current_user.id)
    return {"message": f"Marked {count} notifications as read"}


@router.delete(
    "/{notification_id}",
    status_code=204,
    summary="Delete notification",
)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification."""
    service = NotificationService(db)
    await service.delete_notification(notification_id, current_user.id)
