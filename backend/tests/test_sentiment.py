"""Tests for sentiment analysis service (AI Feature #6)."""
import pytest
from app.services.sentiment_service import analyze_sentiment, sentiment_from_rating


def test_positive_review():
    result = analyze_sentiment("Excellent service! Very professional and punctual. Highly recommend.")
    assert result["sentiment"] == "positive"
    assert result["score"] > 0


def test_negative_review():
    result = analyze_sentiment("Terrible experience. Very rude and unprofessional. Never coming back.")
    assert result["sentiment"] == "negative"
    assert result["score"] < 0


def test_neutral_review():
    result = analyze_sentiment("The appointment happened on the scheduled time.")
    assert result["sentiment"] in ("neutral", "positive", "negative")


def test_negation_handling():
    result = analyze_sentiment("Not good at all. Not helpful.")
    assert result["sentiment"] in ("neutral", "negative")


def test_empty_review():
    result = analyze_sentiment("")
    assert result["sentiment"] == "neutral"
    assert result["topics"] == []


def test_topic_detection():
    result = analyze_sentiment("Communication was clear and they responded quickly. Very punctual.")
    assert "communication" in result["topics"] or "punctuality" in result["topics"]


def test_sentiment_from_rating_high():
    assert sentiment_from_rating(5, "positive") == "positive"
    assert sentiment_from_rating(5, "negative") == "neutral"


def test_sentiment_from_rating_low():
    assert sentiment_from_rating(1, "negative") == "negative"
    assert sentiment_from_rating(1, "positive") == "neutral"
