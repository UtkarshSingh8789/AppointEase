"""Availability Pydantic schemas."""

from datetime import datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AvailabilityBase(BaseModel):
    """Base availability schema."""

    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: time
    end_time: time
    slot_duration_minutes: int = Field(default=30, ge=15, le=240)

    @field_validator("end_time")
    @classmethod
    def end_time_after_start(cls, v, info):
        """Validate that end_time is after start_time."""
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v


class AvailabilityCreate(AvailabilityBase):
    """Schema for creating an availability slot."""

    pass


class AvailabilityUpdate(BaseModel):
    """Schema for updating an availability slot."""

    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_duration_minutes: Optional[int] = Field(None, ge=15, le=240)
    is_active: Optional[bool] = None


class AvailabilityResponse(BaseModel):
    """Schema for availability response."""

    id: UUID
    provider_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TimeSlot(BaseModel):
    """Schema for an available time slot."""

    start_time: time
    end_time: time
    is_available: bool = True


class AvailableSlotsResponse(BaseModel):
    """Schema for available slots on a specific date."""

    date: str
    provider_id: UUID
    slots: list[TimeSlot]
