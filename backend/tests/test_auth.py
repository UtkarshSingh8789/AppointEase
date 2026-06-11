"""Tests for authentication flows."""
import pytest


@pytest.mark.asyncio
async def test_register_customer(client):
    """Customer registration creates account and returns tokens."""
    resp = await client.post("/api/auth/register", json={
        "full_name": "Test Customer",
        "email": "testcustomer@example.com",
        "password": "Test1234!",
        "role": "customer",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "customer"


@pytest.mark.asyncio
async def test_login_success(client):
    """Valid credentials return access and refresh tokens."""
    await client.post("/api/auth/register", json={
        "full_name": "Login User",
        "email": "loginuser@example.com",
        "password": "Test1234!",
        "role": "customer",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "loginuser@example.com",
        "password": "Test1234!",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Wrong password returns 401."""
    await client.post("/api/auth/register", json={
        "full_name": "Bad Pass",
        "email": "badpass@example.com",
        "password": "Test1234!",
        "role": "customer",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "badpass@example.com",
        "password": "WrongPass1!",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_requires_auth(client):
    """GET /api/auth/me without token returns 401 or 403."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_register_invalid_email(client):
    """Registration with invalid email is rejected."""
    resp = await client.post("/api/auth/register", json={
        "full_name": "Bad Email",
        "email": "not-an-email",
        "password": "Test1234!",
        "role": "customer",
    })
    assert resp.status_code == 422
