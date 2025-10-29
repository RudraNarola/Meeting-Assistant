import json
from typing import Any, List
from pydantic.json import pydantic_encoder
from app.store.redis_client import get_redis_client

# Initialize Redis client safely
try:
    r = get_redis_client()
except Exception:
    r = None


def save_tasks(meeting_id: str, data: List[Any]) -> None:
    """
    Persist tasks to Redis as JSON.
    Safe no-op if Redis is unavailable.
    """
    if not r:
        return
    key = f"tasks:{meeting_id}"
    try:
        r.set(key, json.dumps(data, default=pydantic_encoder))
    except Exception as e:
        print(f"[Redis] Save failed for {key}: {e}")


def get_tasks(meeting_id: str):
    """
    Retrieve tasks for a meeting from Redis.
    Returns [] if not found or on error.
    """
    if not r:
        return []
    key = f"tasks:{meeting_id}"
    try:
        data = r.get(key)
        if not data:
            return []
        return json.loads(data)
    except Exception as e:
        print(f"[Redis] Load failed for {key}: {e}")
        return []
