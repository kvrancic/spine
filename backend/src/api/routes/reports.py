"""Report generation endpoints placeholder — will be completed in Step 7."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/health")
async def health_report_placeholder():
    """Placeholder for health report — implemented in Step 7."""
    return {"message": "Report generation not yet implemented. Complete Step 7 for GraphRAG."}
