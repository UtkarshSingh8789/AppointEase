"""Premium Service."""

from typing import Dict, Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def upgrade_to_premium(db: AsyncSession, user: User, plan: str) -> Dict[str, Any]:
    """Upgrade user to a premium plan."""
    if user.is_premium:
        return {"message": "User is already premium", "status": "success"}

    # Mock payment processing
    # In a real app, we would process a Stripe payment here.

    user.is_premium = True
    await db.commit()
    await db.refresh(user)

    return {"message": "Upgraded to premium successfully", "status": "success"}


async def cancel_premium(db: AsyncSession, user: User) -> Dict[str, Any]:
    """Cancel premium subscription."""
    if not user.is_premium:
        return {"message": "User is not premium", "status": "success"}

    user.is_premium = False
    await db.commit()
    await db.refresh(user)

    return {"message": "Cancelled premium successfully", "status": "success"}
