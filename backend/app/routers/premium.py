"""Premium Features router."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import premium_service

router = APIRouter(prefix="/api/premium", tags=["Premium"])


class SubscriptionRequest(BaseModel):
    plan: str


@router.post("/subscribe")
async def subscribe_premium(
    data: SubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upgrade user to a premium plan."""
    return await premium_service.upgrade_to_premium(db, current_user, data.plan)


@router.post("/cancel")
async def cancel_premium(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel premium subscription."""
    return await premium_service.cancel_premium(db, current_user)


@router.get("/status")
async def get_premium_status(
    current_user: User = Depends(get_current_user),
):
    """Check if the user is premium."""
    return {
        "is_premium": current_user.is_premium,
        "plan": "premium" if current_user.is_premium else "standard",
    }
