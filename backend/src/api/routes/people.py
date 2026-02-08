"""People list + detail endpoints."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from src.api.schemas import (
    ConnectionDetail,
    PeopleListResponse,
    PersonDetailResponse,
    PersonMetrics,
    PersonSentiment,
    PersonSummary,
)

router = APIRouter(prefix="/api/people", tags=["people"])

_graph_data: dict | None = None
_metrics_data: dict | None = None
_people_dir: Path | None = None


def init(graph_data: dict, metrics_data: dict, people_dir: Path):
    global _graph_data, _metrics_data, _people_dir
    _graph_data = graph_data
    _metrics_data = metrics_data
    _people_dir = people_dir


@router.get("", response_model=PeopleListResponse)
def get_people():
    """All people with summary metrics (sortable)."""
    # Build DMS and waste lookup
    dms_map = {d["id"]: d.get("dms_score", 0) for d in _metrics_data.get("dead_man_switch", [])}
    waste_map = {w["id"]: w.get("waste_score", 0) for w in _metrics_data.get("waste", [])}

    people = []
    for n in _graph_data["nodes"]:
        people.append(PersonSummary(
            id=n["id"],
            name=n["name"],
            email=n["email"],
            community_id=n.get("community_id"),
            pagerank=n.get("pagerank", 0),
            betweenness=n.get("betweenness", 0),
            eigenvector=n.get("eigenvector", 0),
            total_sent=n.get("total_sent", 0),
            total_received=n.get("total_received", 0),
            avg_sent_sentiment=n.get("avg_sent_sentiment", 0),
            dms_score=dms_map.get(n["id"], 0),
            waste_score=waste_map.get(n["id"], 0),
        ))

    return PeopleListResponse(people=people)


@router.get("/{person_id:path}", response_model=PersonDetailResponse)
def get_person(person_id: str):
    """Full person profile."""
    # Try to load from people directory
    safe_name = person_id.replace("@", "_at_").replace(".", "_").replace("/", "_")
    person_file = _people_dir / f"{safe_name}.json"

    if not person_file.exists():
        raise HTTPException(status_code=404, detail=f"Person '{person_id}' not found")

    with open(person_file) as f:
        data = json.load(f)

    return PersonDetailResponse(
        id=data["id"],
        name=data["name"],
        email=data["email"],
        community_id=data.get("community_id"),
        metrics=PersonMetrics(**data.get("metrics", {})),
        sentiment=PersonSentiment(**data.get("sentiment", {})),
        dead_man_switch=data.get("dead_man_switch", {}),
        waste=data.get("waste", {}),
        connections=[ConnectionDetail(**c) for c in data.get("connections", [])],
    )
