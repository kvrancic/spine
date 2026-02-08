"""Tests for graph metrics module."""

from datetime import datetime, timezone

import networkx as nx

from src.graph.builder import build_graph
from src.graph.weights import compute_weights
from src.metrics.centrality import compute_centrality
from src.metrics.community import detect_communities
from src.metrics.dead_man_switch import compute_dead_man_switch
from src.metrics.waste import compute_waste
from src.metrics.health import compute_health
from src.parser.email_parser import ParsedEmail


def make_email(sender, to, subject="Test", date=None, cc=None, bcc=None):
    return ParsedEmail(
        message_id=f"<{sender}-{to[0]}-{hash(subject) % 10000}@test>",
        sender=sender,
        recipients_to=to,
        recipients_cc=cc or [],
        recipients_bcc=bcc or [],
        subject=subject,
        body=f"Body of {subject}",
        date=date or datetime(2001, 5, 14, tzinfo=timezone.utc),
    )


def build_star_graph():
    """Build a star graph: center connected to 4 spokes."""
    emails = []
    center = "center@enron.com"
    spokes = [f"spoke{i}@enron.com" for i in range(4)]
    for spoke in spokes:
        for j in range(5):
            emails.append(make_email(center, [spoke], subject=f"msg{j}"))
            emails.append(make_email(spoke, [center], subject=f"reply{j}"))
    G = build_graph(emails, min_emails=1)
    return compute_weights(G)


def build_two_clusters():
    """Build two clusters connected by a bridge node."""
    emails = []
    # Cluster A: a0, a1, a2 (fully connected)
    for i in range(3):
        for j in range(3):
            if i != j:
                for k in range(5):
                    emails.append(make_email(
                        f"a{i}@enron.com", [f"a{j}@enron.com"], subject=f"a{i}a{j}_{k}"))

    # Cluster B: b0, b1, b2 (fully connected)
    for i in range(3):
        for j in range(3):
            if i != j:
                for k in range(5):
                    emails.append(make_email(
                        f"b{i}@enron.com", [f"b{j}@enron.com"], subject=f"b{i}b{j}_{k}"))

    # Bridge: a0 ↔ b0
    for k in range(5):
        emails.append(make_email("a0@enron.com", ["b0@enron.com"], subject=f"bridge_{k}"))
        emails.append(make_email("b0@enron.com", ["a0@enron.com"], subject=f"bridge_r{k}"))

    G = build_graph(emails, min_emails=1)
    return compute_weights(G), emails


class TestCentrality:
    def test_star_center_highest(self):
        G = build_star_graph()
        centrality = compute_centrality(G)

        center = centrality["center@enron.com"]
        for spoke_id in [f"spoke{i}@enron.com" for i in range(4)]:
            spoke = centrality[spoke_id]
            assert center["betweenness_centrality"] >= spoke["betweenness_centrality"]
            assert center["degree_centrality"] > spoke["degree_centrality"]

    def test_all_metrics_present(self):
        G = build_star_graph()
        centrality = compute_centrality(G)
        for node_id, metrics in centrality.items():
            assert "in_degree_centrality" in metrics
            assert "out_degree_centrality" in metrics
            assert "degree_centrality" in metrics
            assert "betweenness_centrality" in metrics
            assert "eigenvector_centrality" in metrics
            assert "pagerank" in metrics

    def test_pagerank_sums_to_one(self):
        G = build_star_graph()
        centrality = compute_centrality(G)
        pr_sum = sum(m["pagerank"] for m in centrality.values())
        assert abs(pr_sum - 1.0) < 0.01


class TestCommunity:
    def test_two_clusters_detected(self):
        G, _ = build_two_clusters()
        result = detect_communities(G)

        # Should detect at least 2 communities
        assert len(result["communities"]) >= 2
        assert result["modularity"] > 0

    def test_bridge_nodes_found(self):
        G, _ = build_two_clusters()
        result = detect_communities(G)

        # a0 or b0 should be bridge nodes (they connect the two clusters)
        bridge_set = set(result["bridge_nodes"])
        assert "a0@enron.com" in bridge_set or "b0@enron.com" in bridge_set

    def test_partition_covers_all_nodes(self):
        G, _ = build_two_clusters()
        result = detect_communities(G)
        assert set(result["partition"].keys()) == set(G.nodes())


class TestDeadManSwitch:
    def test_star_center_most_critical(self):
        G = build_star_graph()
        dms = compute_dead_man_switch(G)

        assert len(dms) > 0
        # Center should be most critical
        assert dms[0]["id"] == "center@enron.com"

    def test_scores_have_required_fields(self):
        G = build_star_graph()
        dms = compute_dead_man_switch(G)
        for entry in dms:
            assert "id" in entry
            assert "name" in entry
            assert "dms_score" in entry
            assert "betweenness" in entry
            assert "eigenvector" in entry
            assert "impact_pct" in entry


class TestWaste:
    def test_broadcaster_higher_waste(self):
        emails = []
        # Normal sender: sends to 1 person
        for i in range(10):
            emails.append(make_email("normal@enron.com", ["target@enron.com"], subject=f"n{i}"))
            emails.append(make_email("target@enron.com", ["normal@enron.com"], subject=f"r{i}"))

        # Broadcaster: sends to 7+ people
        recipients = [f"r{i}@enron.com" for i in range(7)]
        for i in range(10):
            emails.append(make_email("broadcaster@enron.com", recipients, subject=f"b{i}"))
        # Need return edges too
        for r in recipients:
            for i in range(3):
                emails.append(make_email(r, ["broadcaster@enron.com"], subject=f"re{i}"))

        G = build_graph(emails, min_emails=1)
        G = compute_weights(G)
        waste = compute_waste(G, emails)

        waste_map = {w["id"]: w for w in waste}
        assert waste_map["broadcaster@enron.com"]["broadcast_ratio"] > waste_map["normal@enron.com"]["broadcast_ratio"]

    def test_waste_score_range(self):
        emails = []
        for i in range(5):
            emails.append(make_email("a@enron.com", ["b@enron.com"], subject=f"s{i}"))
            emails.append(make_email("b@enron.com", ["a@enron.com"], subject=f"r{i}"))

        G = build_graph(emails, min_emails=1)
        G = compute_weights(G)
        waste = compute_waste(G, emails)

        for w in waste:
            assert 0 <= w["waste_score"] <= 100


class TestHealth:
    def test_health_score_range(self):
        G, emails = build_two_clusters()
        communities = detect_communities(G)
        health = compute_health(G, communities)

        assert 0 <= health["health_score"] <= 100
        assert health["grade"] in {"A", "B", "C", "D", "F"}

    def test_health_has_sub_scores(self):
        G, _ = build_two_clusters()
        communities = detect_communities(G)
        health = compute_health(G, communities)

        assert "connectivity" in health["sub_scores"]
        assert "bottleneck_risk" in health["sub_scores"]
        assert "silo_score" in health["sub_scores"]
        assert "efficiency" in health["sub_scores"]

    def test_health_has_stats(self):
        G, _ = build_two_clusters()
        communities = detect_communities(G)
        health = compute_health(G, communities)

        assert health["stats"]["node_count"] == G.number_of_nodes()
        assert health["stats"]["edge_count"] == G.number_of_edges()
