"""MCP server exposing AppointEase data as safe AI tools.

This server is intentionally read-only. It lets MCP clients inspect providers,
availability, appointments, and platform summaries without giving the model
direct write access to the booking system.
"""

from __future__ import annotations

import os
import uuid
from datetime import date
from typing import Any

from mcp.server.fastmcp import FastMCP
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.core.database import async_session_maker
from app.models import (
    Appointment,
    AppointmentStatus,
    Invoice,
    LoyaltyAccount,
    Review,
    ServiceCategory,
    ServiceProvider,
    User,
    UserRole,
)
from app.services.ai_chat_service import AIChatRetrievalService
from app.services.availability_service import AvailabilityService


def _make_mcp() -> FastMCP:
    """Create the AppointEase MCP server with HTTP-friendly settings."""
    return FastMCP(
        "AppointEase MCP",
        instructions=(
            "Read-only tools for the AppointEase appointment scheduling platform. "
            "Use these tools to retrieve real provider, availability, customer, "
            "provider, and admin context before answering scheduling questions."
        ),
        host=os.getenv("MCP_HOST", "0.0.0.0"),
        port=int(os.getenv("MCP_PORT", "8001")),
        stateless_http=True,
        json_response=True,
        streamable_http_path="/mcp",
    )


mcp = _make_mcp()

PUBLIC_TOOLS: list[str] = [
    "health_check",
    "list_categories",
    "search_providers",
    "get_provider_details",
    "get_provider_availability",
    "search_project_knowledge",
]

CUSTOMER_TOOLS: list[str] = PUBLIC_TOOLS + [
    "get_customer_summary",
    "get_recent_appointments",
]

PROVIDER_TOOLS: list[str] = PUBLIC_TOOLS + [
    "get_provider_dashboard",
    "get_recent_appointments",
]

ADMIN_TOOLS: list[str] = CUSTOMER_TOOLS + [
    "get_platform_overview",
    "get_admin_dashboard",
    "admin_search_user",
    "admin_get_user_detail",
]

TOOL_CATALOG: dict[str, dict[str, Any]] = {
    "health_check": {
        "scope": "public",
        "description": "Check database connectivity and server readiness.",
    },
    "list_categories": {
        "scope": "public",
        "description": "List active service categories available on the platform.",
    },
    "search_providers": {
        "scope": "public",
        "description": "Search providers by name, specialization, category, or location.",
    },
    "get_provider_details": {
        "scope": "public",
        "description": "Get full public details for one provider by UUID.",
    },
    "get_provider_availability": {
        "scope": "public",
        "description": "Return available and unavailable slots for a provider on a date.",
    },
    "search_project_knowledge": {
        "scope": "public",
        "description": "Search project documentation and product knowledge.",
    },
    "get_customer_summary": {
        "scope": "customer",
        "description": "Summarize a customer's appointments, invoices, and loyalty status.",
    },
    "get_recent_appointments": {
        "scope": "customer",
        "description": "List recent appointments for a customer or provider user email.",
    },
    "get_provider_dashboard": {
        "scope": "provider",
        "description": "Full provider dashboard: stats, revenue, ratings, recent schedule, pending requests.",
    },
    "get_platform_overview": {
        "scope": "admin",
        "description": "Return platform-wide business metrics and operational totals.",
    },
    "get_admin_dashboard": {
        "scope": "admin",
        "description": "Advanced admin dashboard: top providers, category breakdown, pending approvals, revenue.",
    },
    "admin_search_user": {
        "scope": "admin",
        "description": "Search any user or provider by name or email fragment.",
    },
    "admin_get_user_detail": {
        "scope": "admin",
        "description": "Deep detail for one user or provider by exact name or email.",
    },
}


def _uuid(value: str) -> uuid.UUID:
    """Parse a UUID string and raise a clear MCP tool error."""
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise ValueError(f"Invalid UUID: {value}") from exc


def _date(value: str) -> date:
    """Parse an ISO date string and raise a clear MCP tool error."""
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"Invalid date, expected YYYY-MM-DD: {value}") from exc


def tools_for_role(role: str | None) -> list[str]:
    """Return the MCP tools that should be visible for a given app role."""
    normalized = (role or "").lower()
    if normalized == UserRole.ADMIN.value:
        return ADMIN_TOOLS
    if normalized == UserRole.PROVIDER.value:
        return PROVIDER_TOOLS
    if normalized == UserRole.CUSTOMER.value:
        return CUSTOMER_TOOLS
    return PUBLIC_TOOLS


