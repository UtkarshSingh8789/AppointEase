"""Persistence helpers for provider onboarding applications."""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import UploadFile


BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads" / "provider-applications"
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "provider_applications.json"


def _ensure_dirs() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _read_store() -> dict[str, Any]:
    _ensure_dirs()
    if not DATA_FILE.exists():
        return {}
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_store(data: dict[str, Any]) -> None:
    _ensure_dirs()
    DATA_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _extract_text_preview(file: UploadFile, contents: bytes) -> str | None:
    """Extract a small readable preview from text-like uploads."""
    name = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    looks_textual = (
        content_type.startswith("text/")
        or name.endswith((".txt", ".md", ".csv", ".json", ".yaml", ".yml"))
    )
    if not looks_textual:
        return None

    text = ""
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            text = contents.decode(encoding)
            break
        except Exception:
            continue
    if not text:
        return None

    cleaned = " ".join(text.split())
    return cleaned[:800] if cleaned else None


async def _save_upload(file: UploadFile, provider_id: str, suffix: str) -> dict[str, Any]:
    """Save an uploaded file to disk and return a public descriptor."""
    ext = Path(file.filename or "").suffix or ""
    safe_name = f"{uuid.uuid4().hex}{suffix}{ext}"
    folder = UPLOAD_DIR / provider_id
    folder.mkdir(parents=True, exist_ok=True)
    file_path = folder / safe_name
    contents = await file.read()
    file_path.write_bytes(contents)
    preview = _extract_text_preview(file, contents)
    return {
        "name": file.filename or safe_name,
        "path": f"/uploads/provider-applications/{provider_id}/{safe_name}",
        "content_type": file.content_type,
        "size": len(contents),
        "preview": preview,
    }


async def store_application(
    *,
    provider_id: str,
    user_id: str,
    payload: dict[str, Any],
    avatar_file: Optional[UploadFile] = None,
    documents: Optional[list[UploadFile]] = None,
) -> dict[str, Any]:
    """Persist the onboarding payload and any uploaded files."""
    data = _read_store()
    avatar = None
    if avatar_file:
        avatar = await _save_upload(avatar_file, provider_id, "avatar")

    saved_docs = []
    for index, file in enumerate(documents or []):
        saved_docs.append(await _save_upload(file, provider_id, f"doc-{index + 1}"))

    record = {
        "provider_id": provider_id,
        "user_id": user_id,
        "avatar": avatar,
        "documents": saved_docs,
        "payload": payload,
    }
    data[provider_id] = record
    _write_store(data)
    return record


def get_application(provider_id: str) -> Optional[dict[str, Any]]:
    """Load a single stored onboarding application."""
    data = _read_store()
    return data.get(provider_id)


def list_applications() -> list[dict[str, Any]]:
    """Load every stored onboarding application."""
    data = _read_store()
    return list(data.values())


def build_application_summary(application: Optional[dict[str, Any]]) -> Optional[str]:
    """Create a concise human-readable summary of an onboarding application."""
    if not application:
        return None

    payload = application.get("payload") or {}
    documents = application.get("documents") or []
    avatar = application.get("avatar")

    parts: list[str] = []
    specialization = payload.get("specialization")
    location = payload.get("location")
    area = payload.get("area")
    category_id = payload.get("category_id")
    experience_years = payload.get("experience_years")
    hourly_rate = payload.get("hourly_rate")
    pincode = payload.get("pincode")
    description = payload.get("profile_description")

    if specialization:
        parts.append(f"Specialization: {specialization}")
    if category_id:
        parts.append(f"Category ID: {category_id}")
    if location:
        parts.append(f"Location: {location}")
    if area:
        parts.append(f"Area: {area}")
    if pincode:
        parts.append(f"Pincode: {pincode}")
    if experience_years is not None:
        parts.append(f"Experience: {experience_years} years")
    if hourly_rate is not None:
        parts.append(f"Requested hourly rate: Rs. {hourly_rate}")
    if description:
        parts.append(f"Profile note: {description}")

    if avatar:
        parts.append("Profile photo uploaded.")

    if documents:
        doc_names = ", ".join(doc.get("name", "Document") for doc in documents[:6])
        parts.append(f"Documents submitted ({len(documents)}): {doc_names}")
        text_previews = [doc.get("preview") for doc in documents if doc.get("preview")]
        if text_previews:
            parts.append(f"Readable text preview: {text_previews[0]}")

    return "\n".join(parts) if parts else None
