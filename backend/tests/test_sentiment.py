"""Tests for sentiment analysis module."""

from datetime import datetime, timezone

from src.graph.builder import build_graph
from src.graph.weights import compute_weights
from src.parser.email_parser import ParsedEmail
from src.sentiment.analyzer import analyze_sentiment, enrich_graph_with_sentiment


def make_email(sender, to, subject, body, date=None):
    return ParsedEmail(
        message_id=f"<{hash(body) % 100000}@test>",
        sender=sender,
        recipients_to=to,
        recipients_cc=[],
        recipients_bcc=[],
        subject=subject,
        body=body,
        date=date or datetime(2001, 5, 14, tzinfo=timezone.utc),
    )


class TestAnalyzeSentiment:
    def test_positive_text(self):
        polarity = analyze_sentiment(
            "This is wonderful! Great job, I'm really happy with the results. Excellent work!"
        )
        assert polarity > 0

    def test_negative_text(self):
        polarity = analyze_sentiment(
            "This is terrible and frustrating. The results are awful and disappointing. Very bad."
        )
        assert polarity < 0

    def test_neutral_text(self):
        polarity = analyze_sentiment(
            "The meeting is scheduled for Tuesday at 3pm in the conference room."
        )
        assert -0.2 < polarity < 0.2

    def test_range(self):
        polarity = analyze_sentiment("Some text here")
        assert -1 <= polarity <= 1


class TestEnrichGraph:
    def test_edge_sentiment_added(self):
        emails = [
            make_email("a@enron.com", ["b@enron.com"], "Good news",
                       "This is great! Wonderful results, I'm very happy!"),
            make_email("a@enron.com", ["b@enron.com"], "More good news",
                       "Excellent progress! Keep up the amazing work!"),
            make_email("a@enron.com", ["b@enron.com"], "Still good",
                       "Everything is going perfectly!"),
        ]
        G = build_graph(emails, min_emails=1)
        G = compute_weights(G)
        G = enrich_graph_with_sentiment(G, emails, progress=False)

        edge = G["a@enron.com"]["b@enron.com"]
        assert "sentiment" in edge
        assert edge["sentiment"] > 0

    def test_node_sentiment_added(self):
        emails = [
            make_email("a@enron.com", ["b@enron.com"], "Test",
                       "Great job! This is amazing!"),
            make_email("a@enron.com", ["b@enron.com"], "Test2",
                       "Wonderful work! I love it!"),
            make_email("a@enron.com", ["b@enron.com"], "Test3",
                       "Fantastic results! Very positive outcome!"),
        ]
        G = build_graph(emails, min_emails=1)
        G = compute_weights(G)
        G = enrich_graph_with_sentiment(G, emails, progress=False)

        assert "avg_sent_sentiment" in G.nodes["a@enron.com"]
        assert G.nodes["a@enron.com"]["avg_sent_sentiment"] > 0
