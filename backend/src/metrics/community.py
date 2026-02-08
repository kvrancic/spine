"""Community detection using Louvain method."""

from collections import defaultdict

import community as community_louvain  # python-louvain
import networkx as nx


def detect_communities(G: nx.DiGraph) -> dict:
    """Detect communities using Louvain method on undirected projection.

    Returns:
        {
            "partition": {node_id: community_id},
            "communities": [
                {
                    "id": int,
                    "members": [node_id, ...],
                    "size": int,
                    "density": float,
                }
            ],
            "bridge_nodes": [node_id, ...],  # high betweenness + multi-community connections
            "modularity": float,
        }
    """
    G_undirected = G.to_undirected()

    # Run Louvain
    partition = community_louvain.best_partition(G_undirected, weight="weight")
    modularity = community_louvain.modularity(partition, G_undirected, weight="weight")

    # Group members by community
    community_members: dict[int, list[str]] = defaultdict(list)
    for node, comm_id in partition.items():
        community_members[comm_id].append(node)

    # Compute per-community stats
    communities = []
    for comm_id, members in sorted(community_members.items()):
        subgraph = G_undirected.subgraph(members)
        n = len(members)
        possible_edges = n * (n - 1) / 2 if n > 1 else 1
        density = subgraph.number_of_edges() / possible_edges if possible_edges > 0 else 0

        communities.append({
            "id": comm_id,
            "members": members,
            "size": n,
            "density": round(density, 4),
        })

    # Find bridge nodes: connected to multiple communities AND high betweenness
    betweenness = nx.betweenness_centrality(G, normalized=True)
    median_betweenness = sorted(betweenness.values())[len(betweenness) // 2] if betweenness else 0

    bridge_nodes = []
    for node in G.nodes():
        if betweenness.get(node, 0) < median_betweenness:
            continue
        # Count how many different communities this node's neighbors belong to
        neighbor_communities = set()
        for neighbor in set(G.predecessors(node)) | set(G.successors(node)):
            if neighbor in partition:
                neighbor_communities.add(partition[neighbor])
        if len(neighbor_communities) > 1:
            bridge_nodes.append(node)

    return {
        "partition": partition,
        "communities": communities,
        "bridge_nodes": bridge_nodes,
        "modularity": round(modularity, 4),
    }
