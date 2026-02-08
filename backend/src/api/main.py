"""FastAPI app entry point."""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import chat, graph, metrics, people, reports, risks, trends

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output"


def load_data():
    """Load pre-computed JSON data into memory."""
    graph_path = OUTPUT_DIR / "graph.json"
    metrics_path = OUTPUT_DIR / "metrics.json"
    communities_path = OUTPUT_DIR / "communities.json"
    people_dir = OUTPUT_DIR / "people"

    if not graph_path.exists():
        raise RuntimeError(
            f"Output data not found at {OUTPUT_DIR}. Run the pipeline first: python -m src.pipeline"
        )

    with open(graph_path) as f:
        graph_data = json.load(f)

    with open(metrics_path) as f:
        metrics_data = json.load(f)

    with open(communities_path) as f:
        communities_data = json.load(f)

    # Initialize route modules with data
    graph.init(graph_data)
    metrics.init(metrics_data, communities_data, graph_data)
    people.init(graph_data, metrics_data, people_dir)
    trends.init(graph_data, metrics_data, communities_data)
    risks.init(graph_data, metrics_data)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_data()
    yield


app = FastAPI(
    title="Spine API",
    description="Organizational Intelligence Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(graph.router)
app.include_router(metrics.router)
app.include_router(people.router)
app.include_router(chat.router)
app.include_router(reports.router)
app.include_router(trends.router)
app.include_router(risks.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
