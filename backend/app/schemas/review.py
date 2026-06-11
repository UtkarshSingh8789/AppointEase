"""Review Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class ReviewCreate(BaseModel):
    """Schema for creating a review."""

    appointment_id: UUID
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    """Schema for review response."""

    id: UUID
    appointment_id: UUID
    customer_id: UUID
    provider_id: UUID
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    customer: Optional[UserResponse] = None

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    """Schema for paginated review list response."""

    reviews: list[ReviewResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class ProviderRatingSummary(BaseModel):
    """Schema for provider rating summary."""

    average_rating: float
    total_reviews: int
