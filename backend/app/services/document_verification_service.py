"""
AI Feature #8 — AI Document Verification for Provider Onboarding.

Runs an automated checklist against provider documents before the admin
reviews. Returns a structured verdict (approved_recommendation / needs_review / reject_recommendation)
with per-check results.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.provider_document_rag_service import ProviderDocumentRAGService

logger = logging.getLogger(__name__)

AUTO_VERIFY_QUESTIONS = [
    {
        "id": "specialization_match",
        "question": "Does the uploaded document evidence match the claimed specialization and category?",
        "pass_keywords": ["yes", "match", "consistent", "evidence", "confirms", "certificate", "degree", "license"],
        "fail_keywords": ["no", "mismatch", "inconsistent", "could not find", "missing", "not found"],
    },
    {
        "id": "license_valid",
        "question": "Is there a valid, unexpired license or registration number visible in the documents?",
        "pass_keywords": ["valid", "found", "registration", "license", "number", "present"],
        "fail_keywords": ["expired", "missing", "not found", "could not find", "no license"],
    },
    {
        "id": "institution_credible",
        "question": "Does the institution or issuing authority appear to be a known, accredited organization?",
        "pass_keywords": ["university", "institute", "council", "board", "accredited", "known", "government", "national", "recognized"],
        "fail_keywords": ["unknown", "unrecognized", "not found", "could not find", "suspicious"],
    },
    {
        "id": "identity_present",
        "question": "Is a government-issued photo identity document (Aadhaar, PAN, Passport, etc.) present and readable?",
        "pass_keywords": ["aadhaar", "pan", "passport", "voter", "driving", "present", "found", "visible", "identity"],
        "fail_keywords": ["not found", "missing", "could not find", "no identity", "not present"],
    },
    {
        "id": "no_red_flags",
        "question": "Are there any obvious inconsistencies, altered documents, or red flags in the uploaded files?",
        "pass_keywords": ["no red flags", "no inconsistency", "appears genuine", "consistent", "no issues", "looks authentic"],
        "fail_keywords": ["inconsistency", "suspicious", "altered", "mismatch", "red flag", "fake", "forged"],
    },
]


def _score_answer(answer: str, check: dict[str, Any]) -> str:
    """Return 'pass', 'fail', or 'uncertain' based on keyword matching."""
    lower = answer.lower()
    pass_hits = sum(1 for kw in check["pass_keywords"] if kw in lower)
    fail_hits = sum(1 for kw in check["fail_keywords"] if kw in lower)
    if fail_hits > pass_hits:
        return "fail"
    elif pass_hits > fail_hits:
        return "pass"
    return "uncertain"


def _overall_verdict(results: list[dict[str, Any]]) -> dict[str, str]:
    """Compute overall recommendation from per-check results."""
    fails = sum(1 for r in results if r["result"] == "fail")
    uncertains = sum(1 for r in results if r["result"] == "uncertain")

    if fails == 0 and uncertains <= 1:
        verdict = "approved_recommendation"
        label = "✅ Looks Good — recommended for approval"
    elif fails >= 2 or (fails == 1 and uncertains >= 2):
        verdict = "reject_recommendation"
        label = "❌ Issues Found — recommend rejection or further review"
    else:
        verdict = "needs_review"
        label = "⚠️ Needs Manual Review — some items could not be verified"

    return {"verdict": verdict, "label": label}


async def auto_verify_provider_documents(
    db: AsyncSession, provider_id: UUID
) -> dict[str, Any]:
    """
    Run all 5 auto-verification checks and return structured results.

    Returns:
        {
            "provider_id": str,
            "checks": [{"id", "question", "answer", "result"}],
            "overall": {"verdict", "label"},
            "risk_flags": [str],
        }
    """
    rag_service = ProviderDocumentRAGService(db)
    checks_results = []
    all_risk_flags: list[str] = []

    for check in AUTO_VERIFY_QUESTIONS:
        try:
            answer_data = await rag_service.ask(provider_id, check["question"])
            answer = answer_data.get("answer", "")
            risk_flags = answer_data.get("risk_flags", [])
            all_risk_flags.extend(risk_flags)
            result = _score_answer(answer, check)
        except Exception as exc:
            logger.warning("Auto-verify check '%s' failed: %s", check["id"], exc)
            answer = "Could not complete this check."
            result = "uncertain"

        checks_results.append({
            "id": check["id"],
            "question": check["question"],
            "answer": answer,
            "result": result,
        })

    # Deduplicate flags
    unique_flags = list(dict.fromkeys(all_risk_flags))
    overall = _overall_verdict(checks_results)

    return {
        "provider_id": str(provider_id),
        "checks": checks_results,
        "overall": overall,
        "risk_flags": unique_flags,
    }
