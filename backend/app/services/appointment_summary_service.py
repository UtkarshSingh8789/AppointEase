"""
AI Feature #4 — Automated Appointment Summary & Follow-Up Generator.

After an appointment is marked completed, generate a structured follow-up
note using Gemini/Grok. Stored in appointment.ai_summary (JSON column).
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def generate_appointment_summary(
    appointment_notes: str,
    provider_name: str,
    provider_specialization: str,
    customer_name: str,
    appointment_date: str,
) -> dict[str, Any]:
    """
    Generate a structured AI summary for a completed appointment.

    Returns a dict with:
        - summary: brief plain-text summary of what was discussed
        - next_steps: list of follow-up actions
        - draft_message: suggested message to send to the customer
    """
    if not appointment_notes or not appointment_notes.strip():
        return {
            "summary": "No notes were recorded for this appointment.",
            "next_steps": [],
            "draft_message": (
                f"Dear {customer_name}, thank you for your appointment on {appointment_date} "
                f"with {provider_name}. We hope you had a great experience. "
                "Please don't hesitate to reach out if you have any follow-up questions."
            ),
        }

    prompt = f"""You are an assistant helping a service provider ({provider_specialization}) 
summarize a completed appointment and draft a follow-up message.

Provider: {provider_name} ({provider_specialization})
Customer: {customer_name}
Date: {appointment_date}
Appointment Notes: {appointment_notes}

Please respond with a JSON object containing exactly these three keys:
1. "summary" - a 1–2 sentence plain-English summary of what was discussed or done
2. "next_steps" - a list of 1–3 specific follow-up actions the customer should take
3. "draft_message" - a short, warm message the provider could send to the customer

Respond ONLY with valid JSON. No markdown, no code blocks."""

    rag_key = settings.GEMINI_RAG_API_KEY or settings.GEMINI_API_KEY
    if rag_key:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={rag_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 500},
                    },
                )
            if resp.status_code == 200:
                raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Strip markdown code fences if present
                raw = raw.strip("`").strip()
                if raw.startswith("json"):
                    raw = raw[4:]
                return json.loads(raw)
        except Exception as exc:
            logger.warning("Gemini summary generation failed: %s", exc)

    if settings.GROK_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": settings.GROK_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 500,
                    },
                )
            if resp.status_code == 200:
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                raw = raw.strip("`").strip()
                if raw.startswith("json"):
                    raw = raw[4:]
                return json.loads(raw)
        except Exception as exc:
            logger.warning("Grok summary generation failed: %s", exc)

    # Fallback — no AI available
    return {
        "summary": f"Appointment with {provider_name} on {appointment_date} completed.",
        "next_steps": ["Follow up with any questions.", "Book next appointment if needed."],
        "draft_message": (
            f"Dear {customer_name}, thank you for your appointment on {appointment_date}. "
            f"Please feel free to reach out if you need anything further."
        ),
    }
