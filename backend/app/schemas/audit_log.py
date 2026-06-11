"""Audit Log Pydantic schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    """Schema for audit log response."""

    id: UUID
    user_id: Optional[UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    """Schema for paginated audit log list response."""

    logs: list[AuditLogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
