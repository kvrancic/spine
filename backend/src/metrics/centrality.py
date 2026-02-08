"""Centrality metrics for the communication graph."""

import networkx as nx


def compute_centrality(G: nx.DiGraph) -> dict[str, dict[str, float]]:
    """Compute multiple centrality measures for every node.

    Returns dict: {node_id: {metric_name: value}}
    """
    results: dict[str, dict[str, float]] = {}

    # Initialize all nodes
    for node in G.nodes():
        results[node] = {}

    # Degree centrality (normalized)
    in_deg = nx.in_degree_centrality(G)
    out_deg = nx.out_degree_centrality(G)
    for node in G.nodes():
        results[node]["in_degree_centrality"] = in_deg.get(node, 0)
        results[node]["out_degree_centrality"] = out_deg.get(node, 0)
        results[node]["degree_centrality"] = in_deg.get(node, 0) + out_deg.get(node, 0)

    # Betweenness centrality
    betweenness = nx.betweenness_centrality(G, weight="weight", normalized=True)
    for node in G.nodes():
        results[node]["betweenness_centrality"] = betweenness.get(node, 0)

    # Eigenvector centrality (on undirected projection for convergence)
    try:
        G_undirected = G.to_undirected()
        eigenvector = nx.eigenvector_centrality(G_undirected, max_iter=1000, weight="weight")
    except nx.PowerIterationFailedConvergence:
        eigenvector = nx.eigenvector_centrality_numpy(G_undirected, weight="weight")
    for node in G.nodes():
        results[node]["eigenvector_centrality"] = eigenvector.get(node, 0)

    # PageRank
    pagerank = nx.pagerank(G, weight="weight")
    for node in G.nodes():
        results[node]["pagerank"] = pagerank.get(node, 0)

    return results
