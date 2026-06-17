"""Integrations service."""

from typing import List, Dict, Any
import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import Integration
from app.models.user import User

async def get_integrations(db: AsyncSession, user_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Get all integrations for a user."""
    result = await db.execute(
        select(Integration).where(Integration.provider_id == user_id)
    )
    integrations = result.scalars().all()
    
    return [
        {
            "id": str(i.id),
            "provider_name": i.provider_name,
            "is_active": i.is_active,
            "metadata_json": i.metadata_json,
        }
        for i in integrations
    ]

async def toggle_integration(db: AsyncSession, user_id: uuid.UUID, provider_name: str, enable: bool) -> Dict[str, Any]:
    """Toggle an integration for a user."""
    result = await db.execute(
        select(Integration).where(
            Integration.provider_id == user_id,
            Integration.provider_name == provider_name
        )
    )
    integration = result.scalar_one_or_none()

    if enable:
        if integration:
            integration.is_active = True
        else:
            integration = Integration(
                provider_id=user_id,
                provider_name=provider_name,
                is_active=True,
            )
            db.add(integration)
    else:
        if integration:
            integration.is_active = False

    await db.commit()
    return {"message": "Integration updated successfully"}
