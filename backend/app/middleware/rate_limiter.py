"""Rate limiting middleware using Redis sliding window."""

import logging
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

# Tighter per-minute limit for AI chat endpoint to protect paid API quota
AI_CHAT_RATE_LIMIT = 15


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using Redis sliding window counter.

    - General API: RATE_LIMIT_PER_MINUTE requests per minute per IP
    - Auth endpoints (/api/auth/login, /api/auth/register): RATE_LIMIT_AUTH_PER_MINUTE per minute per IP
    - AI chat endpoint (/api/ai-chat): AI_CHAT_RATE_LIMIT (15) per minute per IP

    Falls back gracefully (no limiting) if Redis is unavailable.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if path in ("/", "/health", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        redis_client = await get_redis()
        if redis_client is None:
            return await call_next(request)

        # Determine rate limit based on endpoint
        is_auth_endpoint = path.startswith("/api/auth/login") or path.startswith("/api/auth/register")
        is_ai_endpoint = path.startswith("/api/ai-chat")

        if is_auth_endpoint:
            limit = settings.RATE_LIMIT_AUTH_PER_MINUTE
            bucket = "auth"
        elif is_ai_endpoint:
            limit = AI_CHAT_RATE_LIMIT
            bucket = "ai"
        else:
            limit = settings.RATE_LIMIT_PER_MINUTE
            bucket = "general"

        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}:{bucket}"

        try:
            current_minute = int(time.time() // 60)
            redis_key = f"{key}:{current_minute}"

            count = await redis_client.incr(redis_key)
            if count == 1:
                await redis_client.expire(redis_key, 120)

            if count > limit:
                logger.warning(
                    "Rate limit exceeded: %s from %s (%d/%d)",
                    path, client_ip, count, limit
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please try again later.",
                        "retry_after_seconds": 60 - (int(time.time()) % 60),
                    },
                    headers={
                        "Retry-After": str(60 - (int(time.time()) % 60)),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
            return response

        except Exception as e:
            logger.error("Rate limiter error: %s", str(e))
            return await call_next(request)
