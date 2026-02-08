"""Run the embedding pipeline to populate ChromaDB."""

import json
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from src.parser.email_parser import parse_all_emails
from src.parser.enron_extractor import DEFAULT_OUTPUT
from src.rag.embedder import embed_emails

OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output"


def main():
    print("Loading parsed emails...")
    maildir = DEFAULT_OUTPUT
    emails = parse_all_emails(maildir)

    # Load communities for metadata
    communities = None
    communities_path = OUTPUT_DIR / "communities.json"
    if communities_path.exists():
        with open(communities_path) as f:
            communities = json.load(f)
        # Convert communities format to partition dict
        if "communities" in communities and "partition" not in communities:
            partition = {}
            for comm in communities["communities"]:
                for member in comm["members"]:
                    partition[member] = comm["id"]
            communities["partition"] = partition

    print("Starting embedding pipeline...")
    embed_emails(emails, communities=communities)
    print("Done!")


if __name__ == "__main__":
    main()
