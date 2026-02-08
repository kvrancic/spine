# Spine — AI-Powered Organizational Intelligence Platform

**Instant graph-based diagnostics from email communication data.**

Companies pay McKinsey $500K+ for organizational health assessments that take months, are subjective, and are outdated by delivery. OrgVitals analyzes email data to reveal the real org structure, critical people, bottlenecks, and communication waste — in minutes, not months.

## What It Does

- **Communication Graph** — Interactive force-directed visualization of who talks to whom, how often, and with what sentiment
- **Critical People Detection** — Dead-Man-Switch scoring identifies who the organization can't afford to lose
- **Community Detection** — Discovers the real org structure vs. the official org chart using Louvain clustering
- **Communication Waste** — Quantifies overproduction, broadcast storms, orphan emails, and reply-all abuse
- **Org Health Score** — Single 0-100 score with sub-scores for connectivity, bottleneck risk, siloing, and efficiency
- **AI Q&A (GraphRAG)** — Ask natural language questions about the organization, backed by graph metrics and email context
- **Automated Reports** — GPT-5 generated diagnostic reports with data-backed recommendations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Graph computation | NetworkX 3.x |
| Backend API | FastAPI |
| Sentiment | TextBlob |
| Vector store | ChromaDB |
| Embeddings | OpenAI text-embedding-3-large |
| LLM | OpenAI GPT-5 |
| Frontend | Next.js (App Router) |
| Graph visualization | react-force-graph-2d |
| Styling | Tailwind CSS + shadcn/ui |

## Quick Start

### Prerequisites

- Python 3.12+, [uv](https://docs.astral.sh/uv/)
- Node.js 20+, [pnpm](https://pnpm.io/)
- OpenAI API key

### Setup

```bash
# Clone & enter
git clone <repo-url> && cd graph-company

# Environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Backend
cd backend
uv sync
uv run python -m src.pipeline   # Run full data pipeline (~5 min)
uv run uvicorn src.api.main:app --reload --port 8000

# Frontend (new terminal)
cd web-app
pnpm install
pnpm dev   # http://localhost:3000
```

### Demo Dataset

Uses the Enron email corpus (520K emails, 150 employees) — the only large-scale, publicly available corporate email dataset. The upload flow in the app simulates a plug-and-play experience while serving pre-computed Enron analytics.

## Project Structure

```
graph-company/
├── backend/          # Python: data pipeline + graph analytics + API + RAG
│   ├── src/
│   │   ├── parser/   # Email parsing & extraction
│   │   ├── graph/    # NetworkX graph construction & edge weights
│   │   ├── metrics/  # Centrality, communities, dead-man-switch, waste, health
│   │   ├── sentiment/# TextBlob sentiment analysis
│   │   ├── rag/      # GraphRAG: embeddings, retrieval, LLM prompts
│   │   ├── api/      # FastAPI routes (graph, metrics, people, chat, reports)
│   │   └── pipeline.py
│   └── tests/
├── web-app/          # Next.js frontend
│   └── src/
│       ├── app/      # Pages: dashboard, graph, people, chat, reports
│       ├── components/
│       └── lib/
├── docs/             # Architecture diagrams, pitch guide, demo scripts
└── data/             # Enron dataset (gitignored)
```

## License

MIT
