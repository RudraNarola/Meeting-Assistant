from pydantic import BaseModel, EmailStr, confloat
from typing import List, Optional
from datetime import datetime, date
from enum import Enum


# --------------------------------------
# ENUMS
# --------------------------------------
class SourceEnum(str, Enum):
    rule = "rule"
    nlp = "nlp"
    llm = "llm"
    huggingface = "huggingface"
    hybrid = "hybrid"  # optional future use


class PriorityEnum(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    normal = "normal"
    low = "low"


class StatusEnum(str, Enum):
    open = "open"
    done = "done"
    blocked = "blocked"


# --------------------------------------
# CORE MODELS
# --------------------------------------
class Participant(BaseModel):
    name: str


class MeetingSummaryIn(BaseModel):
    meeting_id: str
    transcription: str
    timestamp_utc: datetime


class ActionItem(BaseModel):
    id: str
    title: str
    owner: Optional[Participant] = None
    due: Optional[date] = None
    priority: PriorityEnum = PriorityEnum.normal
    status: StatusEnum = StatusEnum.open

class ActionItemsOut(BaseModel):
    meeting_id: str
    items: List[ActionItem]
