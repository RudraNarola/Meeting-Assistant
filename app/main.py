from fastapi import FastAPI
from app.utils.schemas import MeetingSummaryIn, ActionItemsOut
from app.pipeline.pipeline import extract_action_items
from app.store.repo import save_tasks, get_tasks
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("main")

app = FastAPI(title="Action Item Extraction Service", version="1.0")

@app.get("/healthz")
def health_check():
    return {"status": "ok", "service": "action-item-extraction"}

@app.post("/extract", response_model=ActionItemsOut)
def extract_items(data: MeetingSummaryIn):
    logger.info(f"Received request for meeting_id: {data.meeting_id}")
    
    # Pass the meeting timestamp for accurate relative date parsing
    items = extract_action_items(
        summary=data.transcription,
        participants=[],  # No participants needed - auto-detect from text
        meeting_time=data.timestamp_utc.isoformat() if data.timestamp_utc else None
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