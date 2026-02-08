"""Pydantic response schemas for the API."""

from pydantic import BaseModel


class NodeResponse(BaseModel):
    id: str
    name: str
    email: str
    total_sent: int = 0
    total_received: int = 0
    department: str | None = None
    community_id: int | None = None
    pagerank: float = 0
    betweenness: float = 0
    eigenvector: float = 0
    degree_centrality: float = 0
    in_degree_centrality: float = 0
    out_degree_centrality: float = 0
    avg_sent_sentiment: float = 0
    avg_received_sentiment: float = 0


class EdgeResponse(BaseModel):
    source: str
    target: str
    email_count: int = 0
    weight: float = 0
    sentiment: float = 0
    sentiment_asymmetry: float = 0
    first_email: str | None = None
    last_email: str | None = None
    norm_frequency: float = 0
    norm_recency: float = 0


class GraphResponse(BaseModel):
    nodes: list[NodeResponse]
    edges: list[EdgeResponse]


class NodeDetailResponse(BaseModel):
    node: NodeResponse
    connections: list[EdgeResponse]


class HealthSubScores(BaseModel):
    connectivity: float
    bottleneck_risk: float
    silo_score: float
    efficiency: float


class StatsResponse(BaseModel):
    node_count: int
    edge_count: int
    density: float
    avg_path_length: float | None = None
    clustering_coefficient: float | None = None
    communities_count: int = 0
    modularity: float = 0
    gcc_ratio: float = 0


class HealthResponse(BaseModel):
    health_score: float
    grade: str
    sub_scores: HealthSubScores
    stats: StatsResponse


class MetricsOverviewResponse(BaseModel):
    health: HealthResponse
    sentiment: dict


class CentralityEntry(BaseModel):
    id: str
    name: str
    score: float


class CentralityResponse(BaseModel):
    type: str
    rankings: list[CentralityEntry]


class CommunityResponse(BaseModel):
    id: int
    members: list[str]
    size: int
    density: float


class CommunitiesResponse(BaseModel):
    communities: list[CommunityResponse]
    bridge_nodes: list[str]
    modularity: float


class DMSEntry(BaseModel):
    id: str
    name: str
    dms_score: float
    betweenness: float
    eigenvector: float
    redundancy: float
    impact_pct: float


class DMSResponse(BaseModel):
    rankings: list[DMSEntry]


class WasteEntry(BaseModel):
    id: str
    name: str
    waste_score: float
    overproduction: float
    broadcast_ratio: float
    reply_all_ratio: float
    orphan_ratio: float


class WasteResponse(BaseModel):
    people: list[WasteEntry]


class PersonSummary(BaseModel):
    id: str
    name: str
    email: str
    community_id: int | None = None
    pagerank: float = 0
    betweenness: float = 0
    eigenvector: float = 0
    total_sent: int = 0
    total_received: int = 0
    avg_sent_sentiment: float = 0
    dms_score: float = 0
    waste_score: float = 0


class PeopleListResponse(BaseModel):
    people: list[PersonSummary]


class ConnectionDetail(BaseModel):
    id: str
    name: str
    direction: str
    email_count: int = 0
    weight: float = 0
    sentiment: float = 0


class PersonMetrics(BaseModel):
    pagerank: float = 0
    betweenness_centrality: float = 0
    eigenvector_centrality: float = 0
    degree_centrality: float = 0
    in_degree_centrality: float = 0
    out_degree_centrality: float = 0


class PersonSentiment(BaseModel):
    avg_sent: float = 0
    avg_received: float = 0


class PersonDetailResponse(BaseModel):
    id: str
    name: str
    email: str
    community_id: int | None = None
    metrics: PersonMetrics
    sentiment: PersonSentiment
    dead_man_switch: dict = {}
    waste: dict = {}
    connections: list[ConnectionDetail] = []


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class ReportSection(BaseModel):
    title: str
    content: str


class ReportResponse(BaseModel):
    report: list[ReportSection]
