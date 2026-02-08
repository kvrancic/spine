"""Org health score aggregation."""

import networkx as nx


def compute_health(
    G: nx.DiGraph,
    communities: dict,
    w_connectivity: float = 0.25,
    w_bottleneck: float = 0.25,
    w_silo: float = 0.25,
    w_efficiency: float = 0.25,
) -> dict:
    """Compute aggregate organizational health score.

    health = w1·connectivity + w2·(1-bottleneck_risk) + w3·(1-silo_score) + w4·efficiency

    Returns:
        {
            health_score: float (0-100),
            grade: str (A/B/C/D/F),
            sub_scores: {
                connectivity: float,
                bottleneck_risk: float,
                silo_score: float,
                efficiency: float,
            },
            stats: {node_count, edge_count, density, avg_path_length, ...}
        }
    """
    n_nodes = G.number_of_nodes()
    n_edges = G.number_of_edges()

    if n_nodes < 2:
        return {
            "health_score": 0,
            "grade": "F",
            "sub_scores": {
                "connectivity": 0, "bottleneck_risk": 1,
                "silo_score": 1, "efficiency": 0,
            },
            "stats": {"node_count": n_nodes, "edge_count": n_edges},
        }

    # === Connectivity Score ===
    # Based on: density + giant component ratio
    density = nx.density(G)
    # Giant component ratio (weakly connected)
    largest_wcc = max(nx.weakly_connected_components(G), key=len)
    gcc_ratio = len(largest_wcc) / n_nodes

    # Density is typically very low in large graphs — use log scale
    # For a graph with N nodes, density = E / N(N-1)
    # Scale: density of 0.01 → ~0.5, density of 0.1 → ~1.0
    import math
    density_score = min(1.0, (math.log10(density * 100 + 1) / 2)) if density > 0 else 0

    connectivity = 0.4 * density_score + 0.6 * gcc_ratio

    # === Bottleneck Risk ===
    # Max betweenness centrality — high = single points of failure
    betweenness = nx.betweenness_centrality(G, normalized=True)
    max_betweenness = max(betweenness.values()) if betweenness else 0
    # Also consider concentration: Gini coefficient of betweenness
    vals = sorted(betweenness.values())
    n = len(vals)
    if n > 0 and sum(vals) > 0:
        gini = sum((2 * (i + 1) - n - 1) * v for i, v in enumerate(vals)) / (n * sum(vals))
    else:
        gini = 0
    bottleneck_risk = 0.5 * max_betweenness + 0.5 * gini

    # === Silo Score ===
    # Ratio of inter-community to intra-community edges
    partition = communities.get("partition", {})
    if partition:
        intra = 0
        inter = 0
        for u, v in G.edges():
            if partition.get(u) == partition.get(v):
                intra += 1
            else:
                inter += 1
        total = intra + inter
        if total > 0:
            silo_score = 1 - (inter / total)  # high silo = few inter-community edges
        else:
            silo_score = 1
    else:
        silo_score = 0.5

    # === Efficiency ===
    # Based on avg shortest path length and clustering coefficient
    G_undirected = G.to_undirected()

    # Average path length (on giant component to avoid disconnected issues)
    gcc_subgraph = G_undirected.subgraph(largest_wcc)
    try:
        avg_path = nx.average_shortest_path_length(gcc_subgraph)
        # Normalize: path length of 2 → 1.0, path length of 10 → ~0.2
        path_score = max(0, 1 - (avg_path - 2) / 8)
    except nx.NetworkXError:
        path_score = 0.5

    # Clustering coefficient
    clustering = nx.average_clustering(G_undirected)

    efficiency = 0.6 * path_score + 0.4 * clustering

    # === Combine ===
    health_raw = (
        w_connectivity * connectivity
        + w_bottleneck * (1 - bottleneck_risk)
        + w_silo * (1 - silo_score)
        + w_efficiency * efficiency
    )
    health_score = round(health_raw * 100, 1)
    health_score = max(0, min(100, health_score))

    # Grade
    if health_score >= 90:
        grade = "A"
    elif health_score >= 80:
        grade = "B"
    elif health_score >= 65:
        grade = "C"
    elif health_score >= 50:
        grade = "D"
    else:
        grade = "F"

    return {
        "health_score": health_score,
        "grade": grade,
        "sub_scores": {
            "connectivity": round(connectivity * 100, 1),
            "bottleneck_risk": round(bottleneck_risk * 100, 1),
            "silo_score": round(silo_score * 100, 1),
            "efficiency": round(efficiency * 100, 1),
        },
        "stats": {
            "node_count": n_nodes,
            "edge_count": n_edges,
            "density": round(density, 6),
            "avg_path_length": round(avg_path, 2) if 'avg_path' in dir() else None,
            "clustering_coefficient": round(clustering, 4),
            "communities_count": len(communities.get("communities", [])),
            "modularity": communities.get("modularity", 0),
            "gcc_ratio": round(gcc_ratio, 4),
        },
    }
