"""Favorites router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.favorite import Favorite
from app.models.provider import ServiceProvider
from app.models.user import User
from app.schemas.favorite import FavoriteListResponse, FavoriteResponse
from app.schemas.provider import ProviderResponse

import math

router = APIRouter(prefix="/api/favorites", tags=["Favorites"])


@router.post(
    "/{provider_id}",
    response_model=FavoriteResponse,
    status_code=201,
    summary="Add provider to favorites",
)
async def add_favorite(
    provider_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a provider to the current user's favorites."""
    # Verify provider exists
    provider_result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.id == provider_id)
    )
    provider = provider_result.scalar_one_or_none()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found",
        )

    # Check if already favorited
    existing_result = await db.execute(
        select(Favorite).where(
            Favorite.customer_id == current_user.id,
            Favorite.provider_id == provider_id,
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Provider already in favorites",
        )

    favorite = Favorite(
        customer_id=current_user.id,
        provider_id=provider_id,
    )

    db.add(favorite)
    await db.flush()
    await db.refresh(favorite)

    # Load provider relationship
    result = await db.execute(
        select(Favorite)
        .options(
            joinedload(Favorite.provider).joinedload(ServiceProvider.user),
            joinedload(Favorite.provider).joinedload(ServiceProvider.category),
        )
        .where(Favorite.id == favorite.id)
    )
    return result.scalar_one()


@router.delete(
    "/{provider_id}",
    status_code=204,
    summary="Remove provider from favorites",
)
async def remove_favorite(
    provider_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a provider from the current user's favorites."""
    result = await db.execute(
        select(Favorite).where(
            Favorite.customer_id == current_user.id,
            Favorite.provider_id == provider_id,
        )
    )
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    await db.delete(favorite)
    await db.flush()


@router.get(
    "",
    response_model=FavoriteListResponse,
    summary="List my favorites",
)
async def list_favorites(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's favorite providers."""
    # Count total
    count_result = await db.execute(
        select(func.count(Favorite.id)).where(
            Favorite.customer_id == current_user.id
        )
    )
    total = count_result.scalar()

    # Get favorites with provider details
    offset = (page - 1) * per_page
    query = (
        select(Favorite)
        .options(
            joinedload(Favorite.provider).joinedload(ServiceProvider.user),
            joinedload(Favorite.provider).joinedload(ServiceProvider.category),
        )
        .where(Favorite.customer_id == current_user.id)
        .offset(offset)
        .limit(per_page)
        .order_by(Favorite.created_at.desc())
    )

    result = await db.execute(query)
    favorites = result.unique().scalars().all()

    return {
        "favorites": favorites,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if total > 0 else 0,
    }
