"""Chat endpoint with streaming SSE responses."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from openai import OpenAI

from src.api.schemas import ChatRequest
from src.rag.prompts import build_chat_messages
from src.rag.retriever import retrieve_context

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
async def chat(request: ChatRequest):
    """LLM Q&A with streaming SSE response.

    Uses GraphRAG: retrieves relevant emails + graph context,
    then streams GPT response via Server-Sent Events.
    """
    # Retrieve context using GraphRAG
    context = retrieve_context(request.message)

    # Build messages with context + history
    messages = build_chat_messages(
        question=request.message,
        context=context,
        history=request.history,
    )

    # Stream response from OpenAI
    client = OpenAI()

    def generate():
        stream = client.chat.completions.create(
            model="gpt-5.2",
            messages=messages,
            stream=True,
            temperature=0.3,
            max_completion_tokens=2000,
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                data = json.dumps({"content": content})
                yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
