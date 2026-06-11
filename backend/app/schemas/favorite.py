"""Favorite Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.provider import ProviderResponse


class FavoriteResponse(BaseModel):
    """Schema for favorite response."""

    id: UUID
    customer_id: UUID
    provider_id: UUID
    created_at: datetime
    provider: Optional[ProviderResponse] = None

    model_config = {"from_attributes": True}


class FavoriteListResponse(BaseModel):
    """Schema for paginated favorite list response."""

    favorites: list[FavoriteResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
