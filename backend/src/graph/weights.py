"""Edge weight computation for the communication graph."""

from datetime import datetime, timezone

import networkx as nx
import numpy as np


def compute_weights(
    G: nx.DiGraph,
    alpha: float = 0.4,  # frequency weight
    beta: float = 0.2,   # recency weight
    gamma: float = 0.2,  # sentiment weight (placeholder, enriched in Step 5)
    delta: float = 0.2,  # response efficiency weight (placeholder)
    reference_date: datetime | None = None,
    decay_days: float = 180.0,
) -> nx.DiGraph:
    """Compute composite edge weights.

    w(i→j) = α·norm(frequency) + β·norm(recency) + γ·norm(sentiment) + δ·norm(response_efficiency)

    Sentiment and response_efficiency are set to neutral (0.5) initially.
    They get enriched in later pipeline steps.
    """
    if G.number_of_edges() == 0:
        return G

    # Collect raw values
    counts = []
    recencies = []

    if reference_date is None:
        # Use the most recent email date across all edges
        latest = None
        for _, _, data in G.edges(data=True):
            le = data.get("last_email")
            if le is not None:
                if latest is None or le > latest:
                    latest = le
        if latest is not None:
            reference_date = latest
        else:
            reference_date = datetime.now(timezone.utc)

    # Make reference_date offset-aware if needed
    if reference_date.tzinfo is None:
        reference_date = reference_date.replace(tzinfo=timezone.utc)

    for _, _, data in G.edges(data=True):
        counts.append(data.get("email_count", 1))

        last_email = data.get("last_email")
        if last_email is not None:
            if last_email.tzinfo is None:
                last_email = last_email.replace(tzinfo=timezone.utc)
            days_ago = (reference_date - last_email).total_seconds() / 86400
            recency = np.exp(-days_ago / decay_days)
        else:
            recency = 0.5  # neutral if unknown
        recencies.append(recency)

    # Normalize frequency to 0-1
    counts_arr = np.array(counts, dtype=float)
    max_count = counts_arr.max()
    if max_count > 0:
        norm_freq = counts_arr / max_count
    else:
        norm_freq = np.zeros_like(counts_arr)

    norm_recency = np.array(recencies, dtype=float)

    # Compute composite weights
    for i, (u, v, data) in enumerate(G.edges(data=True)):
        sentiment = data.get("sentiment", 0.5)  # neutral default
        response_eff = data.get("response_efficiency", 0.5)  # neutral default

        weight = (
            alpha * norm_freq[i]
            + beta * norm_recency[i]
            + gamma * sentiment
            + delta * response_eff
        )
        data["weight"] = float(weight)
        data["norm_frequency"] = float(norm_freq[i])
        data["norm_recency"] = float(norm_recency[i])

    return G
