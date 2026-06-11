"""Appointment Pydantic schemas."""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.appointment import AppointmentStatus
from app.schemas.provider import ProviderResponse
from app.schemas.user import UserResponse


class AppointmentBase(BaseModel):
    """Base appointment schema."""

    provider_id: UUID
    appointment_date: date
    start_time: time
    notes: Optional[str] = None
    discount_amount: Optional[float] = Field(0, ge=0)

    @field_validator("appointment_date")
    @classmethod
    def date_must_be_future(cls, v):
        """Validate that appointment date is not in the past."""
        from datetime import date as date_type

        if v < date_type.today():
            raise ValueError("Appointment date cannot be in the past")
        return v


class AppointmentCreate(AppointmentBase):
    """Schema for creating an appointment."""

    pass


class AppointmentStatusUpdate(BaseModel):
    """Schema for updating appointment status."""

    status: AppointmentStatus
    cancellation_reason: Optional[str] = Field(None, max_length=500)


class AppointmentReschedule(BaseModel):
    """Schema for rescheduling an appointment."""

    appointment_date: date
    start_time: time

    @field_validator("appointment_date")
    @classmethod
    def date_must_be_future(cls, v):
        """Validate that new appointment date is not in the past."""
        from datetime import date as date_type

        if v < date_type.today():
            raise ValueError("Appointment date cannot be in the past")
        return v


class AppointmentResponse(BaseModel):
    """Schema for appointment response."""

    id: UUID
    customer_id: UUID
    provider_id: UUID
    appointment_date: date
    start_time: time
    end_time: time
    base_amount: float = 0
    gst_amount: float = 0
    discount_amount: float = 0
    total_amount: float = 0
    cancellation_fee: float = 50
    status: AppointmentStatus
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer: Optional[UserResponse] = None
    provider: Optional[ProviderResponse] = None

    model_config = {"from_attributes": True}


class AppointmentListResponse(BaseModel):
    """Schema for paginated appointment list response."""

    appointments: list[AppointmentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
