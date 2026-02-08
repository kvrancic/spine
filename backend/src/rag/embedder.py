"""Chunk emails and embed into ChromaDB."""

import hashlib
import json
from pathlib import Path

import chromadb
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from src.parser.email_parser import ParsedEmail


CHROMA_DIR = Path(__file__).resolve().parents[2] / "chroma_data"
COLLECTION_NAME = "enron_emails"


def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path=str(CHROMA_DIR))


def chunk_email(email: ParsedEmail, max_chars: int = 2000) -> str:
    """Create a chunk from an email for embedding."""
    text = f"From: {email.sender}\nSubject: {email.subject}\n\n{email.body}"
    return text[:max_chars]


def content_hash(text: str) -> str:
    """Hash text for deduplication."""
    return hashlib.md5(text.encode()).hexdigest()


def embed_emails(
    emails: list[ParsedEmail],
    communities: dict | None = None,
    batch_size: int = 100,
    progress: bool = True,
):
    """Embed all emails into ChromaDB.

    Args:
        emails: Parsed emails to embed.
        communities: Community partition dict for metadata.
        batch_size: Number of emails to embed at once.
        progress: Print progress.
    """
    client = OpenAI()
    chroma = get_chroma_client()

    # Delete existing collection if it exists and recreate
    try:
        chroma.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    collection = chroma.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    partition = communities.get("partition", {}) if communities else {}

    # Deduplicate by content hash
    seen_hashes: set[str] = set()
    unique_emails = []
    for email in emails:
        chunk = chunk_email(email)
        h = content_hash(chunk)
        if h not in seen_hashes and len(chunk.strip()) > 50:
            seen_hashes.add(h)
            unique_emails.append((email, chunk))

    if progress:
        print(f"  Embedding {len(unique_emails)} unique emails (deduplicated from {len(emails)})...")

    # Process in batches
    for i in range(0, len(unique_emails), batch_size):
        batch = unique_emails[i:i + batch_size]
        texts = [chunk for _, chunk in batch]
        ids = [f"email_{i + j}" for j in range(len(batch))]

        # Get embeddings from OpenAI
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input=texts,
        )
        embeddings = [item.embedding for item in response.data]

        # Prepare metadata
        metadatas = []
        for email, _ in batch:
            meta = {
                "sender": email.sender,
                "recipients": ", ".join(email.recipients_to[:5]),
                "subject": email.subject[:200],
                "date": email.date.isoformat() if email.date else "",
                "community_id": str(partition.get(email.sender, -1)),
            }
            metadatas.append(meta)

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )

        if progress and (i + batch_size) % 1000 == 0:
            print(f"    Embedded {min(i + batch_size, len(unique_emails))}/{len(unique_emails)}...")

    if progress:
        print(f"  Embedding complete: {collection.count()} documents in ChromaDB")

    return collection
