"""Password reset service with business logic."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.password_reset import PasswordResetToken
from app.models.user import User


class PasswordResetService:
    """Service handling password reset operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_reset_token(self, email: str) -> str:
        """Create a password reset token for the given email."""
        # Find user by email
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            # Don't reveal whether email exists - return silently
            return ""

        # Generate a secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
        )

        self.db.add(reset_token)
        await self.db.flush()

        # Send password reset email
        from app.services.email_service import email_service
        reset_link = f"http://localhost/reset-password?token={token}"
        await email_service.send_password_reset(
            user_email=user.email,
            user_name=user.full_name,
            reset_link=reset_link,
        )

        return token

    async def reset_password(self, token: str, new_password: str) -> None:
        """Reset password using a valid token."""
        result = await self.db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token == token)
        )
        reset_token = result.scalar_one_or_none()

        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        if reset_token.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This reset token has already been used",
            )

        if reset_token.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired",
            )

        # Get user and update password
        user_result = await self.db.execute(
            select(User).where(User.id == reset_token.user_id)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user.password_hash = hash_password(new_password)
        reset_token.is_used = True
        await self.db.flush()
