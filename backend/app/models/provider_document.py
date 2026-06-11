"""Provider onboarding document RAG models."""

import uuid
import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

EMBEDDING_DIMENSIONS = 384

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover - dev fallback when pgvector package is absent
    Vector = None

ENABLE_PGVECTOR = os.getenv("ENABLE_PGVECTOR", "false").lower() == "true"


class ProviderDocument(Base):
    """Stored text extracted from one provider onboarding document."""

    __tablename__ = "provider_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("service_providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(600), nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    extracted_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="indexed")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    chunks = relationship(
        "ProviderDocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_provider_documents_provider", "provider_id"),
        Index("ix_provider_documents_path", "path"),
    )


class ProviderDocumentChunk(Base):
    """Searchable RAG chunk for provider document Q&A."""

    __tablename__ = "provider_document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("provider_documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("service_providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    if ENABLE_PGVECTOR and Vector is not None:
        embedding = mapped_column(Vector(EMBEDDING_DIMENSIONS), nullable=True)

    document = relationship("ProviderDocument", back_populates="chunks")

    __table_args__ = (
        Index("ix_provider_document_chunks_provider", "provider_id"),
        Index("ix_provider_document_chunks_document", "document_id"),
    )
