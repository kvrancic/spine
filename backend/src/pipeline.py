"""Master pipeline: extract → parse → build → compute → export."""

import json
import time
from datetime import datetime
from pathlib import Path

from src.graph.builder import build_graph
from src.graph.weights import compute_weights
from src.metrics.centrality import compute_centrality
from src.metrics.community import detect_communities
from src.metrics.dead_man_switch import compute_dead_man_switch
from src.metrics.health import compute_health
from src.metrics.waste import compute_waste
from src.parser.email_parser import parse_all_emails
from src.parser.enron_extractor import extract_enron, DEFAULT_ARCHIVE, DEFAULT_OUTPUT
from src.sentiment.analyzer import enrich_graph_with_sentiment, get_sentiment_summary


OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"


def json_serial(obj):
    """JSON serializer for objects not serializable by default."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def run_pipeline(
    archive_path: Path = DEFAULT_ARCHIVE,
    maildir_path: Path = DEFAULT_OUTPUT,
    output_dir: Path = OUTPUT_DIR,
    min_emails: int = 3,
):
    """Run the full data pipeline."""
    start = time.time()

    # Step 1: Extract
    print("=" * 60)
    print("STEP 1: Extracting Enron dataset...")
    print("=" * 60)
    maildir = extract_enron(archive_path, maildir_path.parent)

    # Step 2: Parse
    print("\n" + "=" * 60)
    print("STEP 2: Parsing emails...")
    print("=" * 60)
    emails = parse_all_emails(maildir)
    print(f"  Total emails: {len(emails)}")

    # Step 3: Build graph
    print("\n" + "=" * 60)
    print("STEP 3: Building communication graph...")
    print("=" * 60)
    G = build_graph(emails, min_emails=min_emails)
    print(f"  Nodes: {G.number_of_nodes()}")
    print(f"  Edges: {G.number_of_edges()}")

    # Step 4: Compute edge weights
    print("\n  Computing edge weights...")
    G = compute_weights(G)

    # Step 5: Sentiment analysis + enrich edges
    print("\n" + "=" * 60)
    print("STEP 4: Running sentiment analysis...")
    print("=" * 60)
    G = enrich_graph_with_sentiment(G, emails)
    sentiment_summary = get_sentiment_summary(G)
    print(f"  Avg sentiment: {sentiment_summary['avg_sentiment']}")

    # Recompute weights with sentiment included
    G = compute_weights(G)

    # Step 6: Compute all metrics
    print("\n" + "=" * 60)
    print("STEP 5: Computing graph metrics...")
    print("=" * 60)

    print("  Computing centrality...")
    centrality = compute_centrality(G)

    print("  Detecting communities...")
    communities = detect_communities(G)
    print(f"  Found {len(communities['communities'])} communities (modularity={communities['modularity']})")

    print("  Computing dead-man-switch scores...")
    dms = compute_dead_man_switch(G)

    print("  Computing waste metrics...")
    waste = compute_waste(G, emails)

    print("  Computing org health score...")
    health = compute_health(G, communities)
    print(f"  Health score: {health['health_score']}/100 (Grade: {health['grade']})")

    # Step 7: Export to JSON
    print("\n" + "=" * 60)
    print("STEP 6: Exporting to JSON...")
    print("=" * 60)

    output_dir.mkdir(parents=True, exist_ok=True)
    people_dir = output_dir / "people"
    people_dir.mkdir(parents=True, exist_ok=True)

    # --- graph.json ---
    nodes = []
    for node_id in G.nodes():
        attrs = dict(G.nodes[node_id])
        node_centrality = centrality.get(node_id, {})
        community_id = communities["partition"].get(node_id)

        nodes.append({
            "id": node_id,
            "name": attrs.get("name", node_id),
            "email": attrs.get("email", node_id),
            "total_sent": attrs.get("total_sent", 0),
            "total_received": attrs.get("total_received", 0),
            "department": attrs.get("department"),
            "community_id": community_id,
            "pagerank": round(node_centrality.get("pagerank", 0), 6),
            "betweenness": round(node_centrality.get("betweenness_centrality", 0), 6),
            "eigenvector": round(node_centrality.get("eigenvector_centrality", 0), 6),
            "degree_centrality": round(node_centrality.get("degree_centrality", 0), 6),
            "in_degree_centrality": round(node_centrality.get("in_degree_centrality", 0), 6),
            "out_degree_centrality": round(node_centrality.get("out_degree_centrality", 0), 6),
            "avg_sent_sentiment": attrs.get("avg_sent_sentiment", 0),
            "avg_received_sentiment": attrs.get("avg_received_sentiment", 0),
        })

    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            "source": u,
            "target": v,
            "email_count": data.get("email_count", 0),
            "weight": round(data.get("weight", 0), 4),
            "sentiment": data.get("sentiment", 0),
            "sentiment_asymmetry": data.get("sentiment_asymmetry", 0),
            "first_email": data.get("first_email"),
            "last_email": data.get("last_email"),
            "norm_frequency": round(data.get("norm_frequency", 0), 4),
            "norm_recency": round(data.get("norm_recency", 0), 4),
        })

    graph_data = {"nodes": nodes, "edges": edges}
    with open(output_dir / "graph.json", "w") as f:
        json.dump(graph_data, f, default=json_serial, indent=2)
    print(f"  graph.json: {len(nodes)} nodes, {len(edges)} edges")

    # --- communities.json ---
    community_labels = communities.get("labels", {})
    communities_export = {
        "communities": [
            {
                "id": c["id"],
                "members": c["members"],
                "size": c["size"],
                "density": c["density"],
                "label": community_labels.get(c["id"], f"Community {c['id']}"),
            }
            for c in communities["communities"]
        ],
        "bridge_nodes": communities["bridge_nodes"],
        "modularity": communities["modularity"],
    }
    with open(output_dir / "communities.json", "w") as f:
        json.dump(communities_export, f, indent=2)
    print(f"  communities.json: {len(communities_export['communities'])} communities")

    # --- metrics.json ---
    metrics_data = {
        "health": health,
        "sentiment": sentiment_summary,
        "dead_man_switch": dms[:20],  # top 20
        "waste": waste[:20],  # top 20 worst offenders
        "top_centrality": {
            "pagerank": sorted(
                [{"id": n, "name": centrality[n].get("name", G.nodes[n].get("name", n)),
                  "score": centrality[n]["pagerank"]}
                 for n in centrality],
                key=lambda x: x["score"], reverse=True
            )[:20],
            "betweenness": sorted(
                [{"id": n, "name": G.nodes[n].get("name", n),
                  "score": centrality[n]["betweenness_centrality"]}
                 for n in centrality],
                key=lambda x: x["score"], reverse=True
            )[:20],
        },
    }
    with open(output_dir / "metrics.json", "w") as f:
        json.dump(metrics_data, f, default=json_serial, indent=2)
    print(f"  metrics.json written")

    # --- people/{email}.json ---
    # Build waste and DMS lookup
    dms_map = {d["id"]: d for d in dms}
    waste_map = {w["id"]: w for w in waste}

    for node_id in G.nodes():
        person = {
            "id": node_id,
            "name": G.nodes[node_id].get("name", node_id),
            "email": node_id,
            "community_id": communities["partition"].get(node_id),
            "metrics": centrality.get(node_id, {}),
            "sentiment": {
                "avg_sent": G.nodes[node_id].get("avg_sent_sentiment", 0),
                "avg_received": G.nodes[node_id].get("avg_received_sentiment", 0),
            },
            "dead_man_switch": dms_map.get(node_id, {}),
            "waste": waste_map.get(node_id, {}),
            "connections": [],
        }

        # Top connections (by edge weight)
        out_edges = sorted(
            [(v, d) for _, v, d in G.edges(node_id, data=True)],
            key=lambda x: x[1].get("weight", 0), reverse=True
        )[:20]

        in_edges = sorted(
            [(u, d) for u, _, d in G.in_edges(node_id, data=True)],
            key=lambda x: x[1].get("weight", 0), reverse=True
        )[:20]

        for target, data in out_edges:
            person["connections"].append({
                "id": target,
                "name": G.nodes[target].get("name", target),
                "direction": "outgoing",
                "email_count": data.get("email_count", 0),
                "weight": round(data.get("weight", 0), 4),
                "sentiment": data.get("sentiment", 0),
            })

        for source, data in in_edges:
            person["connections"].append({
                "id": source,
                "name": G.nodes[source].get("name", source),
                "direction": "incoming",
                "email_count": data.get("email_count", 0),
                "weight": round(data.get("weight", 0), 4),
                "sentiment": data.get("sentiment", 0),
            })

        # Use sanitized filename (replace all non-alphanumeric chars)
        safe_name = node_id.replace("@", "_at_").replace(".", "_").replace("/", "_")
        with open(people_dir / f"{safe_name}.json", "w") as f:
            json.dump(person, f, default=json_serial, indent=2)

    print(f"  people/: {G.number_of_nodes()} person files")

    elapsed = time.time() - start
    print(f"\n{'=' * 60}")
    print(f"Pipeline complete in {elapsed:.1f}s")
    print(f"{'=' * 60}")

    return {
        "graph": G,
        "emails": emails,
        "centrality": centrality,
        "communities": communities,
        "dms": dms,
        "waste": waste,
        "health": health,
        "sentiment": sentiment_summary,
    }


if __name__ == "__main__":
    run_pipeline()
