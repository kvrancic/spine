"""Build a NetworkX DiGraph from parsed emails."""

from collections import defaultdict
from datetime import datetime

import networkx as nx

from src.parser.email_parser import ParsedEmail


def extract_display_name(email_addr: str) -> str:
    """Convert email to a display name: john.smith@enron.com → John Smith."""
    local = email_addr.split("@")[0]
    parts = local.replace("_", ".").replace("-", ".").split(".")
    return " ".join(p.capitalize() for p in parts if p)


def build_graph(
    emails: list[ParsedEmail],
    min_emails: int = 3,
    enron_only: bool = True,
) -> nx.DiGraph:
    """Build a weighted directed graph from parsed emails.

    Args:
        emails: List of parsed email objects.
        min_emails: Minimum number of emails for an edge to be included.
        enron_only: If True, only include @enron.com addresses as nodes.

    Returns:
        A NetworkX DiGraph with node/edge attributes.
    """
    # Aggregate edge data
    edge_data: dict[tuple[str, str], dict] = defaultdict(lambda: {
        "email_count": 0,
        "first_email": None,
        "last_email": None,
        "subjects": [],
    })

    # Track node data
    node_sent: dict[str, int] = defaultdict(int)
    node_received: dict[str, int] = defaultdict(int)
    node_names: dict[str, str] = {}

    for email in emails:
        sender = email.sender

        if enron_only and not sender.endswith("@enron.com"):
            continue

        # All recipients (to + cc + bcc)
        all_recipients = email.recipients_to + email.recipients_cc + email.recipients_bcc

        for recipient in all_recipients:
            if enron_only and not recipient.endswith("@enron.com"):
                continue

            if sender == recipient:
                continue  # skip self-emails

            key = (sender, recipient)
            data = edge_data[key]
            data["email_count"] += 1

            if email.date:
                if data["first_email"] is None or email.date < data["first_email"]:
                    data["first_email"] = email.date
                if data["last_email"] is None or email.date > data["last_email"]:
                    data["last_email"] = email.date

            if email.subject:
                data["subjects"].append(email.subject)

            node_sent[sender] += 1
            node_received[recipient] += 1

            # Store display names
            if sender not in node_names:
                node_names[sender] = extract_display_name(sender)
            if recipient not in node_names:
                node_names[recipient] = extract_display_name(recipient)

    # Build the graph
    G = nx.DiGraph()

    # Add edges that meet threshold
    all_nodes = set()
    for (src, tgt), data in edge_data.items():
        if data["email_count"] >= min_emails:
            G.add_edge(
                src, tgt,
                email_count=data["email_count"],
                first_email=data["first_email"],
                last_email=data["last_email"],
                subjects=data["subjects"][:50],  # cap stored subjects
            )
            all_nodes.add(src)
            all_nodes.add(tgt)

    # Set node attributes
    for node_id in G.nodes():
        name = node_names.get(node_id, extract_display_name(node_id))
        G.nodes[node_id]["name"] = name
        G.nodes[node_id]["email"] = node_id
        G.nodes[node_id]["total_sent"] = node_sent.get(node_id, 0)
        G.nodes[node_id]["total_received"] = node_received.get(node_id, 0)

        # Try to infer department from email prefix pattern
        local = node_id.split("@")[0]
        G.nodes[node_id]["department"] = None

    return G
