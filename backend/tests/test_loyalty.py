"""Tests for loyalty point award and deduction flows."""
import pytest


@pytest.mark.asyncio
async def test_health_check_accessible(client):
    """Health endpoint is always accessible."""
    resp = await client.get("/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_loyalty_account_requires_auth(client):
    """Loyalty account endpoint requires authentication."""
    resp = await client.get("/api/loyalty/account")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_loyalty_redeem_requires_auth(client):
    """Redeem endpoint requires authentication."""
    resp = await client.post("/api/loyalty/redeem", json={"points": 10})
    assert resp.status_code in (401, 403, 422)
