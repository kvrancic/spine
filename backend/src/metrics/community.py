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

    # Assign heuristic labels
    labels = label_communities(communities, G, partition, betweenness)

    return {
        "partition": partition,
        "communities": communities,
        "bridge_nodes": bridge_nodes,
        "modularity": round(modularity, 4),
        "labels": labels,
    }


def label_communities(
    communities: list[dict],
    G: nx.DiGraph,
    partition: dict[str, int],
    betweenness: dict[str, float],
) -> dict[int, str]:
    """Assign descriptive labels to communities based on graph characteristics."""
    # Precompute per-community stats
    stats = []
    for comm in communities:
        members = comm["members"]
        size = comm["size"]
        density = comm["density"]

        avg_betw = (
            sum(betweenness.get(m, 0) for m in members) / size if size > 0 else 0
        )
        avg_degree = (
            sum(G.degree(m) for m in members if G.has_node(m)) / size
            if size > 0
            else 0
        )

        # Count bridge nodes (members connected to other communities)
        bridge_count = 0
        inter_edges = 0
        for m in members:
            if not G.has_node(m):
                continue
            for neighbor in set(G.predecessors(m)) | set(G.successors(m)):
                if neighbor in partition and partition[neighbor] != comm["id"]:
                    inter_edges += 1
                    bridge_count += 1
                    break  # only count member once as bridge

        bridge_ratio = bridge_count / size if size > 0 else 0

        stats.append({
            "id": comm["id"],
            "size": size,
            "density": density,
            "avg_betweenness": avg_betw,
            "avg_degree": avg_degree,
            "bridge_ratio": bridge_ratio,
            "inter_edges": inter_edges,
        })

    # Sort by avg_betweenness descending to assign labels
    ranked = sorted(stats, key=lambda s: s["avg_betweenness"], reverse=True)

    labels: dict[int, str] = {}
    ops_counter = 0

    for rank, s in enumerate(ranked):
        cid = s["id"]
        if s["size"] < 5:
            labels[cid] = "Small Team" if s["size"] >= 3 else "Working Pair"
        elif rank == 0 and s["bridge_ratio"] > 0.3:
            labels[cid] = "Executive & Strategy"
        elif s["density"] > 0.15 and s["size"] < 100:
            labels[cid] = "Specialized Unit"
        elif s["size"] > 500 and s["density"] < 0.02:
            labels[cid] = "Extended Network"
        elif s["avg_degree"] > 15 and s["inter_edges"] > 50:
            labels[cid] = "Trading & Communications"
        elif s["density"] > 0.05 and 20 < s["size"] < 500:
            labels[cid] = "Core Operations"
        else:
            ops_counter += 1
            labels[cid] = f"Operations Group {chr(64 + ops_counter)}"

    return labels
