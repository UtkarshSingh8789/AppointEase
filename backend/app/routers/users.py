"""Users router for admin user management."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_admin_user
from app.models.user import User
from app.schemas.user import UserListResponse, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "",
    response_model=UserListResponse,
    summary="List all users (admin)",
)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users with pagination and filters. Admin only."""
    service = UserService(db)
    result = await service.get_users(
        page=page, per_page=per_page, search=search, role=role
    )
    return result


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID (admin)",
)
async def get_user(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific user by ID. Admin only."""
    service = UserService(db)
    user = await service.get_user_by_id(user_id)
    return user