def manifest_for_role(role: str | None) -> dict[str, Any]:
    """Return a discoverable tool manifest for a given role."""
    visible_tools = tools_for_role(role)
    return {
        "server": "AppointEase MCP",
        "transport": os.getenv("MCP_TRANSPORT", "streamable-http"),
        "endpoint": "/mcp",
        "role": (role or "guest").lower(),
        "tool_count": len(visible_tools),
        "tools": [
            {
                "name": name,
                "scope": TOOL_CATALOG[name]["scope"],
                "description": TOOL_CATALOG[name]["description"],
            }
            for name in visible_tools
            if name in TOOL_CATALOG
        ],
    }


def _provider_to_dict(provider: ServiceProvider) -> dict[str, Any]:
    """Serialize a provider profile with public discovery fields."""
    return {
        "id": str(provider.id),
        "name": provider.user.full_name if provider.user else None,
        "email": provider.user.email if provider.user else None,
        "specialization": provider.specialization,
        "category": provider.category.name if provider.category else None,
        "location": provider.location,
        "area": provider.area,
        "pincode": provider.pincode,
        "experience_years": provider.experience_years,
        "hourly_rate": provider.hourly_rate,
        "rating": provider.rating,
        "total_reviews": provider.total_reviews,
        "is_verified": provider.is_verified,
        "profile_description": provider.profile_description,
    }


def _appointment_to_dict(appointment: Appointment) -> dict[str, Any]:
    """Serialize appointment data for read-only MCP responses."""
    provider = appointment.provider
    customer = appointment.customer
    return {
        "id": str(appointment.id),
        "customer_id": str(appointment.customer_id),
        "customer_name": customer.full_name if customer else None,
        "provider_id": str(appointment.provider_id),
        "provider_name": provider.user.full_name if provider and provider.user else None,
        "provider_specialization": provider.specialization if provider else None,
        "appointment_date": appointment.appointment_date.isoformat(),
        "start_time": appointment.start_time.isoformat(timespec="minutes"),
        "end_time": appointment.end_time.isoformat(timespec="minutes"),
        "status": appointment.status.value,
        "total_amount": appointment.total_amount,
        "notes": appointment.notes,
    }


def _customer_appointment_to_dict(appointment: Appointment) -> dict[str, Any]:
    """Serialize a customer-facing appointment summary."""
    provider = appointment.provider
    return {
        "id": str(appointment.id),
        "provider_name": provider.user.full_name if provider and provider.user else None,
        "provider_specialization": provider.specialization if provider else None,
        "provider_location": provider.location if provider else None,
        "appointment_date": appointment.appointment_date.isoformat(),
        "start_time": appointment.start_time.isoformat(timespec="minutes"),
        "end_time": appointment.end_time.isoformat(timespec="minutes"),
        "status": appointment.status.value,
        "total_amount": appointment.total_amount,
    }


def _provider_appointment_to_dict(appointment: Appointment) -> dict[str, Any]:
    """Serialize a provider-facing appointment summary."""
    customer = appointment.customer
    return {
        "id": str(appointment.id),
        "customer_name": customer.full_name if customer else None,
        "customer_email": customer.email if customer else None,
        "appointment_date": appointment.appointment_date.isoformat(),
        "start_time": appointment.start_time.isoformat(timespec="minutes"),
        "end_time": appointment.end_time.isoformat(timespec="minutes"),
        "status": appointment.status.value,
        "total_amount": appointment.total_amount,
        "notes": appointment.notes,
    }


@mcp.tool()
async def health_check() -> dict[str, Any]:
    """Check that the MCP server can reach the AppointEase database."""
    async with async_session_maker() as db:
        result = await db.execute(select(func.count(User.id)))
        return {
            "status": "ok",
            "database": "connected",
            "user_count": result.scalar() or 0,
        }


