"""Report generation endpoints."""

import json
from pathlib import Path

from fastapi import APIRouter
from openai import OpenAI

from src.rag.prompts import build_report_messages
from src.rag.retriever import retrieve_context

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Cache for generated reports
_report_cache: dict[str, list[dict]] = {}

OUTPUT_DIR = Path(__file__).resolve().parents[3] / "output"


@router.get("/health")
async def health_report():
    """Generate a full org health report via LLM.

    Cached after first generation since it's expensive.
    """
    if "health" in _report_cache:
        return {"report": _report_cache["health"]}

    # Build comprehensive context
    context = retrieve_context(
        "Generate a comprehensive organizational health report covering critical personnel, "
        "communication bottlenecks, community structure, waste analysis, and recommendations."
    )

    # Also load full metrics for richer context
    with open(OUTPUT_DIR / "metrics.json") as f:
        metrics = json.load(f)

    extra_context = "\n\n## Full Metrics Data\n"
    extra_context += f"Health Score: {metrics['health']['health_score']}/100\n"
    extra_context += f"Grade: {metrics['health']['grade']}\n"
    extra_context += f"Sub-scores: {json.dumps(metrics['health']['sub_scores'])}\n"
    extra_context += f"Stats: {json.dumps(metrics['health']['stats'])}\n"

    extra_context += "\n### Top 20 Critical People (Dead-Man-Switch)\n"
    for d in metrics.get("dead_man_switch", []):
        extra_context += f"- {d['name']}: score={d['dms_score']}, betweenness={d['betweenness']}, impact={d['impact_pct']}%\n"

    extra_context += "\n### Top 20 Communication Waste\n"
    for w in metrics.get("waste", []):
        extra_context += f"- {w['name']}: waste={w['waste_score']}, broadcast={w['broadcast_ratio']}, orphan={w['orphan_ratio']}\n"

    extra_context += "\n### Sentiment Summary\n"
    extra_context += json.dumps(metrics.get("sentiment", {}), indent=2)

    full_context = context + extra_context
    messages = build_report_messages(full_context)

    # Generate report
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=messages,
        temperature=0.3,
        max_tokens=4000,
    )

    report_text = response.choices[0].message.content

    # Parse into sections
    sections = []
    current_title = "Executive Summary"
    current_content = []

    for line in report_text.split("\n"):
        if line.startswith("## ") or line.startswith("# "):
            if current_content:
                sections.append({
                    "title": current_title,
                    "content": "\n".join(current_content).strip(),
                })
            current_title = line.lstrip("#").strip()
            current_content = []
        else:
            current_content.append(line)

    if current_content:
        sections.append({
            "title": current_title,
            "content": "\n".join(current_content).strip(),
        })

    _report_cache["health"] = sections
    return {"report": sections}
