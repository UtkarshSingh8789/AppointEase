"""Notification Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    """Schema for notification response."""

    id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list response."""

    notifications: list[NotificationResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    """Schema for unread notification count."""

    count: int


class MarkReadRequest(BaseModel):
    """Schema for marking notifications as read."""

    notification_ids: Optional[list[UUID]] = None