@mcp.tool()
async def get_current_user_context(email: str) -> dict[str, Any]:
    """Return role-aware live context for a signed-in user by email."""
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            return {"error": "User not found", "email": email}

        payload: dict[str, Any] = {
            "user": {
                "id": str(user.id),
                "name": user.full_name,
                "email": user.email,
                "role": user.role.value,
            }
        }

        if user.role == UserRole.CUSTOMER:
            app_result = await db.execute(
                select(Appointment)
                .options(joinedload(Appointment.provider).joinedload(ServiceProvider.user))
                .where(Appointment.customer_id == user.id)
                .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
                .limit(5)
            )
            appointments = app_result.unique().scalars().all()
            payload["appointments"] = [_customer_appointment_to_dict(item) for item in appointments]

            invoice_result = await db.execute(
                select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.total_amount), 0))
                .where(Invoice.customer_id == user.id)
            )
            invoice_count, invoice_total = invoice_result.one()
            loyalty_result = await db.execute(select(LoyaltyAccount).where(LoyaltyAccount.user_id == user.id))
            loyalty = loyalty_result.scalar_one_or_none()
            payload["summary"] = {
                "appointment_count": len(appointments),
                "invoice_count": invoice_count or 0,
                "invoice_total": float(invoice_total or 0),
                "loyalty_points": loyalty.points if loyalty else 0,
                "loyalty_tier": loyalty.tier if loyalty else "bronze",
            }

        elif user.role == UserRole.PROVIDER:
            provider_result = await db.execute(select(ServiceProvider).where(ServiceProvider.user_id == user.id))
            provider = provider_result.scalar_one_or_none()
            if not provider:
                return {"error": "Provider profile not found", "email": email}

            app_result = await db.execute(
                select(Appointment)
                .options(joinedload(Appointment.customer))
                .where(Appointment.provider_id == provider.id)
                .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
                .limit(5)
            )
            appointments = app_result.unique().scalars().all()
            payload["provider"] = {
                "id": str(provider.id),
                "specialization": provider.specialization,
                "location": provider.location,
                "rating": provider.rating,
                "review_count": provider.total_reviews,
                "verified": provider.is_verified,
            }
            payload["appointments"] = [_provider_appointment_to_dict(item) for item in appointments]

        else:
            payload["summary"] = await get_platform_overview()

        return payload


@mcp.tool()
async def list_categories(limit: int = 30) -> dict[str, Any]:
    """List active service categories available on the platform."""
    async with async_session_maker() as db:
        result = await db.execute(
            select(ServiceCategory)
            .where(ServiceCategory.is_active.is_(True))
            .order_by(ServiceCategory.name)
            .limit(max(1, min(limit, 100)))
        )
        categories = result.scalars().all()
        return {
            "categories": [
                {
                    "id": str(category.id),
                    "name": category.name,
                    "description": category.description,
                    "icon": category.icon,
                }
                for category in categories
            ]
        }


@mcp.tool()
async def search_providers(
    query: str = "",
    category: str = "",
    location: str = "",
    verified_only: bool = True,
    limit: int = 5,
) -> dict[str, Any]:
    """Search providers by name, specialization, category, or location."""
    async with async_session_maker() as db:
        stmt = (
            select(ServiceProvider)
            .options(
                joinedload(ServiceProvider.user),
                joinedload(ServiceProvider.category),
            )
            .join(ServiceProvider.user)
            .join(ServiceProvider.category)
        )

        if verified_only:
            stmt = stmt.where(ServiceProvider.is_verified.is_(True))

        filters = []
        if query:
            like = f"%{query.strip()}%"
            filters.append(
                or_(
                    User.full_name.ilike(like),
                    ServiceProvider.specialization.ilike(like),
                    ServiceProvider.profile_description.ilike(like),
                    ServiceCategory.name.ilike(like),
                )
            )
        if category:
            filters.append(ServiceCategory.name.ilike(f"%{category.strip()}%"))
        if location:
            loc = f"%{location.strip()}%"
            filters.append(
                or_(
                    ServiceProvider.location.ilike(loc),
                    ServiceProvider.area.ilike(loc),
                    ServiceProvider.pincode.ilike(loc),
                )
            )

        if filters:
            stmt = stmt.where(*filters)

        stmt = stmt.order_by(
            ServiceProvider.rating.desc(),
            ServiceProvider.total_reviews.desc(),
            User.full_name,
        ).limit(max(1, min(limit, 25)))

        result = await db.execute(stmt)
        providers = result.unique().scalars().all()
        return {
            "providers": [_provider_to_dict(provider) for provider in providers],
            "count": len(providers),
        }


@mcp.tool()
async def get_provider_details(provider_id: str) -> dict[str, Any]:
    """Get full public details for one provider by provider UUID."""
    async with async_session_maker() as db:
        result = await db.execute(
            select(ServiceProvider)
            .options(
                joinedload(ServiceProvider.user),
                joinedload(ServiceProvider.category),
            )
            .where(ServiceProvider.id == _uuid(provider_id))
        )
        provider = result.unique().scalar_one_or_none()
        if not provider:
            return {"error": "Provider not found", "provider_id": provider_id}

        review_result = await db.execute(
            select(func.count(Review.id), func.avg(Review.rating)).where(
                Review.provider_id == provider.id
            )
        )
        review_count, avg_rating = review_result.one()
        payload = _provider_to_dict(provider)
        payload["review_count"] = review_count or 0
        payload["average_rating"] = round(float(avg_rating or 0), 2)
        return {"provider": payload}


