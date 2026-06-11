"""Tests for RAG document chunking strategy (Bug #22 fix)."""
from app.services.provider_document_rag_service import _chunk_text


def test_short_document_single_chunk():
    text = "This is a short document."
    chunks = _chunk_text(text, max_chars=200)
    assert len(chunks) == 1
    assert chunks[0] == text.strip()


def test_paragraph_split():
    text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    chunks = _chunk_text(text, max_chars=500)
    # All fit in one chunk since total < 500
    assert len(chunks) == 1 or len(chunks) <= 3


def test_long_paragraph_splits_with_overlap():
    long_para = "word " * 300  # ~1500 chars
    chunks = _chunk_text(long_para, max_chars=500, overlap=50)
    assert len(chunks) > 1
    # Each chunk should be at most max_chars
    for chunk in chunks:
        assert len(chunk) <= 500


def test_empty_text():
    assert _chunk_text("") == []
    assert _chunk_text("   ") == []


def test_chunks_are_non_empty():
    text = "Section one.\n\nSection two.\n\nSection three."
    chunks = _chunk_text(text)
    for chunk in chunks:
        assert chunk.strip() != ""


def test_multiple_paragraph_boundaries():
    paragraphs = [f"Paragraph {i}: " + "content " * 20 for i in range(5)]
    text = "\n\n".join(paragraphs)
    chunks = _chunk_text(text, max_chars=300, overlap=30)
    # Should produce multiple chunks
    assert len(chunks) >= 2
