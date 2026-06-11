"""Categories router (public read access)."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.service_category import ServiceCategory
from app.schemas.service_category import CategoryResponse

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get(
    "",
    response_model=List[CategoryResponse],
    summary="List all service categories",
)
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all active service categories. Public endpoint."""
    result = await db.execute(
        select(ServiceCategory)
        .where(ServiceCategory.is_active == True)
        .order_by(ServiceCategory.name)
    )
    categories = result.scalars().all()
    return categories
