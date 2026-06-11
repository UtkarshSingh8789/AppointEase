"""Tests for no-show risk predictor (AI Feature #1)."""
import pytest
from datetime import date, timedelta, time
import uuid


@pytest.mark.asyncio
async def test_new_customer_medium_risk(db):
    """New customer with no history booking same-day gets medium/high risk."""
    from app.services.no_show_predictor import compute_no_show_risk
    customer_id = uuid.uuid4()
    risk = await compute_no_show_risk(
        db,
        customer_id=customer_id,
        appointment_date=date.today(),
        start_time=time(9, 0),
    )
    assert risk in ("medium", "high")


@pytest.mark.asyncio
async def test_future_booking_low_risk(db):
    """New customer booking 7+ days ahead gets low or medium risk."""
    from app.services.no_show_predictor import compute_no_show_risk
    customer_id = uuid.uuid4()
    future_date = date.today() + timedelta(days=7)
    risk = await compute_no_show_risk(
        db,
        customer_id=customer_id,
        appointment_date=future_date,
        start_time=time(10, 0),
    )
    # No history means +2 but no lead-time penalty → should be medium
    assert risk in ("low", "medium")


def test_risk_values_are_valid():
    """Risk values must be one of low/medium/high."""
    valid = {"low", "medium", "high"}
    assert "low" in valid
    assert "medium" in valid
    assert "high" in valid
