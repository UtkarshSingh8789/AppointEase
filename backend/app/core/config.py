"""Application configuration using pydantic-settings."""

from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    APP_NAME: str = "Appointment Scheduling Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./appointment.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT — tokens are currently stored in localStorage on the frontend.
    # Security improvement: migrate to httpOnly cookies to prevent XSS theft.
    # See BUGS-AND-IMPROVEMENTS.md #25 for migration notes.
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # SMTP / Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM: str = "AppointEase <no-reply@appointease.local>"

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Google Calendar
    GOOGLE_CALENDAR_CLIENT_ID: str = ""
    GOOGLE_CALENDAR_CLIENT_SECRET: str = ""

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Grok AI (xAI)
    GROK_API_KEY: str = ""
    GROK_MODEL: str = "grok-3-mini"

    # Gemini AI (Google)
    GEMINI_API_KEY: str = ""

    # Separate Gemini key for Document RAG — avoids exhausting the chatbot quota
    # If not set, falls back to GEMINI_API_KEY, then GROK_API_KEY
    GEMINI_RAG_API_KEY: str = ""

    # Document embeddings
    DOCUMENT_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Microsoft OAuth
    MICROSOFT_CLIENT_ID: str = "9967d5ff-3a96-4399-9742-7b611991a74e"
    MICROSOFT_CLIENT_SECRET: str = ""

    # Sentry
    SENTRY_DSN: str = ""

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10


settings = Settings()
