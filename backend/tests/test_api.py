"""Tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app, load_data

# Load data once before tests (lifespan doesn't auto-trigger in TestClient)
load_data()
client = TestClient(app)


class TestHealthCheck:
    def test_health(self):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestGraphEndpoints:
    def test_get_graph(self):
        r = client.get("/api/graph")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data
        assert len(data["nodes"]) > 0
        assert len(data["edges"]) > 0

    def test_get_graph_node(self):
        # First get a valid node id
        r = client.get("/api/graph")
        node_id = r.json()["nodes"][0]["id"]

        r = client.get(f"/api/graph/node/{node_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["node"]["id"] == node_id

    def test_get_graph_node_not_found(self):
        r = client.get("/api/graph/node/nonexistent@enron.com")
        assert r.status_code == 404


class TestMetricsEndpoints:
    def test_overview(self):
        r = client.get("/api/metrics/overview")
        assert r.status_code == 200
        data = r.json()
        assert "health" in data
        assert "health_score" in data["health"]
        assert "grade" in data["health"]

    def test_centrality_default(self):
        r = client.get("/api/metrics/centrality")
        assert r.status_code == 200
        data = r.json()
        assert data["type"] == "pagerank"
        assert len(data["rankings"]) > 0

    def test_centrality_betweenness(self):
        r = client.get("/api/metrics/centrality?type=betweenness")
        assert r.status_code == 200
        assert r.json()["type"] == "betweenness"

    def test_communities(self):
        r = client.get("/api/metrics/communities")
        assert r.status_code == 200
        data = r.json()
        assert len(data["communities"]) > 0
        assert "modularity" in data

    def test_dead_man_switch(self):
        r = client.get("/api/metrics/dead-man-switch")
        assert r.status_code == 200
        data = r.json()
        assert len(data["rankings"]) > 0
        assert "dms_score" in data["rankings"][0]

    def test_waste(self):
        r = client.get("/api/metrics/waste")
        assert r.status_code == 200
        data = r.json()
        assert len(data["people"]) > 0
        assert "waste_score" in data["people"][0]


class TestPeopleEndpoints:
    def test_get_people(self):
        r = client.get("/api/people")
        assert r.status_code == 200
        data = r.json()
        assert len(data["people"]) > 0

    def test_get_person(self):
        # Get first person id
        r = client.get("/api/people")
        person_id = r.json()["people"][0]["id"]

        r = client.get(f"/api/people/{person_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == person_id
        assert "metrics" in data
        assert "connections" in data

    def test_get_person_not_found(self):
        r = client.get("/api/people/nonexistent@enron.com")
        assert r.status_code == 404
