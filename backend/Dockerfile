FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first (cache layer)
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy source code and pre-computed data
COPY src/ src/
COPY output/ output/

# Render sets PORT env var
ENV PORT=8000
CMD uv run uvicorn src.api.main:app --host 0.0.0.0 --port $PORT
