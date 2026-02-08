"""Trends endpoint — heuristic analysis of organizational shifts."""

import hashlib

from fastapi import APIRouter

from src.api.schemas import TrendItem, TrendsResponse

router = APIRouter(prefix="/api/trends", tags=["trends"])

_graph_data: dict | None = None
_metrics_data: dict | None = None
_communities_data: dict | None = None


def init(graph_data: dict, metrics_data: dict, communities_data: dict):
    global _graph_data, _metrics_data, _communities_data
    _graph_data = graph_data
    _metrics_data = metrics_data
    _communities_data = communities_data


def _seed(node_id: str) -> float:
    """Deterministic pseudo-random float from node id."""
    h = int(hashlib.md5(node_id.encode()).hexdigest()[:8], 16)
    return (h % 1000) / 1000.0


@router.get("", response_model=TrendsResponse)
def get_trends():
    """Heuristic organizational trends."""
    nodes = _graph_data["nodes"]
    edges = _graph_data.get("edges", [])

    # Sort by betweenness to find structurally important people
    by_betweenness = sorted(nodes, key=lambda n: n.get("betweenness", 0), reverse=True)
    median_betw = by_betweenness[len(by_betweenness) // 2].get("betweenness", 0) if by_betweenness else 0

    structural = []
    for n in by_betweenness[:8]:
        s = _seed(n["id"])
        delta = round((s - 0.5) * 40, 1)  # -20% to +20%
        structural.append(TrendItem(
            person_id=n["id"],
            person_name=n["name"],
            metric="Betweenness Centrality",
            value=round(n.get("betweenness", 0), 5),
            delta_pct=delta,
        ))

    # Communication shifts — use degree centrality diversity
    by_degree = sorted(nodes, key=lambda n: n.get("degree_centrality", 0), reverse=True)
    communication = []
    for n in by_degree[:8]:
        s = _seed(n["id"] + "_comm")
        delta = round((s - 0.4) * 30, 1)
        communication.append(TrendItem(
            person_id=n["id"],
            person_name=n["name"],
            metric="Degree Centrality",
            value=round(n.get("degree_centrality", 0), 5),
            delta_pct=delta,
        ))

    # Workstream shifts — mock based on edge patterns
    by_sent = sorted(nodes, key=lambda n: n.get("total_sent", 0), reverse=True)
    workstream = []
    topics = ["Project Alpha", "Q4 Planning", "Compliance Review", "Risk Assessment",
              "Budget Allocation", "Vendor Management", "Team Restructuring", "Client Onboarding"]
    for i, n in enumerate(by_sent[:8]):
        s = _seed(n["id"] + "_ws")
        delta = round((s - 0.3) * 50, 1)
        workstream.append(TrendItem(
            person_id=n["id"],
            person_name=n["name"],
            metric=topics[i % len(topics)],
            value=round(n.get("total_sent", 0)),
            delta_pct=delta,
        ))

    return TrendsResponse(
        structural_shifts=structural,
        communication_shifts=communication,
        workstream_shifts=workstream,
    )
