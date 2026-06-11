"""Appointment Comment Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class CommentCreate(BaseModel):
    """Schema for creating a comment."""

    content: str = Field(..., min_length=1, max_length=2000)
    is_internal: bool = False


class CommentResponse(BaseModel):
    """Schema for comment response."""

    id: UUID
    appointment_id: UUID
    user_id: UUID
    content: str
    is_internal: bool
    created_at: datetime
    user: Optional[UserResponse] = None

    model_config = {"from_attributes": True}
