"""Graph data endpoints."""

from fastapi import APIRouter, HTTPException

from src.api.schemas import EdgeResponse, GraphResponse, NodeDetailResponse, NodeResponse

router = APIRouter(prefix="/api/graph", tags=["graph"])

# Data is loaded at startup and injected via app.state
_graph_data: dict | None = None
_community_labels: dict[int, str] = {}


def init(graph_data: dict, communities_data: dict | None = None):
    global _graph_data, _community_labels
    _graph_data = graph_data
    if communities_data:
        for c in communities_data.get("communities", []):
            if "label" in c:
                _community_labels[c["id"]] = c["label"]


@router.get("", response_model=GraphResponse)
def get_graph():
    """Full graph for visualization."""
    return GraphResponse(
        nodes=[NodeResponse(**n) for n in _graph_data["nodes"]],
        edges=[EdgeResponse(**e) for e in _graph_data["edges"]],
        community_names=_community_labels,
    )


@router.get("/node/{node_id:path}", response_model=NodeDetailResponse)
def get_node(node_id: str):
    """Single node with all metrics + connections."""
    # Find node
    node = None
    for n in _graph_data["nodes"]:
        if n["id"] == node_id:
            node = n
            break

    if node is None:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    # Find connections
    connections = []
    for e in _graph_data["edges"]:
        if e["source"] == node_id or e["target"] == node_id:
            connections.append(EdgeResponse(**e))

    return NodeDetailResponse(
        node=NodeResponse(**node),
        connections=connections,
    )
