"""Loyalty Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class LoyaltyAccountResponse(BaseModel):
    """Schema for loyalty account response."""

    id: UUID
    user_id: UUID
    points: int
    tier: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoyaltyTransactionResponse(BaseModel):
    """Schema for loyalty transaction response."""

    id: UUID
    account_id: UUID
    points: int
    type: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoyaltyTransactionListResponse(BaseModel):
    """Schema for paginated loyalty transaction list."""

    transactions: List[LoyaltyTransactionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class LoyaltyRedeemRequest(BaseModel):
    """Schema for redeeming loyalty points."""

    points: int = Field(..., gt=0)
