"""Retrieval helpers for the AI chatbot."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.provider import ServiceProvider
from app.models.user import UserRole

REPO_ROOT = Path(__file__).resolve().parents[3]
# Only include files that actually exist.
KNOWLEDGE_FILES = (
    REPO_ROOT / "README.md",
    REPO_ROOT / "CALCOM-50-FEATURES.md",
    REPO_ROOT / "AI-FEATURES-ROADMAP.md",
    REPO_ROOT / "BUGS-AND-IMPROVEMENTS.md",
)

# Bug #13/#33 fix: file-hash-based cache — refreshes when README changes on disk.
_KNOWLEDGE_CACHE: dict[tuple, tuple["KnowledgeChunk", ...]] = {}

STOPWORDS = {
    "a",
    "about",
    "an",
    "and",
    "appointment",
    "appointments",
    "are",
    "book",
    "booking",
    "bookings",
    "can",
    "do",
    "for",
    "from",
    "help",
    "how",
    "i",
    "in",
    "is",
    "me",
    "my",
    "of",
    "on",
    "or",
    "please",
    "provider",
    "providers",
    "schedule",
    "show",
    "tell",
    "the",
    "to",
    "what",
    "with",
    "would",
    "you",
}


@dataclass(frozen=True)
class KnowledgeChunk:
    """A small searchable chunk of product knowledge."""

    source: str
    title: str
    body: str

    @property
    def combined(self) -> str:
        """Return the full searchable text."""
        return f"{self.title}\n{self.body}".strip()


@dataclass(frozen=True)
class RetrievedProvider:
    """A provider record ranked for the current query."""

    provider: ServiceProvider
    score: float
    reasons: tuple[str, ...]


class AIChatRetrievalService:
    """Build retrieval context for the chatbot."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def is_booking_intent(message: str) -> bool:
        """Detect booking-related queries — expanded to catch natural phrasing variants."""
        q = message.lower()
        return any(
            token in q
            for token in (
                "book", "booking", "schedule", "reserve", "appointment with",
                "set up a consultation", "set up consultation",
                "i'd like to see", "i want to see", "want to meet",
                "get an appointment", "make an appointment", "need a doctor",
                "need a dentist", "need a lawyer", "need a trainer",
                "need a consultant", "need an appointment",
                "can i book", "can you book", "how do i book",
                "find me a", "book me a", "schedule me",
            )
        )

    @staticmethod
    def is_provider_detail_intent(message: str) -> bool:
        """Detect provider discovery/detail queries."""
        q = message.lower()
        return any(
            phrase in q
            for phrase in (
                "provider detail",
                "provider details",
                "tell me about",
                "who is",
                "find provider",
                "find doctor",
                "find dentist",
                "show provider",
                "show doctor",
                "details about",
            )
        )

    @staticmethod
    def is_system_explanation_intent(message: str) -> bool:
        """Detect questions about how the chatbot works internally."""
        q = message.lower()
        return any(
            phrase in q
            for phrase in (
                "what are you doing",
                "how are you working",
                "how do you work",
                "hitting my db",
                "hit my db",
                "using gemini",
                "using grok",
                "use gemini",
                "use grok",
                "rag",
                "vector",
                "database",
                "llm",
                "api",
            )
        )

    @staticmethod
    def is_recent_appointments_intent(message: str) -> bool:
        """Detect questions about recent appointments or recent bookings."""
        q = message.lower()
        return any(
            phrase in q
            for phrase in (
                "recent appointment",
                "recent appointments",
                "recent booking",
                "recent bookings",
                "latest booking",
                "latest bookings",
                "upcoming appointment",
                "upcoming appointments",
                "my appointments",
                "my booking",
                "my bookings",
                "next appointment",
                "next appointments",
                "who has done the recent appointments",
                "who did the recent appointments",
            )
        )

    @staticmethod
    def is_stats_intent(message: str) -> bool:
        """Detect generic stats or dashboard questions."""
        q = message.lower()
        return any(
            phrase in q
            for phrase in (
                "how many booking",
                "how many appointment",
                "today's stats",
                "today stats",
                "today's appointments",
                "today appointments",
                "platform revenue",
                "view reports",
                "platform overview",
                "recent bookings",
                "recent platform appointments",
                "what is the recent bookings",
                "show reports",
                "show revenue",
            )
        )

    @staticmethod
    def is_provider_scope_intent(message: str) -> bool:
        """Detect questions that should stay inside provider access."""
        q = message.lower()
        return any(
            phrase in q
            for phrase in (
                "my schedule",
                "my upcoming appointments",
                "my appointments",
                "recent appointments",
                "recent bookings",
                "my ratings",
                "my reviews",
                "my revenue",
                "my revenue summary",
                "pending requests",
                "appointment requests",
                "pending appointment requests",
                "today's schedule",
                "today schedule",
                "today appointments",
                "today's appointments",
            )
        )

    @staticmethod
    def is_customer_scope_intent(message: str) -> bool:
        """Detect customer personal booking/account questions."""
        q = message.lower()
        return any(
            phrase in q
            for phrase in (
                "my upcoming appointments",
                "my appointments",
                "my booking",
                "my bookings",
                "my loyalty",
                "my points",
                "my invoice",
                "my invoices",
                "my wallet",
                "my cancellation",
            )
        )

    async def build_bundle(self, message: str, user_role: str) -> dict:
        """Build retrieval context for the current message."""
        booking_intent = self.is_booking_intent(message)
        provider_detail_intent = self.is_provider_detail_intent(message)
        system_explanation_intent = self.is_system_explanation_intent(message)

        provider_matches = await self.search_providers(
            message=message,
            user_role=user_role,
            limit=3 if (booking_intent or provider_detail_intent) else 2,
        )
        knowledge_chunks = self.search_knowledge(
            message,
            limit=4 if provider_matches else 5,
        )

        return {
            "message": message,
            "booking_intent": booking_intent,
            "provider_detail_intent": provider_detail_intent,
            "system_explanation_intent": system_explanation_intent,
            "provider_matches": provider_matches,
            "knowledge_chunks": knowledge_chunks,
            "provider_context": self.format_provider_context(provider_matches),
            "knowledge_context": self.format_knowledge_context(knowledge_chunks),
        }

    async def search_providers(
        self,
        message: str,
        user_role: str,
        limit: int = 3,
    ) -> list[RetrievedProvider]:
        """Search live provider records using a lightweight ranker."""
        query = (
            select(ServiceProvider)
            .options(
                joinedload(ServiceProvider.user),
                joinedload(ServiceProvider.category),
            )
        )
        if user_role != UserRole.ADMIN.value:
            query = query.where(ServiceProvider.is_verified.is_(True))

        result = await self.db.execute(query)
        providers = result.unique().scalars().all()

        scored: list[RetrievedProvider] = []
        for provider in providers:
            score, reasons = self._score_provider(message, provider)
            if score <= 0:
                continue
            scored.append(
                RetrievedProvider(
                    provider=provider,
                    score=score,
                    reasons=tuple(sorted(reasons)),
                )
            )

        scored.sort(key=lambda item: item.score, reverse=True)
        if not scored:
            return []

        top_score = scored[0].score
        filtered = [item for item in scored if item.score >= max(3.0, top_score * 0.45)]
        return filtered[:limit]

    def search_knowledge(self, message: str, limit: int = 4) -> list[KnowledgeChunk]:
        """Search project docs for the most relevant chunks."""
        query_tokens = _tokenize(message)
        raw_query = message.lower().strip()
        expanded_tokens = self._expand_query_tokens(query_tokens, raw_query)
        scored: list[tuple[float, KnowledgeChunk]] = []

        for chunk in self._load_knowledge_chunks():
            text = chunk.combined.lower()
            chunk_tokens = _tokenize(text)
            overlap = set(expanded_tokens) & set(chunk_tokens)
            score = float(sum(2.5 if len(token) > 6 else 1.5 for token in overlap))

            if raw_query and raw_query in text:
                score += 8

            if any(token in chunk.title.lower() for token in query_tokens):
                score += 2

            if any(token in chunk.title.lower() for token in expanded_tokens):
                score += 1.5

            if self._chunk_matches_role(chunk, raw_query):
                score += 1

            if score > 0:
                scored.append((score, chunk))

        scored.sort(key=lambda item: item[0], reverse=True)
        return [chunk for _, chunk in scored[:limit]]

    def build_direct_reply(
        self,
        message: str,
        bundle: dict,
        user_role: str,
        user_context: str = "",
    ) -> str | None:
        """Answer some queries directly from retrieved context for accuracy."""
        q = message.lower()

        if bundle["system_explanation_intent"]:
            return (
                "I first retrieve live AppointEase data and project knowledge, then I may send that "
                "retrieved context to Gemini or Grok to phrase the reply. Gemini does not directly create "
                "appointments in your database. Booking is done by your own AppointEase APIs like provider "
                "search, availability lookup, and `/appointments`."
            )

        if bundle["provider_detail_intent"] and bundle["provider_matches"]:
            return self._build_provider_reply(bundle["provider_matches"], user_role)

        if self.is_provider_scope_intent(message) and user_role == UserRole.PROVIDER.value:
            section = self._extract_section(user_context, ("Recent Provider Appointments:", "Provider Stats:"))
            if section:
                return section

        if self.is_customer_scope_intent(message) and user_role == UserRole.CUSTOMER.value:
            section = self._extract_section(user_context, ("Recent Customer Appointments:", "Customer Stats:"))
            if section:
                return section

        if self.is_recent_appointments_intent(message):
            if user_role == UserRole.ADMIN.value:
                section = self._extract_section(user_context, ("Recent Platform Appointments:", "Platform Stats:"))
                if section:
                    return section
            elif user_role == UserRole.PROVIDER.value:
                section = self._extract_section(user_context, ("Recent Provider Appointments:", "Provider Stats:"))
                if section:
                    return section
            else:
                section = self._extract_section(user_context, ("Recent Customer Appointments:", "Customer Stats:"))
                if section:
                    return section

        if bundle["booking_intent"] and bundle["provider_matches"] and user_role == UserRole.CUSTOMER.value:
            names = ", ".join(
                match.provider.user.full_name
                for match in bundle["provider_matches"]
                if match.provider.user
            )
            return (
                f"I found matching providers from live data: {names}. "
                "Choose one of the options below and I’ll continue with the booking flow."
            )

        if self.is_stats_intent(message):
            stats_lines = self._extract_section(
                user_context=user_context,
                heading_markers=(
                    "Customer Stats:",
                    "Provider Stats:",
                    "Platform Stats:",
                ),
            )
            if stats_lines:
                return stats_lines

        return None

    def build_fallback_reply(self, bundle: dict, user_context: str, user_role: str) -> str:
        """Return a retrieval-only fallback when no LLM reply is available."""
        direct = self.build_direct_reply(bundle.get("message", ""), bundle, user_role, user_context)
        if direct:
            return direct

        relevant_lines = self._pick_best_context_lines(bundle.get("message", ""), user_context)
        if relevant_lines:
            return (
                f"Here is the most relevant live context I found: {relevant_lines}. "
                "I can also help with provider details, booking, or platform navigation."
            )

        if bundle["knowledge_chunks"]:
            top_chunk = bundle["knowledge_chunks"][0]
            excerpt = _truncate(top_chunk.body, 220)
            return f"{top_chunk.title}: {excerpt}"

        return "I couldn't find enough context for that yet. Try asking about a provider, booking, or your account data."

    def _pick_best_context_lines(self, message: str, user_context: str) -> str | None:
        """Select the most relevant section from the live user context."""
        lines = [line.strip() for line in user_context.splitlines() if line.strip()]
        q = message.lower()

        section_keywords = [
            ("Recent Provider Appointments:", (
                "recent appointment",
                "recent booking",
                "recent bookings",
                "upcoming appointment",
                "upcoming appointments",
                "my appointments",
                "my schedule",
                "pending requests",
                "appointment requests",
                "today schedule",
                "today's schedule",
                "today appointments",
                "today's appointments",
                "ratings",
                "reviews",
            )),
            ("Recent Customer Appointments:", (
                "recent appointment",
                "recent booking",
                "recent bookings",
                "upcoming appointment",
                "upcoming appointments",
                "my appointments",
                "my bookings",
            )),
            ("Recent Platform Appointments:", (
                "recent appointment",
                "recent booking",
                "recent bookings",
                "today",
                "reports",
            )),
            ("Provider Stats:", ("provider stats", "provider profile", "schedule", "rating", "revenue")),
            ("Customer Stats:", ("customer stats", "customer profile", "booking", "invoice", "loyalty", "points")),
            ("Platform Stats:", ("platform overview", "today", "stats", "report", "revenue", "booking")),
        ]

        for marker, keywords in section_keywords:
            if any(keyword in q for keyword in keywords):
                extracted = self._extract_section(user_context, (marker,))
                if extracted:
                    return extracted

        if user_context:
            if "provider" in q:
                extracted = self._extract_section(user_context, ("Recent Provider Appointments:", "Provider Stats:"))
                if extracted:
                    return extracted
            if "customer" in q:
                extracted = self._extract_section(user_context, ("Recent Customer Appointments:", "Customer Stats:"))
                if extracted:
                    return extracted
            if any(word in q for word in ("report", "revenue", "overview", "stats")):
                extracted = self._extract_section(user_context, ("Recent Platform Appointments:", "Platform Stats:"))
                if extracted:
                    return extracted

        for line in lines:
            if not line.startswith("User:"):
                return line
        return None

    def _extract_section(self, user_context: str, heading_markers: tuple[str, ...]) -> str | None:
        """Extract a section of the live context by heading."""
        lines = user_context.splitlines()
        for index, line in enumerate(lines):
            if any(line.startswith(marker) for marker in heading_markers):
                collected = [line]
                for next_line in lines[index + 1 :]:
                    if not next_line.strip():
                        break
                    if next_line.startswith("User:") or next_line.endswith(":"):
                        break
                    collected.append(next_line)
                return "\n".join(collected).strip()
        return None

    def format_provider_context(self, matches: list[RetrievedProvider]) -> str:
        """Format retrieved provider records for the LLM prompt."""
        if not matches:
            return "No strongly matching live provider records were retrieved."

        lines = ["LIVE PROVIDER MATCHES:"]
        for idx, match in enumerate(matches, start=1):
            provider = match.provider
            user = provider.user
            category = provider.category
            description = _truncate(provider.profile_description or "No description provided.", 220)
            lines.append(
                (
                    f"{idx}. {user.full_name if user else 'Unknown provider'} | "
                    f"Specialization: {provider.specialization} | "
                    f"Category: {category.name if category else 'Uncategorized'} | "
                    f"Location: {provider.area + ', ' if provider.area else ''}{provider.location} | "
                    f"Experience: {provider.experience_years} years | "
                    f"Rating: {provider.rating:.1f}/5 from {provider.total_reviews} reviews | "
                    f"Hourly rate: ₹{provider.hourly_rate or 0:.0f} | "
                    f"Verified: {'yes' if provider.is_verified else 'no'} | "
                    f"Reason: {', '.join(match.reasons) if match.reasons else 'general similarity'} | "
                    f"Description: {description}"
                )
            )
        return "\n".join(lines)

    def format_knowledge_context(self, chunks: list[KnowledgeChunk]) -> str:
        """Format knowledge chunks for the LLM prompt."""
        if not chunks:
            return "No matching project-knowledge chunks were retrieved."

        lines = ["RETRIEVED PROJECT KNOWLEDGE:"]
        for chunk in chunks:
            lines.append(
                f"- [{chunk.source}] {chunk.title}: {_truncate(chunk.body, 260)}"
            )
        return "\n".join(lines)

    def _build_provider_reply(
        self,
        matches: list[RetrievedProvider],
        user_role: str,
    ) -> str:
        """Create a concise provider summary."""
        if not matches:
            return "I couldn't find a matching provider in the live database."

        if len(matches) == 1 or (len(matches) > 1 and matches[0].score >= matches[1].score + 3):
            provider = matches[0].provider
            user = provider.user
            category = provider.category
            description = _truncate(provider.profile_description or "No description available.", 180)
            status = "verified" if provider.is_verified else "pending approval"
            return (
                f"{user.full_name if user else 'This provider'} is a {status} "
                f"{category.name if category else 'service'} provider specializing in {provider.specialization}. "
                f"They are based in {provider.area + ', ' if provider.area else ''}{provider.location}, "
                f"have {provider.experience_years} years of experience, a {provider.rating:.1f}/5 rating "
                f"from {provider.total_reviews} reviews, and charge ₹{provider.hourly_rate or 0:.0f}/hour. "
                f"{description}"
            )

        parts = []
        for match in matches[:3]:
            provider = match.provider
            user = provider.user
            category = provider.category
            parts.append(
                f"{user.full_name if user else 'Unknown'} ({provider.specialization}, "
                f"{category.name if category else 'service'}, {provider.location}, "
                f"₹{provider.hourly_rate or 0:.0f}/hr, {provider.rating:.1f}/5)"
            )

        if user_role == UserRole.CUSTOMER.value:
            return (
                "I found multiple matching providers in the live database: "
                + "; ".join(parts)
                + ". Open one of the profiles below, or ask me to book with a specific provider."
            )

        return "I found these matching providers: " + "; ".join(parts) + "."

    @classmethod
    def _load_knowledge_chunks(cls) -> tuple["KnowledgeChunk", ...]:
        """Load searchable project knowledge, refreshing if source files have changed."""
        # Build a cache key from the sha256 of each file's content
        cache_key_parts = []
        for file_path in KNOWLEDGE_FILES:
            if file_path.exists():
                h = hashlib.sha256(file_path.read_bytes()).hexdigest()[:16]
                cache_key_parts.append((file_path.name, h))
        cache_key = tuple(cache_key_parts)

        if cache_key in _KNOWLEDGE_CACHE:
            return _KNOWLEDGE_CACHE[cache_key]

        chunks: list[KnowledgeChunk] = []
        for file_path in KNOWLEDGE_FILES:
            if not file_path.exists():
                continue
            content = file_path.read_text(encoding="utf-8")
            sections = cls._split_markdown_sections(content)
            for title, body in sections:
                for fragment in cls._chunk_section_body(body):
                    cleaned = fragment.strip()
                    if cleaned:
                        chunks.append(KnowledgeChunk(source=file_path.name, title=title, body=cleaned))

        result = tuple(chunks)
        _KNOWLEDGE_CACHE.clear()  # Only keep the most recent version
        _KNOWLEDGE_CACHE[cache_key] = result
        return result

    @staticmethod
    def _split_markdown_sections(content: str) -> list[tuple[str, str]]:
        """Split markdown into titled sections."""
        sections: list[tuple[str, str]] = []
        current_title = "Overview"
        current_lines: list[str] = []

        for line in content.splitlines():
            if line.startswith("#"):
                body = "\n".join(current_lines).strip()
                if body:
                    sections.append((current_title, body))
                current_title = line.lstrip("#").strip() or "Untitled"
                current_lines = []
                continue
            current_lines.append(line)

        body = "\n".join(current_lines).strip()
        if body:
            sections.append((current_title, body))
        return sections

    @staticmethod
    def _chunk_section_body(body: str, max_chars: int = 900) -> list[str]:
        """Keep sections compact so retrieval remains focused."""
        paragraphs = [part.strip() for part in body.split("\n\n") if part.strip()]
        chunks: list[str] = []
        current = ""

        for paragraph in paragraphs:
            candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
            if len(candidate) <= max_chars:
                current = candidate
                continue
            if current:
                chunks.append(current)
            current = paragraph

        if current:
            chunks.append(current)
        return chunks

    def _score_provider(
        self,
        message: str,
        provider: ServiceProvider,
    ) -> tuple[float, set[str]]:
        """Score a provider against the current query."""
        query_tokens = self._expand_query_tokens(_tokenize(message), message.lower())
        if not query_tokens:
            return 0.0, set()

        user = provider.user
        category = provider.category

        name_text = (user.full_name if user else "").lower()
        specialization_text = (provider.specialization or "").lower()
        category_text = (category.name if category else "").lower()
        location_text = " ".join(
            part
            for part in (provider.area or "", provider.location or "", provider.pincode or "")
            if part
        ).lower()
        description_text = (provider.profile_description or "").lower()

        score = 0.0
        reasons: set[str] = set()
        raw_query = message.lower().strip()

        for token in query_tokens:
            if token in name_text:
                score += 7
                reasons.add("name")
            if token in specialization_text:
                score += 5
                reasons.add("specialization")
            if token in category_text:
                score += 4
                reasons.add("category")
            if token in location_text:
                score += 3
                reasons.add("location")
            if token in description_text:
                score += 1.5
                reasons.add("description")

        if raw_query and raw_query in name_text:
            score += 10
            reasons.add("exact name")
        if raw_query and raw_query in specialization_text:
            score += 7
            reasons.add("exact specialization")
        if raw_query and raw_query in category_text:
            score += 6
            reasons.add("exact category")

        return score, reasons

    @staticmethod
    def _expand_query_tokens(tokens: list[str], raw_query: str) -> list[str]:
        """Expand shorthand and common synonyms so retrieval is less brittle."""
        expansions = {
            "doc": ["doctor", "medical"],
            "dr": ["doctor"],
            "med": ["medical", "health"],
            "healthcare": ["doctor", "clinic", "medical"],
            "dental": ["dentist", "teeth"],
            "beauty": ["salon", "wellness"],
            "fitness": ["gym", "training"],
            "legal": ["lawyer", "consultation"],
            "provider": ["specialist", "doctor", "expert"],
            "appointment": ["booking", "schedule"],
            "schedule": ["booking", "availability"],
            "revenue": ["income", "earnings", "payment", "invoice"],
            "ratings": ["rating", "review", "feedback", "stars"],
            "overview": ["summary", "dashboard", "stats"],
        }
        expanded = list(tokens)
        raw_words = set(re.findall(r"[a-zA-Z0-9]+", raw_query.lower()))
        for token in tokens:
            expanded.extend(expansions.get(token, []))
        for word in raw_words:
            expanded.extend(expansions.get(word, []))
        return expanded

    @staticmethod
    def _chunk_matches_role(chunk: KnowledgeChunk, raw_query: str) -> bool:
        """Prefer chunks that clearly match the user's workflow intent."""
        role_hints = {
            "provider": ("provider", "availability", "ratings", "revenue", "appointment"),
            "admin": ("admin", "platform", "reports", "approvals", "users", "categories"),
            "customer": ("customer", "booking", "wallet", "loyalty", "favorites"),
        }
        lower = f"{chunk.title}\n{chunk.body}".lower()
        if any(hint in raw_query for hint in role_hints["provider"]) and "provider" in lower:
            return True
        if any(hint in raw_query for hint in role_hints["admin"]) and "platform" in lower:
            return True
        if any(hint in raw_query for hint in role_hints["customer"]) and ("customer" in lower or "booking" in lower):
            return True
        return False


def _tokenize(text: str) -> list[str]:
    """Normalize text into searchable keywords."""
    tokens: list[str] = []
    for raw_token in re.findall(r"[a-zA-Z0-9]+", text.lower()):
        token = _normalize_token(raw_token)
        if len(token) < 2 or token in STOPWORDS:
            continue
        tokens.append(token)
    return tokens


def _normalize_token(token: str) -> str:
    """Light stemming for plural/service words."""
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 4 and token.endswith("s"):
        return token[:-1]
    return token


def _truncate(text: str, max_chars: int) -> str:
    """Truncate long strings cleanly."""
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3].rstrip() + "..."
