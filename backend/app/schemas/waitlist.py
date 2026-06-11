"""Waitlist Pydantic schemas."""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.waitlist import WaitlistStatus


class WaitlistCreate(BaseModel):
    """Schema for joining the waitlist."""

    provider_id: UUID
    preferred_date: date
    preferred_time_start: Optional[time] = None
    preferred_time_end: Optional[time] = None


class WaitlistResponse(BaseModel):
    """Schema for waitlist entry response."""

    id: UUID
    customer_id: UUID
    provider_id: UUID
    preferred_date: date
    preferred_time_start: Optional[time] = None
    preferred_time_end: Optional[time] = None
    status: WaitlistStatus
    created_at: datetime

    model_config = {"from_attributes": True}
