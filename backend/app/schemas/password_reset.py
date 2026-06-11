"""Password Reset Pydantic schemas."""

from pydantic import BaseModel, EmailStr, Field


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for reset password request."""

    token: str
    new_password: str = Field(..., min_length=8, max_length=128)
