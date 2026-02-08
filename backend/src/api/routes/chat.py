"""Chat endpoint placeholder — will be completed in Step 7."""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
async def chat_placeholder():
    """Placeholder for LLM Q&A — implemented in Step 7."""
    return {"message": "Chat endpoint not yet implemented. Complete Step 7 for GraphRAG."}
