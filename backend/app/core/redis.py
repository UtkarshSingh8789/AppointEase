"""Redis connection and caching utilities."""

import logging
from typing import Optional, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global Redis connection pool
_redis_client: Optional[Any] = None


async def get_redis() -> Optional[Any]:
    """Get the Redis client instance. Returns None if Redis is unavailable."""
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as redis

            _redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,
            )
            # Test connection
            await _redis_client.ping()
            logger.info("Redis connected successfully at %s", settings.REDIS_URL)
        except ImportError as e:
            logger.warning("Redis client unavailable (%s) — rate limiting and caching disabled.", str(e))
            _redis_client = None
        except Exception as e:
            logger.warning("Redis unavailable (%s) — rate limiting and caching disabled.", str(e))
            _redis_client = None
    return _redis_client


async def close_redis():
    """Close the Redis connection on shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed.")
