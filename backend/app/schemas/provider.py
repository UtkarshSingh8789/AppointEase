"""Service Provider Pydantic schemas."""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.service_category import CategoryResponse
from app.schemas.user import UserResponse


class ProviderBase(BaseModel):
    """Base provider schema."""

    specialization: str = Field(..., min_length=2, max_length=255)
    category_id: UUID
    experience_years: int = Field(default=0, ge=0)
    location: str = Field(..., min_length=2, max_length=255)
    profile_description: Optional[str] = None
    hourly_rate: Optional[float] = Field(None, ge=0)


class ProviderCreate(ProviderBase):
    """Schema for registering as a provider."""

    pincode: Optional[str] = Field(None, max_length=6)
    area: Optional[str] = Field(None, max_length=100)


class ProviderUpdate(BaseModel):
    """Schema for updating provider profile."""

    specialization: Optional[str] = Field(None, min_length=2, max_length=255)
    category_id: Optional[UUID] = None
    experience_years: Optional[int] = Field(None, ge=0)
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    profile_description: Optional[str] = None
    hourly_rate: Optional[float] = Field(None, ge=0)
    pincode: Optional[str] = Field(None, max_length=6)
    area: Optional[str] = Field(None, max_length=100)


class ProviderResponse(BaseModel):
    """Schema for provider response."""

    id: UUID
    user_id: UUID
    specialization: str
    category_id: UUID
    experience_years: int
    location: str
    profile_description: Optional[str] = None
    hourly_rate: Optional[float] = None
    rating: float
    total_reviews: int
    is_verified: bool
    pincode: Optional[str] = None
    area: Optional[str] = None
    response_time_hours: Optional[float] = None
    vacation_start: Optional[date] = None
    vacation_end: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    user: Optional[UserResponse] = None
    category: Optional[CategoryResponse] = None

    model_config = {"from_attributes": True}


class ProviderListResponse(BaseModel):
    """Schema for paginated provider list response."""

    providers: list[ProviderResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class ProviderStats(BaseModel):
    """Schema for provider statistics."""

    total_appointments: int
    completed_appointments: int
    pending_appointments: int
    cancelled_appointments: int
    rating: float
    total_reviews: int


class OnboardingDocument(BaseModel):
    """Schema for a provider onboarding document."""

    name: str
    path: str
    content_type: Optional[str] = None
    size: Optional[int] = None


class ProviderApprovalResponse(BaseModel):
    """Schema for provider approvals with onboarding metadata."""

    provider: ProviderResponse
    avatar: Optional[OnboardingDocument] = None
    documents: list[OnboardingDocument] = Field(default_factory=list)
    application: Optional[dict] = None
    summary: Optional[str] = None
    review_status: str = "pending"  # pending | approved | rejected
