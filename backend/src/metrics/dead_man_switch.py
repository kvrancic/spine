"""Dead-Man-Switch: Critical node identification."""

import networkx as nx


def compute_dead_man_switch(
    G: nx.DiGraph,
    w_betweenness: float = 0.4,
    w_eigenvector: float = 0.3,
    w_redundancy: float = 0.3,
) -> list[dict]:
    """Rank how critical each person is to the organization.

    DMS(v) = w1·norm(betweenness(v)) + w2·norm(eigenvector(v)) - w3·norm(redundancy(v))

    Higher DMS = more critical (more damage if removed).

    Returns sorted list (highest first):
        [{id, name, dms_score, betweenness, eigenvector, redundancy, impact_pct}]
    """
    if G.number_of_nodes() == 0:
        return []

    # Compute centrality measures
    betweenness = nx.betweenness_centrality(G, normalized=True)

    G_undirected = G.to_undirected()
    try:
        eigenvector = nx.eigenvector_centrality(G_undirected, max_iter=1000, weight="weight")
    except (nx.PowerIterationFailedConvergence, nx.NetworkXError):
        try:
            eigenvector = nx.eigenvector_centrality_numpy(G_undirected, weight="weight")
        except Exception:
            eigenvector = {n: 0.0 for n in G.nodes()}

    # Compute redundancy: for each node, count alternative shortest paths
    # that don't go through this node (approximation: node connectivity)
    # Use a simpler metric: ratio of graph that remains connected if node removed
    total_nodes = G.number_of_nodes()

    # Normalize to 0-1
    max_betw = max(betweenness.values()) if betweenness else 1
    max_eigen = max(eigenvector.values()) if eigenvector else 1

    results = []
    for node in G.nodes():
        norm_betw = betweenness.get(node, 0) / max_betw if max_betw > 0 else 0
        norm_eigen = eigenvector.get(node, 0) / max_eigen if max_eigen > 0 else 0

        # Redundancy: what fraction of the graph stays connected without this node?
        G_removed = G.copy()
        G_removed.remove_node(node)

        if G_removed.number_of_nodes() > 0:
            # Use weakly connected components for directed graph
            largest_cc = max(nx.weakly_connected_components(G_removed), key=len)
            reachable_pct = len(largest_cc) / (total_nodes - 1)
        else:
            reachable_pct = 0

        redundancy = reachable_pct  # high redundancy = less critical
        impact_pct = round((1 - reachable_pct) * 100, 1)

        dms_score = (
            w_betweenness * norm_betw
            + w_eigenvector * norm_eigen
            - w_redundancy * redundancy
        )

        results.append({
            "id": node,
            "name": G.nodes[node].get("name", node),
            "dms_score": round(dms_score, 4),
            "betweenness": round(betweenness.get(node, 0), 6),
            "eigenvector": round(eigenvector.get(node, 0), 6),
            "redundancy": round(redundancy, 4),
            "impact_pct": impact_pct,
        })

    results.sort(key=lambda x: x["dms_score"], reverse=True)
    return results
