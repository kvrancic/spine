"""Query ChromaDB + build context for LLM."""

import json
from pathlib import Path

import chromadb
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from src.rag.embedder import CHROMA_DIR, COLLECTION_NAME


OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output"


def get_collection():
    """Get the ChromaDB collection."""
    chroma = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return chroma.get_collection(name=COLLECTION_NAME)


def load_graph_data():
    """Load graph data from JSON."""
    with open(OUTPUT_DIR / "graph.json") as f:
        return json.load(f)


def load_metrics_data():
    """Load metrics data from JSON."""
    with open(OUTPUT_DIR / "metrics.json") as f:
        return json.load(f)


def load_communities_data():
    """Load communities data from JSON."""
    with open(OUTPUT_DIR / "communities.json") as f:
        return json.load(f)


def extract_mentioned_people(question: str, graph_data: dict) -> list[dict]:
    """Find people mentioned in the question by matching names."""
    question_lower = question.lower()
    mentioned = []
    for node in graph_data["nodes"]:
        name = node.get("name", "").lower()
        if len(name) > 3 and name in question_lower:
            mentioned.append(node)
    return mentioned


def retrieve_context(question: str, top_k: int = 15) -> str:
    """Retrieve relevant context for a question.

    Combines:
    1. Relevant email chunks from ChromaDB
    2. Graph metrics for mentioned people
    3. Organization overview
    """
    client = OpenAI()
    collection = get_collection()
    graph_data = load_graph_data()
    metrics_data = load_metrics_data()

    # 1. Embed question and query ChromaDB
    q_response = client.embeddings.create(
        model="text-embedding-3-large",
        input=[question],
    )
    q_embedding = q_response.data[0].embedding

    results = collection.query(
        query_embeddings=[q_embedding],
        n_results=top_k,
    )

    # Build email context
    email_context = "## Relevant Emails\n\n"
    if results["documents"] and results["documents"][0]:
        for i, (doc, meta) in enumerate(zip(results["documents"][0], results["metadatas"][0])):
            email_context += f"**Email {i+1}** (From: {meta.get('sender', 'unknown')}, "
            email_context += f"Date: {meta.get('date', 'unknown')}, "
            email_context += f"Subject: {meta.get('subject', '')})\n"
            email_context += f"{doc[:500]}\n\n"

    # 2. Graph context for mentioned people
    mentioned = extract_mentioned_people(question, graph_data)
    people_context = ""
    if mentioned:
        people_context = "## Graph Context for Mentioned People\n\n"
        for person in mentioned[:5]:
            people_context += f"**{person['name']}** ({person['email']})\n"
            people_context += f"- Community: {person.get('community_id', 'N/A')}\n"
            people_context += f"- PageRank: {person.get('pagerank', 0):.6f}\n"
            people_context += f"- Betweenness Centrality: {person.get('betweenness', 0):.6f}\n"
            people_context += f"- Eigenvector Centrality: {person.get('eigenvector', 0):.6f}\n"
            people_context += f"- Emails Sent: {person.get('total_sent', 0)}\n"
            people_context += f"- Emails Received: {person.get('total_received', 0)}\n"
            people_context += f"- Avg Sent Sentiment: {person.get('avg_sent_sentiment', 0):.4f}\n"
            people_context += f"- Avg Received Sentiment: {person.get('avg_received_sentiment', 0):.4f}\n\n"

    # 3. Organization overview
    health = metrics_data.get("health", {})
    dms_top5 = metrics_data.get("dead_man_switch", [])[:5]
    waste_top5 = metrics_data.get("waste", [])[:5]

    org_context = "## Organization Overview\n\n"
    org_context += f"- Health Score: {health.get('health_score', 'N/A')}/100 (Grade: {health.get('grade', 'N/A')})\n"
    sub = health.get("sub_scores", {})
    org_context += f"- Connectivity: {sub.get('connectivity', 'N/A')}/100\n"
    org_context += f"- Bottleneck Risk: {sub.get('bottleneck_risk', 'N/A')}/100\n"
    org_context += f"- Silo Score: {sub.get('silo_score', 'N/A')}/100\n"
    org_context += f"- Efficiency: {sub.get('efficiency', 'N/A')}/100\n"

    stats = health.get("stats", {})
    org_context += f"- Total People: {stats.get('node_count', 'N/A')}\n"
    org_context += f"- Total Relationships: {stats.get('edge_count', 'N/A')}\n"
    org_context += f"- Communities: {stats.get('communities_count', 'N/A')}\n"

    org_context += f"\n**Most Critical People (Dead-Man-Switch):**\n"
    for d in dms_top5:
        org_context += f"- {d['name']}: DMS Score {d['dms_score']}, Impact {d['impact_pct']}%\n"

    org_context += f"\n**Biggest Communication Waste:**\n"
    for w in waste_top5:
        org_context += f"- {w['name']}: Waste Score {w['waste_score']}\n"

    # Combine all context
    full_context = email_context + "\n" + people_context + "\n" + org_context
    return full_context