@mcp.tool()
async def get_provider_availability(
    provider_id: str,
    target_date: str,
    timezone: str = "Asia/Kolkata",
) -> dict[str, Any]:
    """Return available and unavailable slots for a provider on YYYY-MM-DD."""
    async with async_session_maker() as db:
        service = AvailabilityService(db)
        slots = await service.get_available_slots(
            _uuid(provider_id),
            _date(target_date),
            timezone,
        )
        return {
            "provider_id": provider_id,
            "date": target_date,
            "timezone": timezone,
            "slots": [
                {
                    "start_time": slot.start_time.isoformat(timespec="minutes"),
                    "end_time": slot.end_time.isoformat(timespec="minutes"),
                    "is_available": slot.is_available,
                }
                for slot in slots
            ],
        }


@mcp.tool()
async def get_customer_summary(email: str) -> dict[str, Any]:
    """Get appointment, invoice, and loyalty summary for one customer email."""
    async with async_session_maker() as db:
        user_result = await db.execute(
            select(User).where(User.email == email, User.role == UserRole.CUSTOMER)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return {"error": "Customer not found", "email": email}

        counts: dict[str, int] = {}
        for status in AppointmentStatus:
            result = await db.execute(
                select(func.count(Appointment.id)).where(
                    Appointment.customer_id == user.id,
                    Appointment.status == status,
                )
            )
            counts[status.value] = result.scalar() or 0

        invoice_result = await db.execute(
            select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.total_amount), 0)).where(
                Invoice.customer_id == user.id
            )
        )
        invoice_count, invoice_total = invoice_result.one()

        loyalty_result = await db.execute(
            select(LoyaltyAccount).where(LoyaltyAccount.user_id == user.id)
        )
        loyalty = loyalty_result.scalar_one_or_none()

        return {
            "customer": {
                "id": str(user.id),
                "name": user.full_name,
                "email": user.email,
            },
            "appointments": counts,
            "invoices": {
                "count": invoice_count or 0,
                "total_amount": float(invoice_total or 0),
            },
            "loyalty": {
                "points": loyalty.points if loyalty else 0,
                "tier": loyalty.tier if loyalty else "bronze",
            },
        }


@mcp.tool()
async def get_recent_appointments(email: str, limit: int = 5) -> dict[str, Any]:
    """List recent appointments for a customer or provider user email."""
    async with async_session_maker() as db:
        user_result = await db.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()
        if not user:
            return {"error": "User not found", "email": email}

        stmt = (
            select(Appointment)
            .options(
                joinedload(Appointment.customer),
                joinedload(Appointment.provider).joinedload(ServiceProvider.user),
            )
            .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
            .limit(max(1, min(limit, 25)))
        )

        if user.role == UserRole.CUSTOMER:
            stmt = stmt.where(Appointment.customer_id == user.id)
        elif user.role == UserRole.PROVIDER:
            provider_result = await db.execute(
                select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            )
            provider = provider_result.scalar_one_or_none()
            if not provider:
                return {"error": "Provider profile not found", "email": email}
            stmt = stmt.where(Appointment.provider_id == provider.id)
        else:
            return {"error": "Use get_platform_overview for admin users"}

        result = await db.execute(stmt)
        appointments = result.unique().scalars().all()
        return {
            "user": {"id": str(user.id), "name": user.full_name, "role": user.role.value},
            "appointments": [_appointment_to_dict(item) for item in appointments],
        }


