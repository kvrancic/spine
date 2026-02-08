"""Graph data endpoints."""

from fastapi import APIRouter, HTTPException

from src.api.schemas import EdgeResponse, GraphResponse, NodeDetailResponse, NodeResponse

router = APIRouter(prefix="/api/graph", tags=["graph"])

# Data is loaded at startup and injected via app.state
_graph_data: dict | None = None


def init(graph_data: dict):
    global _graph_data
    _graph_data = graph_data


@router.get("", response_model=GraphResponse)
def get_graph():
    """Full graph for visualization."""
    return GraphResponse(
        nodes=[NodeResponse(**n) for n in _graph_data["nodes"]],
        edges=[EdgeResponse(**e) for e in _graph_data["edges"]],
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
