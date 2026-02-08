"""Communication waste detection."""

from collections import defaultdict

import networkx as nx

from src.parser.email_parser import ParsedEmail


def compute_waste(
    G: nx.DiGraph,
    emails: list[ParsedEmail],
    broadcast_threshold: int = 5,
) -> list[dict]:
    """Compute communication waste metrics per person.

    Waste categories:
    - overproduction_score: avg CC/BCC count per email sent
    - broadcast_ratio: % of emails sent to >broadcast_threshold recipients
    - reply_all_ratio: detected reply-all patterns (Re: with many recipients)
    - orphan_ratio: emails that got no response (sender→recipient but no reply edge)

    Returns list: [{id, name, waste_score, overproduction, broadcast_ratio, reply_all_ratio, orphan_ratio}]
    """
    # Aggregate per-sender stats from raw emails
    sender_stats: dict[str, dict] = defaultdict(lambda: {
        "total_sent": 0,
        "total_cc_bcc": 0,
        "broadcast_count": 0,
        "reply_all_count": 0,
        "recipients_per_email": [],
    })

    for email in emails:
        sender = email.sender
        if sender not in G.nodes():
            continue

        stats = sender_stats[sender]
        stats["total_sent"] += 1
        stats["total_cc_bcc"] += len(email.recipients_cc) + len(email.recipients_bcc)

        all_recipients = email.recipients_to + email.recipients_cc + email.recipients_bcc
        n_recipients = len(all_recipients)
        stats["recipients_per_email"].append(n_recipients)

        if n_recipients > broadcast_threshold:
            stats["broadcast_count"] += 1

        # Reply-all detection: subject starts with Re:/RE: and has >3 recipients
        if email.subject.lower().startswith("re:") and n_recipients > 3:
            stats["reply_all_count"] += 1

    # Compute orphan ratio from graph structure
    # An email from A→B is "orphaned" if there's no edge B→A (no reply ever)
    results = []
    for node in G.nodes():
        stats = sender_stats.get(node, {
            "total_sent": 0, "total_cc_bcc": 0,
            "broadcast_count": 0, "reply_all_count": 0,
            "recipients_per_email": [],
        })

        total_sent = stats["total_sent"]
        if total_sent == 0:
            results.append({
                "id": node,
                "name": G.nodes[node].get("name", node),
                "waste_score": 0,
                "overproduction": 0,
                "broadcast_ratio": 0,
                "reply_all_ratio": 0,
                "orphan_ratio": 0,
            })
            continue

        # Overproduction: avg cc+bcc per email (normalized)
        overproduction = stats["total_cc_bcc"] / total_sent

        # Broadcast ratio
        broadcast_ratio = stats["broadcast_count"] / total_sent

        # Reply-all ratio
        reply_all_ratio = stats["reply_all_count"] / total_sent

        # Orphan ratio: fraction of outgoing edges with no return edge
        out_neighbors = set(G.successors(node))
        orphan_count = sum(1 for n in out_neighbors if not G.has_edge(n, node))
        orphan_ratio = orphan_count / len(out_neighbors) if out_neighbors else 0

        # Normalize overproduction (cap at 10 for normalization)
        norm_overproduction = min(overproduction / 10, 1.0)

        # Combined waste score (0-100)
        waste_score = (
            0.3 * norm_overproduction
            + 0.3 * broadcast_ratio
            + 0.2 * reply_all_ratio
            + 0.2 * orphan_ratio
        ) * 100

        results.append({
            "id": node,
            "name": G.nodes[node].get("name", node),
            "waste_score": round(waste_score, 1),
            "overproduction": round(overproduction, 2),
            "broadcast_ratio": round(broadcast_ratio, 3),
            "reply_all_ratio": round(reply_all_ratio, 3),
            "orphan_ratio": round(orphan_ratio, 3),
        })

    results.sort(key=lambda x: x["waste_score"], reverse=True)
    return results