@mcp.tool()
async def get_provider_dashboard(email: str) -> dict[str, Any]:
    """Full provider dashboard: appointment stats, revenue, ratings, upcoming schedule, pending requests."""
    async with async_session_maker() as db:
        user_result = await db.execute(
            select(User).where(User.email == email, User.role == UserRole.PROVIDER)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return {"error": "Provider not found", "email": email}

        provider_result = await db.execute(
            select(ServiceProvider)
            .options(joinedload(ServiceProvider.category))
            .where(ServiceProvider.user_id == user.id)
        )
        provider = provider_result.scalar_one_or_none()
        if not provider:
            return {"error": "Provider profile not found", "email": email}

        # Appointment counts by status
        counts: dict[str, int] = {}
        for status in AppointmentStatus:
            r = await db.execute(
                select(func.count(Appointment.id)).where(
                    Appointment.provider_id == provider.id,
                    Appointment.status == status,
                )
            )
            counts[status.value] = r.scalar() or 0

        # Revenue from invoices
        rev_result = await db.execute(
            select(
                func.count(Invoice.id),
                func.coalesce(func.sum(Invoice.total_amount), 0),
            ).where(Invoice.provider_id == provider.id)
        )
        invoice_count, total_revenue = rev_result.one()

        # Rating summary
        rating_result = await db.execute(
            select(
                func.count(Review.id),
                func.avg(Review.rating),
                func.min(Review.rating),
                func.max(Review.rating),
            ).where(Review.provider_id == provider.id)
        )
        review_count, avg_rating, min_rating, max_rating = rating_result.one()

        # Recent reviews (last 5)
        recent_reviews_result = await db.execute(
            select(Review)
            .options(joinedload(Review.customer))
            .where(Review.provider_id == provider.id)
            .order_by(Review.created_at.desc())
            .limit(5)
        )
        recent_reviews = recent_reviews_result.unique().scalars().all()

        # Upcoming confirmed/pending appointments (next 10)
        from datetime import date as date_type
        today = date_type.today()
        upcoming_result = await db.execute(
            select(Appointment)
            .options(joinedload(Appointment.customer))
            .where(
                Appointment.provider_id == provider.id,
                Appointment.appointment_date >= today,
                Appointment.status.in_([
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.PENDING,
                ]),
            )
            .order_by(Appointment.appointment_date, Appointment.start_time)
            .limit(10)
        )
        upcoming = upcoming_result.unique().scalars().all()

        # Pending requests specifically
        pending_result = await db.execute(
            select(Appointment)
            .options(joinedload(Appointment.customer))
            .where(
                Appointment.provider_id == provider.id,
                Appointment.status == AppointmentStatus.PENDING,
            )
            .order_by(Appointment.appointment_date, Appointment.start_time)
            .limit(10)
        )
        pending_appointments = pending_result.unique().scalars().all()

        return {
            "provider": {
                "id": str(provider.id),
                "name": user.full_name,
                "email": user.email,
                "specialization": provider.specialization,
                "category": provider.category.name if provider.category else None,
                "location": provider.location,
                "experience_years": provider.experience_years,
                "hourly_rate": provider.hourly_rate,
                "is_verified": provider.is_verified,
            },
            "appointments": {
                "by_status": counts,
                "total": sum(counts.values()),
            },
            "revenue": {
                "invoice_count": invoice_count or 0,
                "total_earned": float(total_revenue or 0),
                "avg_per_invoice": round(float(total_revenue or 0) / max(invoice_count or 1, 1), 2),
            },
            "ratings": {
                "review_count": review_count or 0,
                "average": round(float(avg_rating or 0), 2),
                "min": min_rating or 0,
                "max": max_rating or 0,
            },
            "recent_reviews": [
                {
                    "customer": rv.customer.full_name if rv.customer else None,
                    "rating": rv.rating,
                    "comment": rv.comment,
                    "date": rv.created_at.date().isoformat(),
                }
                for rv in recent_reviews
            ],
            "upcoming_schedule": [
                {
                    "id": str(a.id),
                    "customer": a.customer.full_name if a.customer else None,
                    "date": a.appointment_date.isoformat(),
                    "start_time": a.start_time.isoformat(timespec="minutes"),
                    "end_time": a.end_time.isoformat(timespec="minutes"),
                    "status": a.status.value,
                    "amount": a.total_amount,
                    "notes": a.notes,
                }
                for a in upcoming
            ],
            "pending_requests": [
                {
                    "id": str(a.id),
                    "customer": a.customer.full_name if a.customer else None,
                    "customer_email": a.customer.email if a.customer else None,
                    "date": a.appointment_date.isoformat(),
                    "start_time": a.start_time.isoformat(timespec="minutes"),
                    "end_time": a.end_time.isoformat(timespec="minutes"),
                    "amount": a.total_amount,
                    "notes": a.notes,
                }
                for a in pending_appointments
            ],
        }


@mcp.tool()
async def get_admin_dashboard() -> dict[str, Any]:
    """Advanced admin dashboard: platform stats, top providers, category breakdown, pending approvals, revenue."""
    async with async_session_maker() as db:
        # Core counts
        total_users = await db.scalar(select(func.count(User.id))) or 0
        total_customers = await db.scalar(
            select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)
        ) or 0
        total_providers = await db.scalar(select(func.count(ServiceProvider.id))) or 0
        verified_providers = await db.scalar(
            select(func.count(ServiceProvider.id)).where(ServiceProvider.is_verified.is_(True))
        ) or 0
        pending_providers = total_providers - verified_providers

        # Appointment counts by status
        by_status: dict[str, int] = {}
        for status in AppointmentStatus:
            by_status[status.value] = await db.scalar(
                select(func.count(Appointment.id)).where(Appointment.status == status)
            ) or 0
        total_appointments = sum(by_status.values())

        # Revenue
        total_revenue = await db.scalar(
            select(func.coalesce(func.sum(Invoice.total_amount), 0))
        ) or 0
        invoice_count = await db.scalar(select(func.count(Invoice.id))) or 0

        # Platform avg rating
        avg_rating = await db.scalar(select(func.avg(Review.rating))) or 0
        total_reviews = await db.scalar(select(func.count(Review.id))) or 0

        # Top 5 providers by revenue
        top_rev_result = await db.execute(
            select(
                ServiceProvider.id,
                User.full_name,
                ServiceProvider.specialization,
                ServiceProvider.location,
                ServiceProvider.rating,
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
            )
            .join(User, User.id == ServiceProvider.user_id)
            .outerjoin(Invoice, Invoice.provider_id == ServiceProvider.id)
            .group_by(ServiceProvider.id, User.full_name, ServiceProvider.specialization, ServiceProvider.location, ServiceProvider.rating)
            .order_by(func.coalesce(func.sum(Invoice.total_amount), 0).desc())
            .limit(5)
        )
        top_providers_by_revenue = [
            {
                "id": str(row.id),
                "name": row.full_name,
                "specialization": row.specialization,
                "location": row.location,
                "rating": row.rating,
                "revenue": float(row.revenue),
            }
            for row in top_rev_result.all()
        ]

        # Top 5 providers by rating
        top_rated_result = await db.execute(
            select(ServiceProvider)
            .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
            .where(ServiceProvider.is_verified.is_(True), ServiceProvider.total_reviews > 0)
            .order_by(ServiceProvider.rating.desc(), ServiceProvider.total_reviews.desc())
            .limit(5)
        )
        top_rated = top_rated_result.unique().scalars().all()

        # Category breakdown (appointment count per category)
        cat_result = await db.execute(
            select(
                ServiceCategory.name,
                func.count(Appointment.id).label("appointment_count"),
                func.count(ServiceProvider.id.distinct()).label("provider_count"),
            )
            .join(ServiceProvider, ServiceProvider.category_id == ServiceCategory.id)
            .outerjoin(Appointment, Appointment.provider_id == ServiceProvider.id)
            .where(ServiceCategory.is_active.is_(True))
            .group_by(ServiceCategory.name)
            .order_by(func.count(Appointment.id).desc())
        )
        category_breakdown = [
            {
                "category": row.name,
                "appointments": row.appointment_count,
                "providers": row.provider_count,
            }
            for row in cat_result.all()
        ]

        # Pending provider approvals
        pending_approvals_result = await db.execute(
            select(ServiceProvider)
            .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
            .where(ServiceProvider.is_verified.is_(False))
            .order_by(ServiceProvider.created_at.desc())
            .limit(10)
        )
        pending_approvals = pending_approvals_result.unique().scalars().all()

        # Recent 10 appointments across platform
        recent_result = await db.execute(
            select(Appointment)
            .options(
                joinedload(Appointment.customer),
                joinedload(Appointment.provider).joinedload(ServiceProvider.user),
            )
            .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
            .limit(10)
        )
        recent_appointments = recent_result.unique().scalars().all()

        return {
            "users": {
                "total": total_users,
                "customers": total_customers,
                "providers": total_providers,
                "verified_providers": verified_providers,
                "pending_approvals": pending_providers,
            },
            "appointments": {
                "total": total_appointments,
                "by_status": by_status,
            },
            "revenue": {
                "total": float(total_revenue),
                "invoice_count": invoice_count,
                "avg_per_invoice": round(float(total_revenue) / max(invoice_count, 1), 2),
            },
            "reviews": {
                "total": total_reviews,
                "average_rating": round(float(avg_rating), 2),
            },
            "top_providers_by_revenue": top_providers_by_revenue,
            "top_rated_providers": [
                {
                    "id": str(p.id),
                    "name": p.user.full_name if p.user else None,
                    "specialization": p.specialization,
                    "category": p.category.name if p.category else None,
                    "location": p.location,
                    "rating": p.rating,
                    "total_reviews": p.total_reviews,
                }
                for p in top_rated
            ],
            "category_breakdown": category_breakdown,
            "pending_provider_approvals": [
                {
                    "id": str(p.id),
                    "name": p.user.full_name if p.user else None,
                    "email": p.user.email if p.user else None,
                    "specialization": p.specialization,
                    "category": p.category.name if p.category else None,
                    "location": p.location,
                    "applied_at": p.created_at.date().isoformat(),
                }
                for p in pending_approvals
            ],
            "recent_appointments": [
                _appointment_to_dict(a) for a in recent_appointments
            ],
        }


