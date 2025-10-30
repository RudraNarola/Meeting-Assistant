# app/pipeline/utterance_parser.py
"""
Parse timestamped transcripts into structured utterances.
Format: [HH:MM:SS] Speaker: text
"""
import re
from typing import List, TypedDict, Optional
import logging

logger = logging.getLogger("utterance_parser")


class Utterance(TypedDict):
    """Structured utterance with metadata."""
    id: int
    timestamp: str
    speaker: str
    text: str
    text_normalized: str


def parse_transcript(transcription: str) -> List[Utterance]:
    """
    Parse transcript into utterances.
    
    Format: [HH:MM:SS] Speaker: text
    Example: [00:00:10] Maria: The client moved up the launch.
    """
    utterances: List[Utterance] = []
    
    # Pattern: [timestamp] Speaker: text
    pattern = r'\[(\d{2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+?)(?=\[|\Z)'
    
    matches = re.finditer(pattern, transcription, re.DOTALL)
    
    for idx, match in enumerate(matches, start=1):
        timestamp = match.group(1).strip()
        speaker = match.group(2).strip()
        text = match.group(3).strip()
        
        # Normalize text (remove filler words, fix punctuation)
        text_normalized = normalize_text(text)
        
        utterance: Utterance = {
            "id": idx,
            "timestamp": timestamp,
            "speaker": speaker,
            "text": text,  # Keep original for evidence
            "text_normalized": text_normalized
        }
        
        utterances.append(utterance)
    
    logger.info(f"Parsed {len(utterances)} utterances from transcript")
    return utterances


def normalize_text(text: str) -> str:
    """Normalize text: remove filler words, fix punctuation."""
    # Remove common filler words
    fillers = ["um", "uh", "er", "ah", "like", "you know"]
    normalized = text
    for filler in fillers:
        normalized = re.sub(r'\b' + filler + r'\b', '', normalized, flags=re.IGNORECASE)
    
    # Fix multiple punctuation
    normalized = re.sub(r'([.!?]){2,}', r'\1', normalized)
    
    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return normalized


def create_context_string(utterances: List[Utterance]) -> str:
    """
    Create ID-tagged context string for LLM prompting.
    
    Format: [1][00:00:00] Speaker: text
    """
    lines = []
    for u in utterances:
        lines.append(f"[{u['id']}][{u['timestamp']}] {u['speaker']}: {u['text']}")
    
    return "\n".join(lines)


def get_speaker_history(utterances: List[Utterance]) -> dict:
    """Track speaker turns for coreference resolution."""
    history = {}
    for u in utterances:
        if u['speaker'] not in history:
            history[u['speaker']] = []
        history[u['speaker']].append(u['id'])
    return history
