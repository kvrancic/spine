"""Tests for graph construction module."""

from datetime import datetime, timezone

import networkx as nx

from src.graph.builder import build_graph, extract_display_name
from src.graph.weights import compute_weights
from src.parser.email_parser import ParsedEmail


def make_email(sender, to, subject="Test", date=None, cc=None, bcc=None):
    """Helper to create a ParsedEmail for testing."""
    return ParsedEmail(
        message_id=f"<{sender}-{to[0]}-{hash(subject) % 10000}@enron.com>",
        sender=sender,
        recipients_to=to,
        recipients_cc=cc or [],
        recipients_bcc=bcc or [],
        subject=subject,
        body=f"Body of {subject}",
        date=date or datetime(2001, 5, 14, tzinfo=timezone.utc),
    )


class TestExtractDisplayName:
    def test_simple(self):
        assert extract_display_name("john.smith@enron.com") == "John Smith"

    def test_underscore(self):
        assert extract_display_name("john_smith@enron.com") == "John Smith"

    def test_single_name(self):
        assert extract_display_name("john@enron.com") == "John"


class TestBuildGraph:
    def test_basic_graph(self):
        emails = [
            make_email("a@enron.com", ["b@enron.com"]),
            make_email("a@enron.com", ["b@enron.com"], subject="Another"),
            make_email("a@enron.com", ["b@enron.com"], subject="Third"),
            make_email("b@enron.com", ["a@enron.com"]),
            make_email("b@enron.com", ["a@enron.com"], subject="Reply"),
            make_email("b@enron.com", ["a@enron.com"], subject="Reply2"),
        ]
        G = build_graph(emails, min_emails=3)
        assert G.number_of_nodes() == 2
        assert G.number_of_edges() == 2  # a→b and b→a
        assert G[("a@enron.com")]["b@enron.com"]["email_count"] == 3

    def test_threshold_filtering(self):
        emails = [
            make_email("a@enron.com", ["b@enron.com"]),
            make_email("a@enron.com", ["b@enron.com"], subject="Two"),
            # Only 2 emails a→b, below threshold of 3
        ]
        G = build_graph(emails, min_emails=3)
        assert G.number_of_edges() == 0

    def test_threshold_one(self):
        emails = [make_email("a@enron.com", ["b@enron.com"])]
        G = build_graph(emails, min_emails=1)
        assert G.number_of_edges() == 1

    def test_enron_only_filter(self):
        emails = [
            make_email("a@enron.com", ["external@gmail.com"]),
            make_email("a@enron.com", ["external@gmail.com"], subject="2"),
            make_email("a@enron.com", ["external@gmail.com"], subject="3"),
        ]
        G = build_graph(emails, min_emails=1, enron_only=True)
        # External recipient should not appear as a node
        assert "external@gmail.com" not in G.nodes()

    def test_self_email_excluded(self):
        emails = [
            make_email("a@enron.com", ["a@enron.com"]),
            make_email("a@enron.com", ["a@enron.com"], subject="2"),
            make_email("a@enron.com", ["a@enron.com"], subject="3"),
        ]
        G = build_graph(emails, min_emails=1)
        assert G.number_of_edges() == 0

    def test_node_attributes(self):
        emails = [
            make_email("john.smith@enron.com", ["jane.doe@enron.com"]),
            make_email("john.smith@enron.com", ["jane.doe@enron.com"], subject="2"),
            make_email("john.smith@enron.com", ["jane.doe@enron.com"], subject="3"),
        ]
        G = build_graph(emails, min_emails=1)
        node = G.nodes["john.smith@enron.com"]
        assert node["name"] == "John Smith"
        assert node["email"] == "john.smith@enron.com"
        assert node["total_sent"] == 3

    def test_cc_creates_edges(self):
        emails = [
            make_email("a@enron.com", ["b@enron.com"], cc=["c@enron.com"]),
            make_email("a@enron.com", ["b@enron.com"], cc=["c@enron.com"], subject="2"),
            make_email("a@enron.com", ["b@enron.com"], cc=["c@enron.com"], subject="3"),
        ]
        G = build_graph(emails, min_emails=3)
        assert G.has_edge("a@enron.com", "b@enron.com")
        assert G.has_edge("a@enron.com", "c@enron.com")

    def test_directed_edges(self):
        """a→b should be separate from b→a."""
        emails = [
            make_email("a@enron.com", ["b@enron.com"]),
            make_email("a@enron.com", ["b@enron.com"], subject="2"),
            make_email("a@enron.com", ["b@enron.com"], subject="3"),
        ]
        G = build_graph(emails, min_emails=1)
        assert G.has_edge("a@enron.com", "b@enron.com")
        assert not G.has_edge("b@enron.com", "a@enron.com")

    def test_edge_dates(self):
        emails = [
            make_email("a@enron.com", ["b@enron.com"], date=datetime(2001, 1, 1, tzinfo=timezone.utc)),
            make_email("a@enron.com", ["b@enron.com"], date=datetime(2001, 6, 1, tzinfo=timezone.utc), subject="2"),
            make_email("a@enron.com", ["b@enron.com"], date=datetime(2001, 12, 1, tzinfo=timezone.utc), subject="3"),
        ]
        G = build_graph(emails, min_emails=1)
        edge = G["a@enron.com"]["b@enron.com"]
        assert edge["first_email"] == datetime(2001, 1, 1, tzinfo=timezone.utc)
        assert edge["last_email"] == datetime(2001, 12, 1, tzinfo=timezone.utc)


