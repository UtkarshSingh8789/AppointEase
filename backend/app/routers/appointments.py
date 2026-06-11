"""Appointments router."""

import csv
import io
from datetime import date, datetime
from urllib.parse import urlencode
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.appointment import Appointment, AppointmentStatus
from app.models.comment import AppointmentComment
from app.models.provider import ServiceProvider
from app.models.user import User, UserRole
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentReschedule,
    AppointmentResponse,
    AppointmentStatusUpdate,
)
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.appointment_service import AppointmentService

from fastapi import HTTPException, status
from sqlalchemy import select

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=201,
    summary="Book an appointment",
)
async def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Book a new appointment with a service provider."""
    # Validate that the appointment date is not in the past
    if data.appointment_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Appointment date cannot be in the past.",
        )
    service = AppointmentService(db)
    appointment = await service.create_appointment(current_user, data)
    return appointment


@router.get(
    "/stats",
    summary="Get appointment statistics",
)
async def get_appointment_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get appointment statistics for the current user."""
    service = AppointmentService(db)
    stats = await service.get_appointment_stats(current_user)
    return stats


@router.get(
    "/export",
    summary="Export appointments as CSV",
)
async def export_appointments(
    format: str = Query("csv", description="Export format (csv)"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export appointments as CSV."""
    query = select(Appointment).options(
        joinedload(Appointment.customer),
        joinedload(Appointment.provider).joinedload(ServiceProvider.user),
    )

    # Filter by role
    if current_user.role == UserRole.CUSTOMER:
        query = query.where(Appointment.customer_id == current_user.id)
    elif current_user.role == UserRole.PROVIDER:
        provider_result = await db.execute(
            select(ServiceProvider).where(ServiceProvider.user_id == current_user.id)
        )
        provider = provider_result.scalar_one_or_none()
        if provider:
            query = query.where(Appointment.provider_id == provider.id)
        else:
            return PlainTextResponse("", media_type="text/csv")

    if date_from:
        query = query.where(Appointment.appointment_date >= date_from)
    if date_to:
        query = query.where(Appointment.appointment_date <= date_to)

    query = query.order_by(Appointment.appointment_date.desc())

    result = await db.execute(query)
    appointments = result.unique().scalars().all()

    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Date", "Start Time", "End Time", "Status",
        "Customer", "Provider", "Notes", "Created At"
    ])

    for appt in appointments:
        customer_name = appt.customer.full_name if appt.customer else ""
        provider_name = appt.provider.user.full_name if appt.provider and appt.provider.user else ""
        writer.writerow([
            str(appt.id),
            appt.appointment_date.isoformat(),
            appt.start_time.isoformat(),
            appt.end_time.isoformat(),
            appt.status.value,
            customer_name,
            provider_name,
            appt.notes or "",
            appt.created_at.isoformat() if appt.created_at else "",
        ])

    csv_content = output.getvalue()
    return PlainTextResponse(csv_content, media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=appointments.csv"
    })


@router.get(
    "",
    response_model=AppointmentListResponse,
    summary="List appointments",
)
async def list_appointments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Comma-separated status values, e.g. 'pending,confirmed'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List appointments filtered by the current user's role. Supports comma-separated status values."""
    # Parse comma-separated status values
    status_filter = None
    if status:
        status_values = [s.strip() for s in status.split(",") if s.strip()]
        # Validate each status value
        valid_statuses = []
        for sv in status_values:
            try:
                valid_statuses.append(AppointmentStatus(sv))
            except ValueError:
                pass
        if valid_statuses:
            status_filter = valid_statuses

    service = AppointmentService(db)
    result = await service.list_appointments(
        user=current_user,
        page=page,
        per_page=per_page,
        status_filter=status_filter,
    )
    return result


@router.get(
    "/upcoming",
    response_model=List[AppointmentResponse],
    summary="Get upcoming appointments",
)
async def get_upcoming_appointments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get upcoming appointments for the current user."""
    service = AppointmentService(db)
    appointments = await service.get_upcoming_appointments(current_user)
    return appointments


@router.get(
    "/history",
    response_model=List[AppointmentResponse],
    summary="Get appointment history",
)
async def get_appointment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get past appointments for the current user."""
    service = AppointmentService(db)
    appointments = await service.get_appointment_history(current_user)
    return appointments


@router.get(
    "/{appointment_id}/ical",
    summary="Get appointment as iCal",
)
async def get_appointment_ical(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get appointment as iCal (.ics) format."""
    service = AppointmentService(db)
    appointment = await service.get_appointment_by_id(appointment_id, current_user)

    # Generate iCal content
    start_dt = datetime.combine(appointment.appointment_date, appointment.start_time)
    end_dt = datetime.combine(appointment.appointment_date, appointment.end_time)

    provider_name = ""
    if appointment.provider and appointment.provider.user:
        provider_name = appointment.provider.user.full_name

    ical_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Appointment Scheduling Platform//EN
BEGIN:VEVENT
UID:{appointment.id}@appointment-platform
DTSTART:{start_dt.strftime('%Y%m%dT%H%M%S')}
DTEND:{end_dt.strftime('%Y%m%dT%H%M%S')}
SUMMARY:Appointment with {provider_name}
DESCRIPTION:{appointment.notes or 'No notes'}
STATUS:{appointment.status.value.upper()}
END:VEVENT
END:VCALENDAR"""

    return PlainTextResponse(
        ical_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=appointment-{appointment_id}.ics"},
    )


@router.get(
    "/{appointment_id}/google-calendar",
    summary="Get Google Calendar link",
)
async def get_google_calendar_link(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a Google Calendar link for the appointment."""
    service = AppointmentService(db)
    appointment = await service.get_appointment_by_id(appointment_id, current_user)

    start_dt = datetime.combine(appointment.appointment_date, appointment.start_time)
    end_dt = datetime.combine(appointment.appointment_date, appointment.end_time)
    provider_name = appointment.provider.user.full_name if appointment.provider and appointment.provider.user else "Provider"
    customer_name = appointment.customer.full_name if appointment.customer else "Customer"

    params = urlencode(
        {
            "action": "TEMPLATE",
            "text": f"Appointment with {provider_name}",
            "details": (
                f"Appointment between {customer_name} and {provider_name}. "
                f"Notes: {appointment.notes or 'No notes'}"
            ),
            "dates": f"{start_dt.strftime('%Y%m%dT%H%M%S')}/{end_dt.strftime('%Y%m%dT%H%M%S')}",
        }
    )
    return {"url": f"https://calendar.google.com/calendar/render?{params}"}


@router.get(
    "/{appointment_id}",
    response_model=AppointmentResponse,
    summary="Get appointment details",
)
async def get_appointment(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific appointment."""
    service = AppointmentService(db)
    appointment = await service.get_appointment_by_id(appointment_id, current_user)
    return appointment


@router.put(
    "/{appointment_id}/status",
    response_model=AppointmentResponse,
    summary="Update appointment status",
)
async def update_appointment_status(
    appointment_id: UUID,
    data: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the status of an appointment (confirm, reject, complete, cancel)."""
    # Bug #30: Validate ownership for customer cancellations before delegating to service
    from app.models.appointment import AppointmentStatus as AptStatus
    if current_user.role == UserRole.CUSTOMER and data.status == AptStatus.CANCELLED:
        owner_check = await db.execute(
            select(Appointment).where(
                Appointment.id == appointment_id,
                Appointment.customer_id == current_user.id,
            )
        )
        if not owner_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own appointments.",
            )
    service = AppointmentService(db)
    appointment = await service.update_status(appointment_id, current_user, data)
    return appointment


@router.put(
    "/{appointment_id}/reschedule",
    response_model=AppointmentResponse,
    summary="Reschedule appointment",
)
async def reschedule_appointment(
    appointment_id: UUID,
    data: AppointmentReschedule,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reschedule an appointment to a new date and time."""
    service = AppointmentService(db)
    appointment = await service.reschedule_appointment(
        appointment_id, current_user, data
    )
    return appointment


# --- Appointment Comments ---


@router.post(
    "/{appointment_id}/comments",
    response_model=CommentResponse,
    status_code=201,
    summary="Add comment to appointment",
)
async def add_comment(
    appointment_id: UUID,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to an appointment."""
    # Verify appointment exists and user has access
    # Bug 3 fix: For providers, look up by user_id first
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    # Access control
    if current_user.role == UserRole.CUSTOMER:
        if appointment.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
    elif current_user.role == UserRole.PROVIDER:
        # Look up provider by user_id first, then verify access
        provider_result = await db.execute(
            select(ServiceProvider).where(ServiceProvider.user_id == current_user.id)
        )
        provider = provider_result.scalar_one_or_none()
        if not provider or appointment.provider_id != provider.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    # Only providers can create internal comments
    if data.is_internal and current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only providers can create internal comments",
        )

    comment = AppointmentComment(
        appointment_id=appointment_id,
        user_id=current_user.id,
        content=data.content,
        is_internal=data.is_internal,
    )

    db.add(comment)
    await db.flush()
    await db.refresh(comment)

    # Load user relationship
    comment_result = await db.execute(
        select(AppointmentComment)
        .options(joinedload(AppointmentComment.user))
        .where(AppointmentComment.id == comment.id)
    )
    return comment_result.scalar_one()


@router.get(
    "/{appointment_id}/comments",
    response_model=List[CommentResponse],
    summary="List appointment comments",
)
async def list_comments(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List comments for an appointment. Internal comments only visible to providers."""
    # Verify appointment exists and user has access
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    # Access control - Bug 3 fix: look up provider by user_id
    if current_user.role == UserRole.CUSTOMER:
        if appointment.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
    elif current_user.role == UserRole.PROVIDER:
        provider_result = await db.execute(
            select(ServiceProvider).where(ServiceProvider.user_id == current_user.id)
        )
        provider = provider_result.scalar_one_or_none()
        if not provider or appointment.provider_id != provider.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    query = (
        select(AppointmentComment)
        .options(joinedload(AppointmentComment.user))
        .where(AppointmentComment.appointment_id == appointment_id)
    )

    # Filter internal comments for non-providers
    if current_user.role != UserRole.PROVIDER and current_user.role != UserRole.ADMIN:
        query = query.where(AppointmentComment.is_internal == False)

    query = query.order_by(AppointmentComment.created_at.asc())

    comments_result = await db.execute(query)
    comments = comments_result.unique().scalars().all()
    return comments
