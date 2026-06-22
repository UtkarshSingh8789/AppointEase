"""Password Reset Pydantic schemas."""

from pydantic import BaseModel, EmailStr, Field, field_validator


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for reset password request."""

    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        """Require a strong password when resetting."""
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
