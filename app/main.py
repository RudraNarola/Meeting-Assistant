from fastapi import FastAPI
from app.utils.schemas import MeetingSummaryIn, ActionItemsOut
from app.pipeline.production_extractor import extract_action_items_production
from app.store.repo import save_tasks, get_tasks
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("main")

app = FastAPI(title="Action Item Extraction Service (Production)", version="2.0")

@app.get("/healthz")
def health_check():
    return {"status": "ok", "service": "action-item-extraction", "version": "2.0-production"}

@app.post("/extract", response_model=ActionItemsOut)
def extract_items(data: MeetingSummaryIn):
    logger.info(f"Received request for meeting_id: {data.meeting_id}")
    
    # Use production extractor with self-consistency
    use_self_consistency = os.getenv("USE_SELF_CONSISTENCY", "true").lower() == "true"
    
    logger.info(f"Using production extractor (self-consistency: {use_self_consistency})")
    items = extract_action_items_production(
        transcription=data.transcription,
        meeting_time=data.timestamp_utc.isoformat() if data.timestamp_utc else None,
        use_self_consistency=use_self_consistency
    )
    
    logger.info(f"Extracted {len(items)} items, saving to MongoDB...")
    save_tasks(data.meeting_id, items)
    logger.info(f"Returning response with {len(items)} items")
    
    return {"meeting_id": data.meeting_id, "items": items}

@app.get("/tasks/{meeting_id}", response_model=ActionItemsOut)
def get_items(meeting_id: str):
    logger.info(f"Retrieving tasks for meeting_id: {meeting_id}")
    items = get_tasks(meeting_id)
    logger.info(f"Found {len(items)} tasks")
    return {"meeting_id": meeting_id, "items": items}