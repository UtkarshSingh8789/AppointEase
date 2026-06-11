"""Invoice service with business logic."""

import math
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus
from app.models.invoice import Invoice
from app.models.provider import ServiceProvider
from app.models.user import User, UserRole


class InvoiceService:
    """Service handling invoice operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_invoice(
        self, appointment_id: UUID, user: User
    ) -> Invoice:
        """Generate an invoice for a completed appointment."""
        # Get appointment
        appt_result = await self.db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        appointment = appt_result.scalar_one_or_none()

        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

        if appointment.status != AppointmentStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice can only be generated for completed appointments",
            )

        # Check if invoice already exists
        existing_result = await self.db.execute(
            select(Invoice).where(Invoice.appointment_id == appointment_id)
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Invoice already exists for this appointment",
            )

        # Access control
        provider_result = await self.db.execute(
            select(ServiceProvider).where(
                ServiceProvider.id == appointment.provider_id
            )
        )
        provider = provider_result.scalar_one_or_none()

        if user.role == UserRole.PROVIDER:
            if not provider or provider.user_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )
        elif user.role == UserRole.CUSTOMER:
            if appointment.customer_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )

        # Calculate amounts from the booked appointment so invoice matches payment.
        amount = appointment.base_amount or provider.hourly_rate or 0.0
        gst_rate = 18.0
        gst_amount = appointment.gst_amount or round(amount * gst_rate / 100, 2)
        total_amount = appointment.total_amount or round(amount + gst_amount - (appointment.discount_amount or 0.0), 2)

        # Generate invoice number
        invoice_number = await self._generate_invoice_number()

        invoice = Invoice(
            appointment_id=appointment_id,
            invoice_number=invoice_number,
            customer_id=appointment.customer_id,
            provider_id=appointment.provider_id,
            amount=amount,
            gst_rate=gst_rate,
            gst_amount=gst_amount,
            total_amount=total_amount,
            status="generated",
        )

        self.db.add(invoice)
        await self.db.flush()
        await self.db.refresh(invoice)
        return await self._attach_display_fields(invoice)

    async def get_invoice_by_id(self, invoice_id: UUID, user: User) -> Invoice:
        """Get an invoice by ID with access control."""
        result = await self.db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found",
            )

        # Access control
        if user.role == UserRole.CUSTOMER and invoice.customer_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        elif user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider or invoice.provider_id != provider.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )

        return await self._attach_display_fields(invoice)

    async def list_my_invoices(
        self, user: User, page: int = 1, per_page: int = 20
    ) -> dict:
        """List invoices for the current user."""
        if user.role == UserRole.CUSTOMER:
            filter_clause = Invoice.customer_id == user.id
        elif user.role == UserRole.PROVIDER:
            provider_result = await self.db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider:
                return {
                    "invoices": [],
                    "total": 0,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": 0,
                }
            filter_clause = Invoice.provider_id == provider.id
        else:
            # Admin sees all
            filter_clause = True

        count_result = await self.db.execute(
            select(func.count(Invoice.id)).where(filter_clause)
        )
        total = count_result.scalar()

        offset = (page - 1) * per_page
        result = await self.db.execute(
            select(Invoice)
            .where(filter_clause)
            .order_by(Invoice.generated_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        invoices = result.scalars().all()

        invoices = [await self._attach_display_fields(invoice) for invoice in invoices]

        return {
            "invoices": invoices,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 0,
        }

    async def _generate_invoice_number(self) -> str:
        """Generate a unique invoice number in format INV-YYYY-NNNNN."""
        year = datetime.now(timezone.utc).year
        prefix = f"INV-{year}-"

        # Get the latest invoice number for this year
        result = await self.db.execute(
            select(Invoice)
            .where(Invoice.invoice_number.like(f"{prefix}%"))
            .order_by(Invoice.generated_at.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()

        if latest:
            # Extract the sequence number and increment
            seq = int(latest.invoice_number.split("-")[-1]) + 1
        else:
            seq = 1

        return f"{prefix}{seq:05d}"

    async def _attach_display_fields(self, invoice: Invoice) -> Invoice:
        """Attach human-friendly appointment, customer, and provider details to an invoice."""
        appointment_result = await self.db.execute(
            select(Appointment)
            .options(selectinload(Appointment.customer))
            .where(Appointment.id == invoice.appointment_id)
        )
        appointment = appointment_result.scalar_one_or_none()

        provider_result = await self.db.execute(
            select(ServiceProvider)
            .options(selectinload(ServiceProvider.user))
            .where(ServiceProvider.id == invoice.provider_id)
        )
        provider = provider_result.scalar_one_or_none()

        customer_name = None
        if appointment and appointment.customer:
            customer_name = appointment.customer.full_name
        else:
            customer_result = await self.db.execute(
                select(User).where(User.id == invoice.customer_id)
            )
            customer = customer_result.scalar_one_or_none()
            customer_name = customer.full_name if customer else None

        provider_name = provider.user.full_name if provider and provider.user else None

        setattr(invoice, "customer_name", customer_name)
        setattr(invoice, "provider_name", provider_name)
        setattr(invoice, "appointment_date", str(appointment.appointment_date) if appointment else None)
        setattr(invoice, "appointment_start_time", appointment.start_time.isoformat() if appointment else None)
        setattr(invoice, "appointment_end_time", appointment.end_time.isoformat() if appointment else None)
        return invoice
