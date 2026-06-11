"""Global error handling middleware."""

import logging
import time
import traceback
from uuid import uuid4

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware for consistent error handling and request logging."""

    async def dispatch(self, request: Request, call_next):
        """Process request with error handling and logging."""
        request_id = str(uuid4())[:8]
        start_time = time.time()

        # Log incoming request
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} - Started"
        )

        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            # Log response
            logger.info(
                f"[{request_id}] {request.method} {request.url.path} - "
                f"{response.status_code} ({process_time:.3f}s)"
            )

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.3f}"
            return response

        except Exception as exc:
            process_time = time.time() - start_time
            logger.error(
                f"[{request_id}] {request.method} {request.url.path} - "
                f"Error ({process_time:.3f}s): {str(exc)}"
            )
            logger.error(traceback.format_exc())

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "Internal server error",
                    "request_id": request_id,
                },
            )
