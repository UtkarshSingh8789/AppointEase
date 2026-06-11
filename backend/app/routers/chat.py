"""Chat router."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/appointments", tags=["Chat"])


@router.post(
    "/{appointment_id}/messages",
    response_model=ChatMessageResponse,
    status_code=201,
    summary="Send a chat message",
)
async def send_message(
    appointment_id: UUID,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a chat message for an appointment."""
    service = ChatService(db)
    message = await service.send_message(appointment_id, current_user, data.content)
    return message


@router.get(
    "/{appointment_id}/messages",
    response_model=List[ChatMessageResponse],
    summary="Get chat messages",
)
async def get_messages(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all chat messages for an appointment."""
    service = ChatService(db)
    messages = await service.get_messages(appointment_id, current_user)
    return messages


@router.put(
    "/{appointment_id}/messages/read",
    summary="Mark messages as read",
)
async def mark_messages_read(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all messages in an appointment as read."""
    service = ChatService(db)
    count = await service.mark_all_read(appointment_id, current_user)
    return {"marked_read": count}
