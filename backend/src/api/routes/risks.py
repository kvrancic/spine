"""Risks endpoint — organizational risk analysis."""

from fastapi import APIRouter

from src.api.schemas import (
    HighRiskNode,
    RisksResponse,
    StructuralRisk,
    WasteOffender,
)

router = APIRouter(prefix="/api/risks", tags=["risks"])

_graph_data: dict | None = None
_metrics_data: dict | None = None


def init(graph_data: dict, metrics_data: dict):
    global _graph_data, _metrics_data
    _graph_data = graph_data
    _metrics_data = metrics_data


@router.get("", response_model=RisksResponse)
def get_risks():
    """Organizational risk assessment."""
    dms_list = _metrics_data.get("dead_man_switch", [])
    waste_list = _metrics_data.get("waste", [])
    health = _metrics_data.get("health", {})
    stats = health.get("stats", {})

    # High-Risk Nodes — top DMS scores
    high_risk = []
    for d in dms_list[:10]:
        score = d.get("dms_score", 0)
        if score > 0.3:
            label = "Critical"
        elif score > 0.15:
            label = "High"
        elif score > 0.05:
            label = "Moderate"
        else:
            label = "Low"

        betw = d.get("betweenness", 0)
        eigen = d.get("eigenvector", 0)
        if betw > eigen:
            vuln = "High betweenness — key information broker"
        else:
            vuln = "High eigenvector — connected to other influential nodes"

        high_risk.append(HighRiskNode(
            id=d["id"],
            name=d["name"],
            risk_score=score,
            risk_label=label,
            key_vulnerability=vuln,
            impact_pct=d.get("impact_pct", 0),
        ))

    # Structural Risks
    structural = []

    # Fragmentation sensitivity
    max_impact = dms_list[0].get("impact_pct", 0) if dms_list else 0
    structural.append(StructuralRisk(
        label="Fragmentation Sensitivity",
        description=f"Removing the most critical node fragments {max_impact}% of the network",
        severity="Critical" if max_impact > 5 else "High" if max_impact > 2 else "Medium",
        value=max_impact,
    ))

    # Betweenness inequality (Gini-like)
    nodes = _graph_data["nodes"]
    betweenness_vals = sorted([n.get("betweenness", 0) for n in nodes], reverse=True)
    if betweenness_vals and len(betweenness_vals) > 1:
        top10_share = sum(betweenness_vals[:max(1, len(betweenness_vals) // 10)]) / max(sum(betweenness_vals), 0.001)
    else:
        top10_share = 0
    structural.append(StructuralRisk(
        label="Betweenness Inequality",
        description=f"Top 10% of nodes hold {top10_share * 100:.0f}% of total betweenness centrality",
        severity="Critical" if top10_share > 0.7 else "High" if top10_share > 0.5 else "Medium",
        value=round(top10_share * 100, 1),
    ))

    # Average path length
    avg_path = stats.get("avg_path_length")
    if avg_path:
        structural.append(StructuralRisk(
            label="Average Path Length",
            description=f"Information travels {avg_path:.2f} hops on average between people",
            severity="High" if avg_path > 4 else "Medium" if avg_path > 3 else "Low",
            value=round(avg_path, 2),
        ))

    # Communication Waste
    comm_waste = []
    for w in waste_list[:10]:
        comm_waste.append(WasteOffender(
            id=w["id"],
            name=w["name"],
            waste_score=w.get("waste_score", 0),
            broadcast_ratio=w.get("broadcast_ratio", 0),
            orphan_ratio=w.get("orphan_ratio", 0),
        ))

    return RisksResponse(
        high_risk_nodes=high_risk,
        structural_risks=structural,
        communication_waste=comm_waste,
    )