@mcp.tool()
async def admin_search_user(query: str, limit: int = 5) -> dict[str, Any]:
    """Search any user or provider by name or email fragment. Returns profile + key stats."""
    async with async_session_maker() as db:
        like = f"%{query.strip()}%"
        user_result = await db.execute(
            select(User)
            .where(or_(User.full_name.ilike(like), User.email.ilike(like)))
            .order_by(User.full_name)
            .limit(max(1, min(limit, 20)))
        )
        users = user_result.scalars().all()
        if not users:
            return {"results": [], "count": 0, "query": query}

        results = []
        for user in users:
            entry: dict[str, Any] = {
                "id": str(user.id),
                "name": user.full_name,
                "email": user.email,
                "role": user.role.value,
                "is_active": user.is_active,
                "joined": user.created_at.date().isoformat(),
            }
            if user.role == UserRole.PROVIDER:
                prov_result = await db.execute(
                    select(ServiceProvider)
                    .options(joinedload(ServiceProvider.category))
                    .where(ServiceProvider.user_id == user.id)
                )
                prov = prov_result.unique().scalar_one_or_none()
                if prov:
                    entry["provider"] = {
                        "specialization": prov.specialization,
                        "category": prov.category.name if prov.category else None,
                        "location": prov.location,
                        "rating": prov.rating,
                        "total_reviews": prov.total_reviews,
                        "hourly_rate": prov.hourly_rate,
                        "is_verified": prov.is_verified,
                        "experience_years": prov.experience_years,
                    }
            elif user.role == UserRole.CUSTOMER:
                appt_count = await db.scalar(
                    select(func.count(Appointment.id)).where(Appointment.customer_id == user.id)
                ) or 0
                loyalty_result = await db.execute(
                    select(LoyaltyAccount).where(LoyaltyAccount.user_id == user.id)
                )
                loyalty = loyalty_result.scalar_one_or_none()
                entry["customer"] = {
                    "total_appointments": appt_count,
                    "loyalty_points": loyalty.points if loyalty else 0,
                    "loyalty_tier": loyalty.tier if loyalty else "bronze",
                }
            results.append(entry)

        return {"results": results, "count": len(results), "query": query}


