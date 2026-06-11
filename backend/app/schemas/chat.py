"""Chat Message Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class ChatMessageCreate(BaseModel):
    """Schema for sending a chat message."""

    content: str = Field(..., min_length=1, max_length=5000)


class ChatMessageResponse(BaseModel):
    """Schema for chat message response."""

    id: UUID
    appointment_id: UUID
    sender_id: UUID
    content: str
    is_read: bool
    created_at: datetime
    sender: Optional[UserResponse] = None

    model_config = {"from_attributes": True}
