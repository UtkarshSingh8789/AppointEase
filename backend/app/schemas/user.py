"""User-related Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(..., min_length=8, max_length=128)
    role: Optional[UserRole] = Field(None, description="Role: customer or provider. Admin cannot self-register.")

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        """Require a strong password for new accounts."""
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.islower() for c in value):
            raise ValueError("Password must include at least one lowercase letter")
        if not any(c.isupper() for c in value):
            raise ValueError("Password must include at least one uppercase letter")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must include at least one number")
        if not any(not c.isalnum() for c in value):
            raise ValueError("Password must include at least one special character")
        return value


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=65535)


class PasswordChange(BaseModel):
    """Schema for changing password."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        """Require a strong password when changing password."""
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.islower() for c in value):
            raise ValueError("Password must include at least one lowercase letter")
        if not any(c.isupper() for c in value):
            raise ValueError("Password must include at least one uppercase letter")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must include at least one number")
        if not any(not c.isalnum() for c in value):
            raise ValueError("Password must include at least one special character")
        return value


class UserResponse(BaseModel):
    """Schema for user response."""

    id: UUID
    email: str
    full_name: str
    phone_number: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    is_active: bool
    is_super_admin: bool = False
    provider_id: Optional[UUID] = None
    provider_is_verified: Optional[bool] = None
    provider_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """Schema for paginated user list response."""

    users: list[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str
