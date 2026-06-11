"""
AI Feature #6 — Real-time sentiment analysis on reviews.

Uses VADER-style keyword scoring (pure Python, zero API calls) to classify
review sentiment and extract key topics. Results are persisted on the Review
model and aggregated per-provider.
"""

from __future__ import annotations

import json
import re
from typing import Any

# ── Sentiment word lists ───────────────────────────────────────────────
POSITIVE_WORDS = {
    "excellent", "amazing", "great", "good", "wonderful", "fantastic", "awesome",
    "outstanding", "superb", "brilliant", "perfect", "loved", "love", "best",
    "helpful", "professional", "friendly", "kind", "punctual", "efficient",
    "thorough", "expert", "knowledgeable", "recommend", "highly", "satisfied",
    "happy", "pleased", "impressed", "reliable", "trustworthy", "comfortable",
    "clean", "polite", "attentive", "caring", "experienced", "skilled", "top",
    "nice", "pleasant", "smooth", "quick", "fast", "clear", "honest",
}

NEGATIVE_WORDS = {
    "bad", "poor", "terrible", "awful", "horrible", "worst", "disappointing",
    "disappointed", "unprofessional", "rude", "late", "delay", "delayed",
    "waste", "overpriced", "expensive", "useless", "incompetent", "careless",
    "negligent", "slow", "unresponsive", "avoid", "never", "pathetic",
    "unpleasant", "uncomfortable", "dirty", "unhelpful", "wrong", "mistake",
    "error", "failed", "failure", "problem", "issue", "mess", "not good",
    "not helpful", "not satisfied", "not recommend",
}

NEGATION_WORDS = {"not", "no", "never", "isn't", "wasn't", "didn't", "don't", "doesn't", "wouldn't"}

# ── Topic keyword clusters ─────────────────────────────────────────────
TOPIC_CLUSTERS: dict[str, list[str]] = {
    "punctuality": ["on time", "punctual", "late", "delay", "early", "timing", "waited", "wait"],
    "communication": ["communication", "responsive", "response", "reply", "clear", "explained", "listen", "understood"],
    "expertise": ["expert", "knowledge", "skilled", "experienced", "professional", "qualified", "competent", "diagnosis"],
    "value": ["price", "cost", "worth", "value", "expensive", "affordable", "overpriced", "fee", "charge"],
    "cleanliness": ["clean", "hygiene", "hygienic", "sanitized", "tidy", "neat", "dirty"],
    "friendliness": ["friendly", "warm", "welcoming", "kind", "rude", "polite", "attentive", "caring"],
    "results": ["result", "outcome", "effective", "worked", "helped", "improved", "relief", "better", "worse"],
}


def analyze_sentiment(text: str) -> dict[str, Any]:
    """
    Score review text and return sentiment + topics.

    Returns:
        {
            "sentiment": "positive" | "neutral" | "negative",
            "score": float,        # -1.0 to 1.0
            "topics": list[str],   # detected topic clusters
        }
    """
    if not text or not text.strip():
        return {"sentiment": "neutral", "score": 0.0, "topics": []}

    lower = text.lower()
    tokens = re.findall(r"\b\w+\b", lower)

    pos_score = 0
    neg_score = 0

    # Simple sliding window negation check (window of 3 tokens)
    for i, token in enumerate(tokens):
        window_start = max(0, i - 3)
        preceding = tokens[window_start:i]
        is_negated = any(w in NEGATION_WORDS for w in preceding)

        if token in POSITIVE_WORDS:
            if is_negated:
                neg_score += 1
            else:
                pos_score += 1
        elif token in NEGATIVE_WORDS:
            if is_negated:
                pos_score += 0.5  # double negative = weak positive
            else:
                neg_score += 1

    # Also consider rating implicitly (not here — done in caller)
    total = pos_score + neg_score
    if total == 0:
        score = 0.0
    else:
        score = (pos_score - neg_score) / (total + 1)  # +1 smoothing

    if score > 0.15:
        sentiment = "positive"
    elif score < -0.15:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    # Topic detection
    topics: list[str] = []
    for topic, keywords in TOPIC_CLUSTERS.items():
        if any(kw in lower for kw in keywords):
            topics.append(topic)

    return {
        "sentiment": sentiment,
        "score": round(score, 3),
        "topics": topics,
    }


def sentiment_from_rating(rating: int, text_sentiment: str) -> str:
    """Combine text sentiment with numeric rating for a final verdict."""
    if rating >= 4:
        return "positive" if text_sentiment != "negative" else "neutral"
    elif rating <= 2:
        return "negative" if text_sentiment != "positive" else "neutral"
    return text_sentiment


async def analyze_and_persist(review: Any, db: Any) -> None:
    """
    Run sentiment analysis on a review and persist the results.
    Called from ReviewService after creating a review.
    """
    comment = review.comment or ""
    result = analyze_sentiment(comment)
    final_sentiment = sentiment_from_rating(review.rating, result["sentiment"])

    review.sentiment = final_sentiment
    review.sentiment_topics = json.dumps(result["topics"])
    await db.flush()
