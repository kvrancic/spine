"""Metrics & analytics endpoints."""

from fastapi import APIRouter, Query

from src.api.schemas import (
    CentralityEntry,
    CentralityResponse,
    CommunitiesResponse,
    CommunityResponse,
    DMSEntry,
    DMSResponse,
    MetricsOverviewResponse,
    WasteEntry,
    WasteResponse,
)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

_metrics_data: dict | None = None
_communities_data: dict | None = None
_graph_data: dict | None = None


def init(metrics_data: dict, communities_data: dict, graph_data: dict):
    global _metrics_data, _communities_data, _graph_data
    _metrics_data = metrics_data
    _communities_data = communities_data
    _graph_data = graph_data


@router.get("/overview")
def get_overview():
    """Dashboard summary: health score + sub-scores + key stats."""
    return {
        "health": _metrics_data["health"],
        "sentiment": _metrics_data["sentiment"],
    }


@router.get("/centrality", response_model=CentralityResponse)
def get_centrality(type: str = Query("pagerank", enum=["pagerank", "betweenness", "eigenvector", "degree"])):
    """Centrality rankings by type."""
    # Map query param to the data key
    type_map = {
        "pagerank": "pagerank",
        "betweenness": "betweenness",
        "eigenvector": "eigenvector",
        "degree": "degree",
    }

    if type in _metrics_data.get("top_centrality", {}):
        rankings = _metrics_data["top_centrality"][type]
    else:
        # Build from graph data
        field_map = {
            "pagerank": "pagerank",
            "betweenness": "betweenness",
            "eigenvector": "eigenvector",
            "degree": "degree_centrality",
        }
        field = field_map.get(type, "pagerank")
        rankings = sorted(
            [{"id": n["id"], "name": n["name"], "score": n.get(field, 0)}
             for n in _graph_data["nodes"]],
            key=lambda x: x["score"], reverse=True,
        )[:50]

    return CentralityResponse(
        type=type,
        rankings=[CentralityEntry(**r) for r in rankings],
    )


@router.get("/communities", response_model=CommunitiesResponse)
def get_communities():
    """Community data."""
    return CommunitiesResponse(
        communities=[CommunityResponse(**c) for c in _communities_data["communities"]],
        bridge_nodes=_communities_data.get("bridge_nodes", []),
        modularity=_communities_data.get("modularity", 0),
    )


@router.get("/dead-man-switch", response_model=DMSResponse)
def get_dead_man_switch():
    """Critical people ranked."""
    return DMSResponse(
        rankings=[DMSEntry(**d) for d in _metrics_data["dead_man_switch"]],
    )


@router.get("/waste", response_model=WasteResponse)
def get_waste():
    """Waste analysis per person."""
    return WasteResponse(
        people=[WasteEntry(**w) for w in _metrics_data["waste"]],
    )
