"""Integrations Router."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import integrations_service

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


class ToggleIntegrationRequest(BaseModel):
    provider_name: str
    enable: bool


@router.get("/")
async def get_integrations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all integrations for the current user."""
    return await integrations_service.get_integrations(db, current_user.id)


@router.post("/toggle")
async def toggle_integration(
    data: ToggleIntegrationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a specific integration on or off."""
    return await integrations_service.toggle_integration(db, current_user.id, data.provider_name, data.enable)
