"""Cal.com-inspired feature catalog and scheduling previews."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Iterable
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.appointment import Appointment, AppointmentStatus
from app.models.availability import Availability
from app.models.integration import Integration
from app.models.provider import ServiceProvider
from app.models.user import User
from app.services.availability_service import AvailabilityService

REPO_ROOT = Path(__file__).resolve().parents[3]
CALCOM_FEATURE_FILE = REPO_ROOT / "CALCOM-50-FEATURES.md"


@dataclass(frozen=True)
class FeatureSpec:
    number: int
    category: str
    title: str
    status: str
    route: str | None
    premium_only: bool
    summary: str


STATUS_OVERRIDES: dict[int, str] = {
    1: "live",
    4: "live",
    8: "live",
    11: "partial",
    12: "partial",
    13: "partial",
    14: "partial",
    15: "partial",
    16: "partial",
    18: "live",
    19: "live",
    20: "partial",
    23: "partial",
    26: "partial",
    29: "live",
    30: "live",
    31: "live",
    34: "live",
    38: "live",
    39: "live",
    40: "live",
    45: "live",
    46: "live",
    47: "live",
    48: "live",
    49: "live",
    50: "live",
}

ROUTE_OVERRIDES: dict[int, str] = {
    1: "/p/{provider_id}",
    2: "/calcom",
    3: "/calcom",
    4: "/book/{provider_id}",
    5: "/provider/availability",
    6: "/book/{provider_id}",
    7: "/book/{provider_id}",
    8: "/appointments/{appointment_id}/reschedule",
    9: "/appointments/{appointment_id}",
    10: "/book/{provider_id}",
    11: "/provider/integrations",
    12: "/provider/integrations",
    13: "/provider/integrations",
    14: "/provider/integrations",
    15: "/provider/integrations",
    16: "/provider/integrations",
    17: "/provider/integrations",
    18: "/appointments/{appointment_id}/ical",
    19: "/book/{provider_id}",
    20: "/provider/schedule",
    21: "/provider/dashboard",
    22: "/provider/dashboard",
    23: "/providers",
    24: "/provider/appointments",
    25: "/admin/approvals",
    26: "/appointments/{appointment_id}",
    27: "/provider/schedule",
    28: "/provider/availability",
    29: "/provider/schedule",
    30: "/settings",
    31: "/appointments/{appointment_id}/reschedule",
    32: "/dashboard",
    33: "/dashboard",
    34: "/appointments",
    35: "/appointments",
    36: "/book/{provider_id}",
    37: "/book/{provider_id}",
    38: "/book/{provider_id}",
    39: "/book/{provider_id}",
    40: "/appointments/{appointment_id}",
    41: "/provider/profile",
    42: "/premium",
    43: "/provider/integrations",
    44: "/provider/availability",
    45: "/provider/availability",
    46: "/provider/dashboard",
    47: "/provider/profile",
    48: "/provider/dashboard",
    49: "/provider/schedule",
    50: "/premium",
}

PREMIUM_OVERRIDES: set[int] = {31, 42, 43, 49, 50}

SUMMARY_OVERRIDES: dict[int, str] = {
    1: "Every provider gets a shareable booking surface with public booking and profile links.",
    2: "Preview the next provider in line for a category based on current workload and availability.",
    3: "Combine multiple host calendars so a customer only sees slots where everyone is free.",
    4: "Book inside the available rules immediately, without a back-and-forth handoff.",
    5: "Reserve time before and after appointments so the schedule stays realistic.",
    6: "Ask service-specific questions before checkout and store them with the appointment.",
    7: "Change the intake form based on the selected service or category.",
    8: "Reschedule without losing context, notes, or the original appointment thread.",
    9: "Capture a structured cancel reason to help analysis and follow-up.",
    10: "Show branded confirmation screens and thank-you messages after booking.",
    11: "Keep Google Calendar in sync with AppointEase and preserve busy-time awareness.",
    12: "Mirror Outlook events so Microsoft calendar users keep accurate availability.",
    13: "Automatically attach a Google Meet link for online appointments.",
    14: "Automatically attach a Microsoft Teams meeting link for online appointments.",
    15: "Generate Zoom join links for the booking when Zoom is the preferred provider.",
    16: "Route booking notifications to Slack channels or direct messages.",
    17: "Expose webhook payloads for automation tools and internal systems.",
    18: "Export every confirmed appointment as an iCal entry for external calendars.",
    19: "Block conflicting bookings before checkout by checking live appointments.",
    20: "Show read-only busy overlays on calendars so availability is obvious.",
    21: "Track multiple staff calendars behind a single provider identity.",
    22: "Pool schedules across a clinic or salon so any available staff member can take a booking.",
    23: "Prioritise staff assignment based on specialization, category, and workload.",
    24: "Route high-value or sensitive bookings through an approval step first.",
    25: "Collect concierge-style approval requests in a shared queue.",
    26: "Store internal notes that staff can see, but customers cannot.",
    27: "Hand off an appointment to another team member without losing the thread.",
    28: "Reserve rooms or equipment as shared resources in the booking flow.",
    29: "Automate reminders and follow-up workflows around each appointment.",
    30: "Adjust reminder timing based on user preference and communication style.",
    31: "Reschedule with AI suggestions that are aware of the customer's history.",
    32: "Maintain a waitlist for cancelled slots so openings can be filled fast.",
    33: "Learn the preferred time of day for each customer over time.",
    34: "Render a timeline of past and upcoming bookings on the customer dashboard.",
    35: "Allow a one-click rebook from a previous appointment.",
    36: "Support guest checkout for appointments without a full account creation step.",
    37: "Support group bookings and multi-participant sessions.",
    38: "Keep scheduling timezone-aware for remote services and global clients.",
    39: "Personalise booking confirmations with customer and provider context.",
    40: "Generate post-appointment summaries that help users remember next steps.",
    41: "Let providers style their public booking page and branding.",
    42: "Unlock custom domains for premium providers.",
    43: "Embed booking widgets into third-party sites and landing pages.",
    44: "Reuse weekday and seasonal availability templates.",
    45: "Switch providers into vacation mode and reopen automatically later.",
    46: "Show revenue and booking analytics that help providers grow.",
    47: "Improve bios, profiles, and descriptions with AI assistance.",
    48: "Generate suggested replies to reviews using AI.",
    49: "Detect open gaps in the calendar and recommend slots to fill them.",
    50: "Provide a premium insights dashboard with growth recommendations.",
}


def _feature_file_lines() -> list[str]:
    if not CALCOM_FEATURE_FILE.exists():
        return []
    return CALCOM_FEATURE_FILE.read_text(encoding="utf-8").splitlines()


def _parse_catalog() -> list[FeatureSpec]:
    features: list[FeatureSpec] = []
    category = "Uncategorized"

    for raw_line in _feature_file_lines():
      line = raw_line.strip()
      if line.startswith("## "):
          category = line[3:].strip()
          continue
      if not line or line.startswith("#") or not line[0].isdigit():
          continue

      number_part, _, title_part = line.partition(".")
      if not title_part:
          continue
      try:
          number = int(number_part)
      except ValueError:
          continue

      title = title_part.strip().rstrip(".")
      status = STATUS_OVERRIDES.get(number, "planned")
      route = ROUTE_OVERRIDES.get(number)
      premium_only = number in PREMIUM_OVERRIDES
      summary = SUMMARY_OVERRIDES.get(
          number,
          f"{title} is part of the {category.lower()} roadmap for the AppointEase platform.",
      )

      features.append(
          FeatureSpec(
              number=number,
              category=category,
              title=title,
              status=status,
              route=route,
              premium_only=premium_only,
              summary=summary,
          )
      )

    return features


def get_catalog_payload() -> dict[str, Any]:
    features = _parse_catalog()
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    live = partial = planned = premium_locked = 0

    for item in features:
        grouped[item.category].append(
            {
                "id": f"calcom-{item.number}",
                "number": item.number,
                "title": item.title,
                "category": item.category,
                "status": item.status,
                "summary": item.summary,
                "route": item.route,
                "premium_only": item.premium_only,
            }
        )
        live += int(item.status == "live")
        partial += int(item.status == "partial")
        planned += int(item.status == "planned")
        premium_locked += int(item.premium_only)

    return {
        "summary": {
            "total": len(features),
            "live": live,
            "partial": partial,
            "planned": planned,
            "premium_locked": premium_locked,
        },
        "categories": [
            {"name": category, "features": items}
            for category, items in grouped.items()
        ],
        "features": [
            {
                "id": f"calcom-{item.number}",
                "number": item.number,
                "title": item.title,
                "category": item.category,
                "status": item.status,
                "summary": item.summary,
                "route": item.route,
                "premium_only": item.premium_only,
            }
            for item in features
        ],
    }


async def get_provider_snapshot(db: AsyncSession, user: User) -> dict[str, Any]:
    provider_result = await db.execute(
        select(ServiceProvider)
        .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
        .where(ServiceProvider.user_id == user.id)
    )
    provider = provider_result.scalar_one_or_none()
    if not provider:
        return {
            "has_provider_profile": False,
            "booking_link": None,
            "public_profile_link": None,
            "integrations": [],
            "upcoming_appointments": 0,
            "availability_templates": 0,
            "vacation_mode": False,
            "next_slot": None,
        }

    integrations_result = await db.execute(
        select(Integration).where(
            Integration.provider_id == provider.id,
            Integration.is_active == True,
        )
    )
    integrations = integrations_result.scalars().all()

    upcoming_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.provider_id == provider.id,
            Appointment.status.in_([
                AppointmentStatus.PENDING,
                AppointmentStatus.CONFIRMED,
            ]),
            Appointment.appointment_date >= date.today(),
        )
    )
    upcoming_count = int(upcoming_result.scalar() or 0)

    availability_service = AvailabilityService(db)
    tomorrow = date.today() + timedelta(days=1)
    next_slots: list[dict[str, Any]] = []
    for offset in range(7):
        target_date = tomorrow + timedelta(days=offset)
        slots = await availability_service.get_available_slots(provider.id, target_date)
        if slots:
            next_slots = [
                {
                    "date": target_date.isoformat(),
                    "start_time": slot.start_time.strftime("%H:%M"),
                    "end_time": slot.end_time.strftime("%H:%M"),
                }
                for slot in slots[:3]
            ]
            break

    return {
        "has_provider_profile": True,
        "provider": {
            "id": str(provider.id),
            "name": provider.user.full_name if provider.user else user.full_name,
            "category": provider.category.name if provider.category else None,
            "specialization": provider.specialization,
            "verified": provider.is_verified,
            "hourly_rate": provider.hourly_rate,
            "location": provider.location,
            "booking_link": f"/book/{provider.id}",
            "public_profile_link": f"/p/{provider.id}",
            "profile_link": "/provider/profile",
        },
        "booking_link": f"/book/{provider.id}",
        "public_profile_link": f"/p/{provider.id}",
        "integrations": [
            {
                "name": item.provider_name,
                "active": item.is_active,
                "metadata": item.metadata_json,
            }
            for item in integrations
        ],
        "upcoming_appointments": upcoming_count,
        "availability_templates": int(
            (
                await db.execute(
                    select(func.count(Availability.id)).where(
                        Availability.provider_id == provider.id,
                        Availability.is_active == True,
                    )
                )
            ).scalar()
            or 0
        ),
        "vacation_mode": bool(provider.vacation_start and provider.vacation_end),
        "vacation_window": {
            "start": provider.vacation_start.isoformat() if provider.vacation_start else None,
            "end": provider.vacation_end.isoformat() if provider.vacation_end else None,
        },
        "next_slots": next_slots,
        "premium_status": "premium" if user.is_premium else "standard",
        "premium_prompt": (
            "Premium unlocks smarter scheduling, richer analytics, and branded booking options."
            if not user.is_premium
            else "Premium features are active for this account."
        ),
    }


async def preview_round_robin(
    db: AsyncSession,
    category_id: UUID,
    target_date: date,
) -> dict[str, Any]:
    providers_result = await db.execute(
        select(ServiceProvider)
        .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
        .where(
            ServiceProvider.category_id == category_id,
            ServiceProvider.is_verified == True,
        )
    )
    providers = providers_result.scalars().all()

    ranked: list[dict[str, Any]] = []
    for provider in providers:
        load_result = await db.execute(
            select(func.count(Appointment.id)).where(
                Appointment.provider_id == provider.id,
                Appointment.status.in_([
                    AppointmentStatus.PENDING,
                    AppointmentStatus.CONFIRMED,
                ]),
                Appointment.appointment_date >= target_date,
            )
        )
        load = int(load_result.scalar() or 0)
        ranked.append(
            {
                "provider_id": str(provider.id),
                "name": provider.user.full_name if provider.user else "Unknown",
                "specialization": provider.specialization,
                "workload": load,
                "location": provider.location,
            }
        )

    ranked.sort(key=lambda item: (item["workload"], item["name"]))
    return {
        "category_id": str(category_id),
        "date": target_date.isoformat(),
        "assignment_order": ranked,
        "recommended_provider": ranked[0] if ranked else None,
    }


async def preview_collective_slots(
    db: AsyncSession,
    provider_ids: Iterable[UUID],
    target_date: date,
    timezone_name: str = "Asia/Kolkata",
) -> dict[str, Any]:
    ids = list(provider_ids)
    if not ids:
        return {"slots": [], "provider_ids": []}

    availability_service = AvailabilityService(db)
    provider_slots: dict[str, list[dict[str, Any]]] = {}
    slot_maps: list[set[tuple[str, str]]] = []

    for provider_id in ids:
        slots = await availability_service.get_available_slots(provider_id, target_date, timezone=timezone_name)
        slot_payload = [
            {
                "start_time": slot.start_time.strftime("%H:%M"),
                "end_time": slot.end_time.strftime("%H:%M"),
            }
            for slot in slots
        ]
        provider_slots[str(provider_id)] = slot_payload
        slot_maps.append({(item["start_time"], item["end_time"]) for item in slot_payload})

    shared_slots = sorted(
        set.intersection(*slot_maps) if slot_maps else set(),
        key=lambda item: item[0],
    )

    return {
        "date": target_date.isoformat(),
        "timezone": timezone_name,
        "provider_ids": [str(item) for item in ids],
        "shared_slots": [
            {"start_time": start, "end_time": end}
            for start, end in shared_slots
        ],
        "provider_slots": provider_slots,
        "message": (
            "No overlapping shared slots were found."
            if not shared_slots
            else f"{len(shared_slots)} shared slot(s) are available for a collective booking."
        ),
    }


async def get_booking_link(db: AsyncSession, provider_id: UUID) -> dict[str, Any]:
    result = await db.execute(
        select(ServiceProvider)
        .options(joinedload(ServiceProvider.user), joinedload(ServiceProvider.category))
        .where(ServiceProvider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        return {"booking_link": None, "public_profile_link": None}

    provider_name = provider.user.full_name if provider.user else "this provider"
    return {
        "provider_id": str(provider.id),
        "booking_link": f"/book/{provider.id}",
        "public_profile_link": f"/p/{provider.id}",
        "share_text": f"Book with {provider_name} on AppointEase",
        "embed_code": (
            f'<iframe src="/book/{provider.id}" '
            'title="AppointEase booking widget" loading="lazy" '
            'style="width:100%;min-height:760px;border:0;border-radius:20px;"></iframe>'
        ),
    }