@mcp.tool()
async def admin_get_user_detail(identifier: str) -> dict[str, Any]:
    """Deep detail for one user or provider by exact name or email (admin only)."""
    async with async_session_maker() as db:
        # Try exact email first, then name ilike
        user_result = await db.execute(
            select(User).where(
                or_(User.email == identifier.strip(), User.full_name.ilike(f"%{identifier.strip()}%"))
            ).limit(1)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return {"error": f"No user found matching '{identifier}'"}

        detail: dict[str, Any] = {
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "phone": user.phone_number,
            "joined": user.created_at.date().isoformat(),
        }

        if user.role == UserRole.PROVIDER:
            prov_result = await db.execute(
                select(ServiceProvider)
                .options(joinedload(ServiceProvider.category))
                .where(ServiceProvider.user_id == user.id)
            )
            prov = prov_result.unique().scalar_one_or_none()
            if prov:
                # Appointment counts
                counts: dict[str, int] = {}
                for status in AppointmentStatus:
                    counts[status.value] = await db.scalar(
                        select(func.count(Appointment.id)).where(
                            Appointment.provider_id == prov.id,
                            Appointment.status == status,
                        )
                    ) or 0
                # Revenue
                rev = await db.scalar(
                    select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(
                        Invoice.provider_id == prov.id
                    )
                ) or 0
                # Recent reviews
                reviews_result = await db.execute(
                    select(Review)
                    .options(joinedload(Review.customer))
                    .where(Review.provider_id == prov.id)
                    .order_by(Review.created_at.desc())
                    .limit(3)
                )
                reviews = reviews_result.unique().scalars().all()
                # Recent appointments
                appts_result = await db.execute(
                    select(Appointment)
                    .options(joinedload(Appointment.customer))
                    .where(Appointment.provider_id == prov.id)
                    .order_by(Appointment.appointment_date.desc())
                    .limit(5)
                )
                appts = appts_result.unique().scalars().all()

                detail["provider"] = {
                    "id": str(prov.id),
                    "specialization": prov.specialization,
                    "category": prov.category.name if prov.category else None,
                    "location": prov.location,
                    "area": prov.area,
                    "experience_years": prov.experience_years,
                    "hourly_rate": prov.hourly_rate,
                    "rating": prov.rating,
                    "total_reviews": prov.total_reviews,
                    "is_verified": prov.is_verified,
                    "profile_description": prov.profile_description,
                }
                detail["appointments"] = {
                    "by_status": counts,
                    "total": sum(counts.values()),
                }
                detail["revenue"] = {
                    "total_earned": float(rev),
                }
                detail["recent_reviews"] = [
                    {
                        "customer": rv.customer.full_name if rv.customer else None,
                        "rating": rv.rating,
                        "comment": rv.comment,
                        "date": rv.created_at.date().isoformat(),
                    }
                    for rv in reviews
                ]
                detail["recent_appointments"] = [
                    {
                        "customer": a.customer.full_name if a.customer else None,
                        "date": a.appointment_date.isoformat(),
                        "start_time": a.start_time.isoformat(timespec="minutes"),
                        "status": a.status.value,
                        "amount": a.total_amount,
                    }
                    for a in appts
                ]

        elif user.role == UserRole.CUSTOMER:
            counts2: dict[str, int] = {}
            for status in AppointmentStatus:
                counts2[status.value] = await db.scalar(
                    select(func.count(Appointment.id)).where(
                        Appointment.customer_id == user.id,
                        Appointment.status == status,
                    )
                ) or 0
            invoice_result = await db.execute(
                select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.total_amount), 0))
                .where(Invoice.customer_id == user.id)
            )
            inv_count, inv_total = invoice_result.one()
            loyalty_result = await db.execute(
                select(LoyaltyAccount).where(LoyaltyAccount.user_id == user.id)
            )
            loyalty = loyalty_result.scalar_one_or_none()
            appts_result = await db.execute(
                select(Appointment)
                .options(joinedload(Appointment.provider).joinedload(ServiceProvider.user))
                .where(Appointment.customer_id == user.id)
                .order_by(Appointment.appointment_date.desc())
                .limit(5)
            )
            appts2 = appts_result.unique().scalars().all()

            detail["appointments"] = {
                "by_status": counts2,
                "total": sum(counts2.values()),
            }
            detail["invoices"] = {
                "count": inv_count or 0,
                "total_spent": float(inv_total or 0),
            }
            detail["loyalty"] = {
                "points": loyalty.points if loyalty else 0,
                "tier": loyalty.tier if loyalty else "bronze",
            }
            detail["recent_appointments"] = [
                {
                    "provider": a.provider.user.full_name if a.provider and a.provider.user else None,
                    "date": a.appointment_date.isoformat(),
                    "start_time": a.start_time.isoformat(timespec="minutes"),
                    "status": a.status.value,
                    "amount": a.total_amount,
                }
                for a in appts2
            ]

        return detail


