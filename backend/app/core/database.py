"""Database setup and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


async def get_db() -> AsyncSession:
    """Dependency that provides a database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all tables in the database."""
    # create_all and ALTER TYPE ADD VALUE cannot share a transaction in PostgreSQL.
    # Run DDL migrations in separate autocommit connections to avoid
    # InFailedSQLTransactionError on fresh databases.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Each migration runs in its own connection after schema creation.
    async with engine.connect() as conn:
        await conn.execution_options(isolation_level="AUTOCOMMIT")
        await _ensure_pgvector_extension(conn)
        await _ensure_notification_enum_values(conn)

    async with engine.begin() as conn:
        await _ensure_appointment_financial_columns(conn)
        await _ensure_super_admin_column(conn)


async def _ensure_pgvector_extension(conn) -> None:
    """Enable pgvector when PostgreSQL has the extension installed."""
    if conn.dialect.name != "postgresql":
        return
    try:
        await conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
    except Exception:
        pass


async def _ensure_notification_enum_values(conn) -> None:
    """Ensure notification enum values exist — must run outside a transaction."""
    if conn.dialect.name != "postgresql":
        return
    try:
        # Check if the enum type exists before trying to alter it
        result = await conn.exec_driver_sql(
            "SELECT 1 FROM pg_type WHERE typname = 'notificationtype' LIMIT 1"
        )
        if result.fetchone() is None:
            return
        # Check if the value already exists to avoid a no-op error
        val_result = await conn.exec_driver_sql(
            "SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid "
            "WHERE t.typname = 'notificationtype' AND e.enumlabel = 'APPOINTMENT_RESCHEDULED' LIMIT 1"
        )
        if val_result.fetchone() is None:
            await conn.exec_driver_sql(
                "ALTER TYPE notificationtype ADD VALUE 'APPOINTMENT_RESCHEDULED'"
            )
    except Exception:
        pass


async def _ensure_appointment_financial_columns(conn) -> None:
    """Add appointment financial columns for existing databases."""
    if conn.dialect.name != "postgresql":
        return

    await conn.exec_driver_sql(
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS base_amount DOUBLE PRECISION NOT NULL DEFAULT 0"
    )
    await conn.exec_driver_sql(
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS gst_amount DOUBLE PRECISION NOT NULL DEFAULT 0"
    )
    await conn.exec_driver_sql(
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0"
    )
    await conn.exec_driver_sql(
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION NOT NULL DEFAULT 0"
    )
    await conn.exec_driver_sql(
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_fee DOUBLE PRECISION NOT NULL DEFAULT 50"
    )


async def _ensure_super_admin_column(conn) -> None:
    """Add super-admin flag for existing databases."""
    if conn.dialect.name != "postgresql":
        return

    await conn.exec_driver_sql(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE"
    )
    await conn.exec_driver_sql(
        "UPDATE users SET is_super_admin = TRUE WHERE email = 'admin@appointly.com'"
    )
