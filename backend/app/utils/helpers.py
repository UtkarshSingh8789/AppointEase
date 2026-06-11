"""Shared utility functions."""

from datetime import date, datetime, time, timedelta
from typing import List


def generate_time_slots(
    start_time: time,
    end_time: time,
    duration_minutes: int,
    target_date: date,
) -> List[dict]:
    """Generate time slots between start and end time.

    Args:
        start_time: Start of availability window.
        end_time: End of availability window.
        duration_minutes: Duration of each slot in minutes.
        target_date: The date for the slots.

    Returns:
        List of dicts with start_time and end_time for each slot.
    """
    slots = []
    current = datetime.combine(target_date, start_time)
    end = datetime.combine(target_date, end_time)
    delta = timedelta(minutes=duration_minutes)

    while current + delta <= end:
        slot_end = current + delta
        slots.append({
            "start_time": current.time(),
            "end_time": slot_end.time(),
        })
        current = slot_end

    return slots


def format_time_12h(t: time) -> str:
    """Format a time object to 12-hour format string.

    Args:
        t: Time object to format.

    Returns:
        Formatted time string (e.g., "2:30 PM").
    """
    return t.strftime("%-I:%M %p")


def get_day_name(day_of_week: int) -> str:
    """Get the name of a day from its number.

    Args:
        day_of_week: Day number (0=Monday, 6=Sunday).

    Returns:
        Day name string.
    """
    days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    return days[day_of_week] if 0 <= day_of_week <= 6 else "Unknown"


def paginate_params(page: int, per_page: int) -> tuple:
    """Calculate offset and limit from page parameters.

    Args:
        page: Page number (1-indexed).
        per_page: Items per page.

    Returns:
        Tuple of (offset, limit).
    """
    offset = (page - 1) * per_page
    return offset, per_page