@mcp.tool()
async def get_platform_overview() -> dict[str, Any]:
    """Return admin-style platform totals and business metrics."""
    async with async_session_maker() as db:
        total_users = await db.scalar(select(func.count(User.id))) or 0
        total_customers = await db.scalar(
            select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)
        ) or 0
        total_providers = await db.scalar(
            select(func.count(ServiceProvider.id))
        ) or 0
        verified_providers = await db.scalar(
            select(func.count(ServiceProvider.id)).where(ServiceProvider.is_verified.is_(True))
        ) or 0
        total_appointments = await db.scalar(select(func.count(Appointment.id))) or 0
        total_revenue = await db.scalar(select(func.coalesce(func.sum(Invoice.total_amount), 0))) or 0
        average_rating = await db.scalar(select(func.avg(Review.rating))) or 0

        by_status = {}
        for status in AppointmentStatus:
            by_status[status.value] = await db.scalar(
                select(func.count(Appointment.id)).where(Appointment.status == status)
            ) or 0

        return {
            "users": {
                "total": total_users,
                "customers": total_customers,
            },
            "providers": {
                "total": total_providers,
                "verified": verified_providers,
            },
            "appointments": {
                "total": total_appointments,
                "by_status": by_status,
            },
            "revenue": {
                "total_amount": float(total_revenue or 0),
            },
            "reviews": {
                "average_rating": round(float(average_rating or 0), 2),
            },
        }


@mcp.tool()
async def search_project_knowledge(query: str, limit: int = 4) -> dict[str, Any]:
    """Search README and project presentation docs for product knowledge."""
    async with async_session_maker() as db:
        service = AIChatRetrievalService(db)
        chunks = service.search_knowledge(query, limit=max(1, min(limit, 10)))
        return {
            "chunks": [
                {
                    "source": chunk.source,
                    "title": chunk.title,
                    "body": chunk.body,
                }
                for chunk in chunks
            ]
        }


def main() -> None:
    """Run the MCP server."""
    mcp.run(transport=os.getenv("MCP_TRANSPORT", "streamable-http"))


if __name__ == "__main__":
    main()
