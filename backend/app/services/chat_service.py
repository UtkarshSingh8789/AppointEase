"""Chat service with business logic."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.appointment import Appointment
from app.models.chat import ChatMessage
from app.models.provider import ServiceProvider
from app.models.user import User, UserRole


class ChatService:
    """Service handling chat message operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_message(
        self, appointment_id: UUID, sender: User, content: str
    ) -> ChatMessage:
        """Send a chat message for an appointment."""
        # Verify appointment exists and user has access
        await self._verify_access(appointment_id, sender)

        message = ChatMessage(
            appointment_id=appointment_id,
            sender_id=sender.id,
            content=content,
        )

        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)

        # Load sender relationship
        result = await self.db.execute(
            select(ChatMessage)
            .options(joinedload(ChatMessage.sender))
            .where(ChatMessage.id == message.id)
        )
        return result.scalar_one()

    async def get_messages(
        self, appointment_id: UUID, user: User
    ) -> list:
        """Get all messages for an appointment."""
        await self._verify_access(appointment_id, user)

        result = await self.db.execute(
            select(ChatMessage)
            .options(joinedload(ChatMessage.sender))
            .where(ChatMessage.appointment_id == appointment_id)
            .order_by(ChatMessage.created_at.asc())
        )
        return result.unique().scalars().all()

    async def mark_all_read(self, appointment_id: UUID, user: User) -> int:
        """Mark all messages in an appointment as read (except own messages)."""
        await self._verify_access(appointment_id, user)

        result = await self.db.execute(
            update(ChatMessage)
            .where(
                ChatMessage.appointment_id == appointment_id,
                ChatMessage.sender_id != user.id,
                ChatMessage.is_read == False,
            )
            .values(is_read=True)
        )
        await self.db.flush()
        return result.rowcount

    async def _verify_access(self, appointment_id: UUID, user: User) -> Appointment:
        """Verify user has access to the appointment."""
        result = await self.db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = result.scalar_one_or_none()

        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

        if user.role == UserRole.ADMIN:
            return appointment

        if user.role == UserRole.CUSTOMER and appointment.customer_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        if user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider or appointment.provider_id != provider.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )

        return appointment
