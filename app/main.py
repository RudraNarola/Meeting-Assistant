from fastapi import FastAPI
from app.utils.schemas import MeetingSummaryIn, ActionItemsOut
from app.pipeline.pipeline import extract_action_items
from app.store.repo import save_tasks, get_tasks

app = FastAPI(title="Action Item Extraction Service", version="1.0")

@app.get("/healthz")
def health_check():
    return {"status": "ok", "service": "action-item-extraction"}

@app.post("/extract", response_model=ActionItemsOut)
def extract_items(data: MeetingSummaryIn):
    # Pass the meeting timestamp for accurate relative date parsing
    items = extract_action_items(
        summary=data.summary,
        participants=[],  # No participants needed - auto-detect from text
        meeting_time=data.timestamp_utc.isoformat() if data.timestamp_utc else None
    )
    save_tasks(data.meeting_id, items)
    return {"meeting_id": data.meeting_id, "items": items}

@app.get("/tasks/{meeting_id}", response_model=ActionItemsOut)
def get_items(meeting_id: str):
    items = get_tasks(meeting_id)
    return {"meeting_id": meeting_id, "items": items}