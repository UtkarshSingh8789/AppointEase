"""User service with business logic."""

import math
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.user import User, UserRole


class UserService:
    """Service handling user operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_id(self, user_id: UUID) -> User:
        """Get a user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    async def get_users(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
    ) -> dict:
        """Get paginated list of users with optional filters."""
        query = select(User).options(joinedload(User.provider_profile))

        # Apply filters
        if search:
            query = query.where(
                (User.full_name.ilike(f"%{search}%"))
                | (User.email.ilike(f"%{search}%"))
            )
        if role:
            query = query.where(User.role == role)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(User.created_at.desc())

        result = await self.db.execute(query)
        users = result.unique().scalars().all()

        user_payloads = []
        for user in users:
            provider = user.provider_profile
            if user.role == UserRole.PROVIDER:
                if not user.is_active:
                    provider_status = "deactive"
                elif provider and not provider.is_verified:
                    provider_status = "pending"
                else:
                    provider_status = "active"
            else:
                provider_status = "active" if user.is_active else "deactive"

            user_payloads.append(
                {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "phone_number": user.phone_number,
                    "role": user.role,
                    "avatar_url": user.avatar_url,
                    "is_active": user.is_active,
                    "provider_id": provider.id if provider else None,
                    "provider_is_verified": provider.is_verified if provider else None,
                    "provider_status": provider_status,
                    "created_at": user.created_at,
                    "updated_at": user.updated_at,
                }
            )

        return {
            "users": user_payloads,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 0,
        }

    async def update_user_status(self, user_id: UUID, is_active: bool) -> User:
        """Activate or deactivate a user."""
        user = await self.get_user_by_id(user_id)
        user.is_active = is_active
        await self.db.flush()
        await self.db.refresh(user)
        return user
