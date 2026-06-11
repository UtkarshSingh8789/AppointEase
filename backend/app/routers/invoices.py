"""Invoices router."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.invoice import InvoiceListResponse, InvoiceResponse
from app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


@router.post(
    "/generate/{appointment_id}",
    response_model=InvoiceResponse,
    status_code=201,
    summary="Generate invoice",
)
async def generate_invoice(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate an invoice for a completed appointment."""
    service = InvoiceService(db)
    invoice = await service.generate_invoice(appointment_id, current_user)
    return invoice


@router.get(
    "/me",
    response_model=InvoiceListResponse,
    summary="List my invoices",
)
async def list_my_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List invoices for the current user (customer or provider)."""
    service = InvoiceService(db)
    result = await service.list_my_invoices(current_user, page, per_page)
    return result


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    summary="Get invoice details",
)
async def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific invoice."""
    service = InvoiceService(db)
    invoice = await service.get_invoice_by_id(invoice_id, current_user)
    return invoice


@router.get(
    "/{invoice_id}/download",
    response_model=InvoiceResponse,
    summary="Download invoice data",
)
async def download_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get invoice data for PDF rendering on frontend."""
    service = InvoiceService(db)
    invoice = await service.get_invoice_by_id(invoice_id, current_user)
    return invoice
