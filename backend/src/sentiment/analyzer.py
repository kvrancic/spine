"""Sentiment analysis for emails and graph enrichment."""

from collections import defaultdict

import networkx as nx
from textblob import TextBlob

from src.parser.email_parser import ParsedEmail


def analyze_sentiment(text: str) -> float:
    """Return polarity score for text (-1 to +1)."""
    return TextBlob(text).sentiment.polarity


def compute_email_sentiments(emails: list[ParsedEmail], progress: bool = True) -> list[tuple[ParsedEmail, float]]:
    """Compute sentiment for each email.

    Returns list of (email, polarity) tuples.
    """
    results = []
    for i, email in enumerate(emails):
        polarity = analyze_sentiment(email.body)
        results.append((email, polarity))
        if progress and (i + 1) % 20000 == 0:
            print(f"  Sentiment: {i + 1}/{len(emails)} emails analyzed...")

    if progress:
        print(f"  Sentiment: {len(emails)}/{len(emails)} complete")
    return results


def enrich_graph_with_sentiment(
    G: nx.DiGraph,
    emails: list[ParsedEmail],
    progress: bool = True,
) -> nx.DiGraph:
    """Enrich graph edges with sentiment data.

    Adds to each edge:
    - sentiment: avg polarity of emails from source→target
    - sentiment_count: number of emails analyzed

    Adds to each node:
    - avg_sent_sentiment: avg polarity of emails sent by this person
    - avg_received_sentiment: avg polarity of emails received by this person
    """
    # Compute sentiments
    email_sentiments = compute_email_sentiments(emails, progress=progress)

    # Aggregate per-edge sentiment
    edge_sentiments: dict[tuple[str, str], list[float]] = defaultdict(list)
    node_sent_sentiments: dict[str, list[float]] = defaultdict(list)
    node_received_sentiments: dict[str, list[float]] = defaultdict(list)

    for email, polarity in email_sentiments:
        sender = email.sender
        all_recipients = email.recipients_to + email.recipients_cc + email.recipients_bcc

        node_sent_sentiments[sender].append(polarity)

        for recipient in all_recipients:
            if sender == recipient:
                continue
            edge_sentiments[(sender, recipient)].append(polarity)
            node_received_sentiments[recipient].append(polarity)

    # Apply to edges
    for (src, tgt), sentiments in edge_sentiments.items():
        if G.has_edge(src, tgt):
            avg_sentiment = sum(sentiments) / len(sentiments)
            G[src][tgt]["sentiment"] = round(avg_sentiment, 4)
            G[src][tgt]["sentiment_count"] = len(sentiments)

    # Apply to nodes
    for node in G.nodes():
        sent = node_sent_sentiments.get(node, [])
        received = node_received_sentiments.get(node, [])

        G.nodes[node]["avg_sent_sentiment"] = round(sum(sent) / len(sent), 4) if sent else 0
        G.nodes[node]["avg_received_sentiment"] = round(sum(received) / len(received), 4) if received else 0

    # Compute sentiment asymmetry per edge
    for u, v, data in G.edges(data=True):
        forward_sentiment = data.get("sentiment", 0)
        reverse_sentiment = G[v][u].get("sentiment", 0) if G.has_edge(v, u) else 0
        data["sentiment_asymmetry"] = round(abs(forward_sentiment - reverse_sentiment), 4)

    return G


def get_sentiment_summary(G: nx.DiGraph) -> dict:
    """Get summary sentiment statistics from the enriched graph."""
    all_sentiments = []
    negative_edges = []
    positive_edges = []

    for u, v, data in G.edges(data=True):
        s = data.get("sentiment")
        if s is not None:
            all_sentiments.append(s)
            if s < -0.1:
                negative_edges.append({
                    "source": u,
                    "target": v,
                    "sentiment": s,
                    "source_name": G.nodes[u].get("name", u),
                    "target_name": G.nodes[v].get("name", v),
                })
            elif s > 0.2:
                positive_edges.append({
                    "source": u,
                    "target": v,
                    "sentiment": s,
                    "source_name": G.nodes[u].get("name", u),
                    "target_name": G.nodes[v].get("name", v),
                })

    avg = sum(all_sentiments) / len(all_sentiments) if all_sentiments else 0

    # Distribution buckets
    buckets = {"very_negative": 0, "negative": 0, "neutral": 0, "positive": 0, "very_positive": 0}
    for s in all_sentiments:
        if s < -0.3:
            buckets["very_negative"] += 1
        elif s < -0.1:
            buckets["negative"] += 1
        elif s < 0.1:
            buckets["neutral"] += 1
        elif s < 0.3:
            buckets["positive"] += 1
        else:
            buckets["very_positive"] += 1

    # Sort for top/bottom
    negative_edges.sort(key=lambda x: x["sentiment"])
    positive_edges.sort(key=lambda x: x["sentiment"], reverse=True)

    return {
        "avg_sentiment": round(avg, 4),
        "total_edges_with_sentiment": len(all_sentiments),
        "distribution": buckets,
        "top_negative": negative_edges[:10],
        "top_positive": positive_edges[:10],
    }
