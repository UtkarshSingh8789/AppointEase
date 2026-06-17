"""Authentication service with business logic."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.schemas.user import (
    PasswordChange,
    TokenRefresh,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserUpdate,
)


class AuthService:
    """Service handling authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, user_data: UserCreate) -> User:
        """Register a new user."""
        # Check if email already exists
        result = await self.db.execute(
            select(User).where(User.email == user_data.email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        # Create new user (admin role cannot be self-registered)
        role = user_data.role if user_data.role and user_data.role != UserRole.ADMIN else UserRole.CUSTOMER
        user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            full_name=user_data.full_name,
            phone_number=user_data.phone_number,
            role=role,
        )

        self.db.add(user)
        try:
            await self.db.commit()
            await self.db.refresh(user)
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )

        # Send welcome email after successful commit
        from app.services.email_service import email_service
        try:
            await email_service.send_welcome_email(
                user_email=user.email,
                user_name=user.full_name,
            )
        except Exception:
            pass  # Email failure should not block registration

        return user

    async def register_with_tokens(self, user_data: UserCreate) -> TokenResponse:
        """Register a new user and return tokens (auto-login after signup)."""
        user = await self.register(user_data)

        # Generate tokens for immediate login
        token_data = {"sub": str(user.id), "role": user.role.value}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
        )

    async def login(self, login_data: UserLogin) -> TokenResponse:
        """Authenticate user and return tokens."""
        result = await self.db.execute(
            select(User).where(User.email == login_data.email)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        # Generate tokens
        token_data = {"sub": str(user.id), "role": user.role.value}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
        )

    async def refresh_token(self, token_data: TokenRefresh) -> TokenResponse:
        """Refresh access token using refresh token."""
        payload = decode_token(token_data.refresh_token)

        if payload is None or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user_id = payload.get("sub")
        result = await self.db.execute(
            select(User).where(User.id == UUID(user_id))
        )
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Generate new tokens
        new_token_data = {"sub": str(user.id), "role": user.role.value}
        access_token = create_access_token(new_token_data)
        refresh_token = create_refresh_token(new_token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def update_profile(self, user: User, update_data: UserUpdate) -> User:
        """Update user profile."""
        update_dict = update_data.model_dump(exclude_unset=True)

        for field, value in update_dict.items():
            setattr(user, field, value)

        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def change_password(self, user: User, password_data: PasswordChange) -> None:
        """Change user password."""
        if not verify_password(password_data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

        user.password_hash = hash_password(password_data.new_password)
        await self.db.flush()
