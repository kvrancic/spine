"""Pydantic data models for graph nodes and edges."""

from datetime import datetime

from pydantic import BaseModel


class PersonNode(BaseModel):
    id: str  # normalized email address
    name: str  # display name extracted from email
    email: str
    total_sent: int = 0
    total_received: int = 0
    department: str | None = None


class CommunicationEdge(BaseModel):
    source: str  # sender email
    target: str  # recipient email
    email_count: int = 0
    weight: float = 0.0  # composite weight
    first_email: datetime | None = None
    last_email: datetime | None = None
    avg_response_time: float | None = None  # in hours
    subjects: list[str] = []
