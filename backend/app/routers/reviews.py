"""Reviews router."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewListResponse, ReviewResponse
from app.services.review_service import ReviewService

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.post(
    "",
    response_model=ReviewResponse,
    status_code=201,
    summary="Create a review",
)
async def create_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a review for a completed appointment. Only the customer can review."""
    service = ReviewService(db)
    review = await service.create_review(current_user, data)
    return review


@router.get(
    "/provider/{provider_id}",
    response_model=ReviewListResponse,
    summary="List reviews for a provider",
)
async def get_provider_reviews(
    provider_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated reviews for a specific provider."""
    service = ReviewService(db)
    result = await service.get_provider_reviews(provider_id, page=page, size=size)
    return result


@router.get(
    "/me",
    response_model=ReviewListResponse,
    summary="List my reviews",
)
async def get_my_reviews(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get reviews written by the current user."""
    service = ReviewService(db)
    result = await service.get_my_reviews(current_user.id, page=page, size=size)
    return result


@router.delete(
    "/{review_id}",
    status_code=204,
    summary="Delete a review",
)
async def delete_review(
    review_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a review. Only the customer who wrote it can delete."""
    service = ReviewService(db)
    await service.delete_review(review_id, current_user.id)
