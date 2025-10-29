import json
from typing import Any, List
from datetime import datetime
from pydantic.json import pydantic_encoder
from app.store.mongodb_client import get_collection
import logging

logger = logging.getLogger("repo")

def save_tasks(meeting_id: str, data: List[Any]) -> None:
    """
    Persist tasks to MongoDB.
    Safe no-op if MongoDB is unavailable.
    """
    collection = get_collection("action_items")
    if collection is None:
        logger.warning("MongoDB not available, skipping save")
        return
    
    try:
        # Convert data to dict format
        tasks_data = json.loads(json.dumps(data, default=pydantic_encoder))
        
        # Prepare document
        document = {
            "meeting_id": meeting_id,
            "tasks": tasks_data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Upsert: update if exists, insert if not
        collection.update_one(
            {"meeting_id": meeting_id},
            {"$set": document},
            upsert=True
        )
        logger.info(f"✓ Saved {len(data)} tasks for meeting {meeting_id}")
    except Exception as e:
        logger.error(f"✗ MongoDB save failed for {meeting_id}: {e}")


def get_tasks(meeting_id: str):
    """
    Retrieve tasks for a meeting from MongoDB.
    Returns [] if not found or on error.
    """
    collection = get_collection("action_items")
    if collection is None:
        logger.warning("MongoDB not available, returning empty list")
        return []
    
    try:
        document = collection.find_one({"meeting_id": meeting_id})
        if not document:
            logger.info(f"No tasks found for meeting {meeting_id}")
            return []
        
        tasks = document.get("tasks", [])
        logger.info(f"✓ Retrieved {len(tasks)} tasks for meeting {meeting_id}")
        return tasks
    except Exception as e:
        logger.error(f"✗ MongoDB load failed for {meeting_id}: {e}")
        return []
