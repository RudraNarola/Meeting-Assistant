# app/pipeline/extraction_schema.py
"""
Pydantic schemas for strict JSON extraction with evidence tracking.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class Evidence(BaseModel):
    """Evidence tracking with utterance IDs and verbatim quotes."""
    utterance_ids: List[int] = Field(..., description="Utterance IDs like [1, 2]")
    quotes: List[str] = Field(..., description="Verbatim substrings from transcript")


class ExtractedActionItem(BaseModel):
    """Single action item extracted from transcript."""
    task: str = Field(..., description="Clear description of what needs to be done")
    assigned_to: str = Field(..., description="Person responsible (name or pronoun)")
    deadline: Optional[str] = Field(None, description="Deadline as mentioned (e.g., 'tomorrow', 'EOD Friday')")
    priority: Optional[str] = Field("medium", description="High/Medium/Low based on urgency keywords")
    confidence: float = Field(0.0, description="Model-estimated confidence (0-1)")
    evidence: Evidence = Field(..., description="Supporting evidence from transcript")


class ExtractionResult(BaseModel):
    """Complete extraction result with all action items."""
    items: List[ExtractedActionItem] = Field(default_factory=list)


# JSON schema for function calling (Groq format)
FUNCTION_SCHEMA = {
    "type": "function",
    "function": {
        "name": "extract_action_items",
        "description": "Extract all action items from meeting transcript with evidence",
        "parameters": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "task": {
                                "type": "string",
                                "description": "What needs to be done (exclude person name)"
                            },
                            "assigned_to": {
                                "type": "string",
                                "description": "Who is responsible (use 'I' for speaker, 'you' for addressee, or explicit name)"
                            },
                            "deadline": {
                                "type": "string",
                                "description": "Deadline as mentioned in transcript (e.g., 'tomorrow', 'by Friday EOD', 'next Tuesday')"
                            },
                            "priority": {
                                "type": "string",
                                "enum": ["high", "medium", "low"],
                                "description": "High if urgent/critical/ASAP/blocker, Medium for dated tasks, Low for suggestions"
                            },
                            "confidence": {
                                "type": "number",
                                "description": "Your confidence 0-1 that this is a real action item"
                            },
                            "evidence": {
                                "type": "object",
                                "properties": {
                                    "utterance_ids": {
                                        "type": "array",
                                        "items": {"type": "integer"},
                                        "description": "Utterance IDs containing this action item"
                                    },
                                    "quotes": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "Exact verbatim quotes supporting this item"
                                    }
                                },
                                "required": ["utterance_ids", "quotes"]
                            }
                        },
                        "required": ["task", "assigned_to", "deadline", "priority", "confidence", "evidence"]
                    }
                }
            },
            "required": ["items"]
        }
    }
}
