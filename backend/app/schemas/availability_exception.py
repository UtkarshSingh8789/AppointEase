"""Availability Exception Pydantic schemas."""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AvailabilityExceptionCreate(BaseModel):
    """Schema for creating an availability exception."""

    date: date
    reason: Optional[str] = Field(None, max_length=255)
    is_blocked: bool = True
    start_time: Optional[time] = None
    end_time: Optional[time] = None

    @field_validator("end_time")
    @classmethod
    def validate_special_hours(cls, v, info):
        """Validate that special hours have both start and end time."""
        is_blocked = info.data.get("is_blocked", True)
        start_time = info.data.get("start_time")
        if not is_blocked:
            if not start_time or not v:
                raise ValueError(
                    "start_time and end_time are required for special hours"
                )
            if v <= start_time:
                raise ValueError("end_time must be after start_time")
        return v


class AvailabilityExceptionResponse(BaseModel):
    """Schema for availability exception response."""

    id: UUID
    provider_id: UUID
    date: date
    reason: Optional[str] = None
    is_blocked: bool
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    created_at: datetime

    model_config = {"from_attributes": True}
