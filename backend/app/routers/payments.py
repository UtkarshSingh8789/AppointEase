"""Payment router for Razorpay integration."""

import hashlib
import hmac
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.loyalty_service import LoyaltyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["Payments"])


class CreateOrderRequest(BaseModel):
    """Request to create a Razorpay order."""
    amount: float  # Amount in INR
    appointment_id: str | None = None
    notes: dict = Field(default_factory=dict)


class CreateOrderResponse(BaseModel):
    """Response with Razorpay order details."""
    order_id: str
    amount: int  # Amount in paise
    currency: str
    key_id: str
    mock_mode: bool = False


class VerifyPaymentRequest(BaseModel):
    """Request to verify Razorpay payment."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    appointment_id: str | None = None
    purpose: str | None = None
    points: int | None = None


def _build_receipt(data: CreateOrderRequest, current_user: User) -> str:
    """Build a Razorpay-safe receipt string within the 40 character limit."""
    reference = (data.appointment_id or "general").replace("-", "")
    user_ref = str(current_user.id).replace("-", "")[:8]
    receipt = f"appt_{user_ref}_{reference[:20]}"
    return receipt[:40]


def _mock_order_response(data: CreateOrderRequest, amount_paise: int) -> CreateOrderResponse:
    """Build a local fallback order response without a Razorpay-like public key."""
    return CreateOrderResponse(
        order_id=f"mock_{data.appointment_id or 'order'}",
        amount=amount_paise,
        currency="INR",
        key_id="mock_checkout_disabled",
        mock_mode=True,
    )


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    data: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Razorpay order for payment."""
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        amount_paise = int(data.amount * 100)
        return _mock_order_response(data, amount_paise)

    try:
        import httpx

        amount_paise = int(data.amount * 100)  # Convert to paise

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                json={
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": _build_receipt(data, current_user),
                    "notes": {
                        "user_id": str(current_user.id),
                        "user_name": current_user.full_name,
                        **data.notes,
                    },
                },
            )

        if response.status_code not in {200, 201}:
            logger.error(
                "Razorpay order creation failed, falling back to mock mode: %s - %s",
                response.status_code,
                response.text,
            )
            return _mock_order_response(data, amount_paise)

        order = response.json()

        return CreateOrderResponse(
            order_id=order["id"],
            amount=order["amount"],
            currency=order["currency"],
            key_id=settings.RAZORPAY_KEY_ID,
            mock_mode=False,
        )

    except httpx.TimeoutException:
        logger.warning("Razorpay timed out, falling back to mock payment mode")
        amount_paise = int(data.amount * 100)
        return _mock_order_response(data, amount_paise)
    except Exception as e:
        logger.error(f"Payment order error: {e}")
        amount_paise = int(data.amount * 100)
        return _mock_order_response(data, amount_paise)


@router.post("/verify")
async def verify_payment(
    data: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay payment signature."""
    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment service not configured")

    # Verify signature
    message = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    if expected_signature != data.razorpay_signature:
        return {"verified": False, "message": "Payment verification failed"}

    result = {
        "verified": True,
        "payment_id": data.razorpay_payment_id,
        "order_id": data.razorpay_order_id,
        "message": "Payment verified successfully",
    }

    if data.purpose == "wallet_topup" and data.points and data.points > 0:
        loyalty_service = LoyaltyService(db)
        account = await loyalty_service.award_points(
            current_user.id,
            data.points,
            description=f"Wallet top-up via Razorpay ({data.points} points)",
        )
        result["wallet_points"] = account.points
        result["wallet_topped_up"] = True

    return result