class TestComputeWeights:
    def test_weights_in_range(self):
        emails = [
            make_email("a@enron.com", ["b@enron.com"], date=datetime(2001, 5, 1, tzinfo=timezone.utc)),
            make_email("a@enron.com", ["b@enron.com"], date=datetime(2001, 5, 2, tzinfo=timezone.utc), subject="2"),
            make_email("a@enron.com", ["b@enron.com"], date=datetime(2001, 5, 3, tzinfo=timezone.utc), subject="3"),
        ]
        G = build_graph(emails, min_emails=1)
        G = compute_weights(G)

        for _, _, data in G.edges(data=True):
            assert 0 <= data["weight"] <= 1.0
            assert "norm_frequency" in data
            assert "norm_recency" in data

    def test_higher_frequency_higher_weight(self):
        emails = []
        # a→b: 10 emails
        for i in range(10):
            emails.append(make_email("a@enron.com", ["b@enron.com"], subject=f"s{i}",
                                     date=datetime(2001, 5, 1, tzinfo=timezone.utc)))
        # a→c: 3 emails
        for i in range(3):
            emails.append(make_email("a@enron.com", ["c@enron.com"], subject=f"s{i}",
                                     date=datetime(2001, 5, 1, tzinfo=timezone.utc)))

        G = build_graph(emails, min_emails=1)
        G = compute_weights(G)

        w_ab = G["a@enron.com"]["b@enron.com"]["weight"]
        w_ac = G["a@enron.com"]["c@enron.com"]["weight"]
        assert w_ab > w_ac

    def test_more_recent_higher_recency(self):
        emails = [
            make_email("a@enron.com", ["b@enron.com"],
                       date=datetime(2001, 12, 1, tzinfo=timezone.utc)),
            make_email("a@enron.com", ["c@enron.com"],
                       date=datetime(2000, 1, 1, tzinfo=timezone.utc)),
        ]
        G = build_graph(emails, min_emails=1)
        G = compute_weights(G, reference_date=datetime(2001, 12, 31, tzinfo=timezone.utc))

        r_ab = G["a@enron.com"]["b@enron.com"]["norm_recency"]
        r_ac = G["a@enron.com"]["c@enron.com"]["norm_recency"]
        assert r_ab > r_ac
