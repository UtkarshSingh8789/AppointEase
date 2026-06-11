"""Invoice Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class InvoiceResponse(BaseModel):
    """Schema for invoice response."""

    id: UUID
    appointment_id: UUID
    invoice_number: str
    customer_id: UUID
    provider_id: UUID
    amount: float
    gst_rate: float
    gst_amount: float
    total_amount: float
    status: str
    generated_at: datetime
    customer_name: Optional[str] = None
    provider_name: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_start_time: Optional[str] = None
    appointment_end_time: Optional[str] = None

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    """Schema for paginated invoice list."""

    invoices: List[InvoiceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
