"""FastAPI application entry point."""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import create_tables
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.routers import (
    achievements,
    admin,
    ai_chat,
    ai_features,
    appointments,
    auth,
    availability,
    categories,
    chat,
    coupons,
    favorites,
    calcom,
    invoices,
    loyalty,
    notifications,
    payments,
    providers,
    reminders,
    reviews,
    users,
    waitlist,
    premium,
    integrations,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

try:
    from app.routers import mcp_tools
except ModuleNotFoundError as exc:  # pragma: no cover - optional local dependency
    mcp_tools = None
    logger.warning("MCP tools router disabled: %s", exc)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A comprehensive appointment scheduling platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Add middleware
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(providers.router)
app.include_router(availability.router)
app.include_router(appointments.router)
app.include_router(categories.router)
app.include_router(notifications.router)
app.include_router(reviews.router)
app.include_router(favorites.router)
app.include_router(admin.router)
app.include_router(waitlist.router)
app.include_router(loyalty.router)
app.include_router(invoices.router)
app.include_router(chat.router)
app.include_router(coupons.router)
app.include_router(achievements.router)
app.include_router(ai_chat.router)
app.include_router(ai_features.router)
app.include_router(payments.router)
app.include_router(reminders.router)
app.include_router(premium.router)
app.include_router(integrations.router)
app.include_router(calcom.router)
if mcp_tools is not None:
    app.include_router(mcp_tools.router)


lifespan_started = False


async def _startup():
    """Initialize database tables and Redis on startup."""
    logger.info("Starting up Appointment Scheduling Platform...")
    await create_tables()
    from app.core.redis import get_redis
    await get_redis()
    logger.info("Database tables created/verified.")
    await _run_demo_seed()


async def _run_demo_seed():
    """Run the full demo seed once — skips automatically if data already exists."""
    try:
        from app.core.database import async_session_maker
        from sqlalchemy import select, func
        from app.models.provider import ServiceProvider
        async with async_session_maker() as db:
            r = await db.execute(select(func.count(ServiceProvider.id)))
            provider_count = int(r.scalar() or 0)
        if provider_count > 0:
            logger.info("Demo seed already applied — skipping.")
            return
        logger.info("Running full demo seed data...")
        import importlib.util, os
        seed_path = os.path.join(os.path.dirname(__file__), "..", "seed.py")
        seed_path = os.path.abspath(seed_path)
        if os.path.exists(seed_path):
            spec = importlib.util.spec_from_file_location("seed", seed_path)
            module = importlib.util.module_from_spec(spec)
            assert spec.loader is not None
            spec.loader.exec_module(module)
            await module.seed_database()
            await module.seed_more_data()
            await module.seed_ai_data()
            logger.info("Full demo seed applied successfully.")
        else:
            logger.warning("seed.py not found — skipping AI seed.")
    except Exception as e:
        logger.warning(f"AI seed skipped due to error: {e}")


@app.on_event("startup")
async def startup_event():
    await _startup()


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - health check."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/ping", tags=["Health"])
async def ping():
    """Lightweight keep-alive endpoint to prevent cold starts."""
    return {"pong": True}
