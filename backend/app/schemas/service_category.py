"""Service Category Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    """Base category schema."""

    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)


class CategoryCreate(CategoryBase):
    """Schema for creating a category."""

    pass


class CategoryUpdate(BaseModel):
    """Schema for updating a category."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    """Schema for category response."""

    id: UUID
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
