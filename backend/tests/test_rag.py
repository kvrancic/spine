"""Tests for RAG module — requires OPENAI_API_KEY and ChromaDB to be populated."""

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

needs_openai = pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set",
)

needs_chroma = pytest.mark.skipif(
    not (Path(__file__).resolve().parents[1] / "chroma_data").exists(),
    reason="ChromaDB not populated — run embed_pipeline first",
)


class TestPrompts:
    def test_build_chat_messages(self):
        from src.rag.prompts import build_chat_messages
        messages = build_chat_messages("Who is important?", "context here")
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert "context here" in messages[1]["content"]

    def test_build_chat_with_history(self):
        from src.rag.prompts import build_chat_messages
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
        ]
        messages = build_chat_messages("Follow up", "context", history=history)
        assert len(messages) == 4  # system + 2 history + user

    def test_build_report_messages(self):
        from src.rag.prompts import build_report_messages
        messages = build_report_messages("org data here")
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "diagnostic report" in messages[0]["content"].lower()


@needs_openai
@needs_chroma
class TestRetriever:
    def test_retrieve_context(self):
        from src.rag.retriever import retrieve_context
        context = retrieve_context("Who communicates the most?")
        assert len(context) > 100
        assert "Relevant Emails" in context
        assert "Organization Overview" in context

    def test_extract_mentioned_people(self):
        from src.rag.retriever import extract_mentioned_people, load_graph_data
        graph_data = load_graph_data()
        # Sally Beck should be found
        mentioned = extract_mentioned_people("Tell me about Sally Beck", graph_data)
        assert len(mentioned) > 0
