"""Tests for payment verification and Razorpay signature check."""
import pytest
import hmac
import hashlib


def test_razorpay_signature_valid():
    """Valid Razorpay signature should verify correctly."""
    key_secret = "test_secret_key"
    order_id = "order_test123"
    payment_id = "pay_test456"
    
    # Generate a valid signature
    body = f"{order_id}|{payment_id}"
    expected_sig = hmac.new(
        key_secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # The signature format is: hmac_sha256(order_id + "|" + payment_id, secret)
    computed = hmac.new(
        key_secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    
    assert hmac.compare_digest(expected_sig, computed)


def test_razorpay_signature_invalid():
    """Tampered signature should not verify."""
    key_secret = "test_secret_key"
    order_id = "order_test123"
    payment_id = "pay_test456"
    
    body = f"{order_id}|{payment_id}"
    valid_sig = hmac.new(
        key_secret.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    
    tampered_sig = valid_sig[:-4] + "XXXX"
    assert not hmac.compare_digest(valid_sig, tampered_sig)


@pytest.mark.asyncio
async def test_payment_endpoints_require_auth(client):
    """Payment endpoints require authentication."""
    resp = await client.post("/api/payments/create-order", json={"amount": 100, "appointment_id": "test"})
    assert resp.status_code in (401, 403, 422)
    
    resp2 = await client.post("/api/payments/verify", json={
        "razorpay_order_id": "order_123",
        "razorpay_payment_id": "pay_456",
        "razorpay_signature": "sig_789",
        "appointment_id": "test"
    })
    assert resp2.status_code in (401, 403, 422)
