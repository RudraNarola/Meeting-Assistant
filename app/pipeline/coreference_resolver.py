# app/pipeline/coreference_resolver.py
"""
Resolve pronouns (I, you) to actual speaker names using turn-taking context.
"""
from typing import List, Optional
from app.pipeline.utterance_parser import Utterance
import logging

logger = logging.getLogger("coref_resolver")


class CoreferenceResolver:
    """Resolve I/you pronouns to speaker names."""
    
    def __init__(self, utterances: List[Utterance]):
        self.utterances = utterances
        self.speaker_turns = self._build_speaker_turns()
    
    def _build_speaker_turns(self) -> dict:
        """Build turn-taking map: utterance_id -> speaker."""
        return {u['id']: u['speaker'] for u in self.utterances}
    
    def resolve_assignee(self, utterance_id: int, assignee: str) -> str:
        """
        Resolve assignee from pronouns.
        
        Rules:
        - "I" / "me" → current speaker
        - "you" → addressee (most recent non-current speaker)
        - Explicit name → keep as-is
        """
        if not assignee or assignee == "null":
            return ""
        
        assignee_lower = assignee.lower().strip()
        current_speaker = self.speaker_turns.get(utterance_id, "")
        
        # Handle "I" or "me"
        if assignee_lower in ["i", "me", "myself"]:
            logger.info(f"Resolved 'I' → {current_speaker}")
            return current_speaker
        
        # Handle "you"
        if assignee_lower in ["you", "yourself"]:
            addressee = self._find_addressee(utterance_id, current_speaker)
            logger.info(f"Resolved 'you' → {addressee}")
            return addressee
        
        # Already a name
        return assignee
    
    def _find_addressee(self, utterance_id: int, current_speaker: str) -> str:
        """
        Find addressee for 'you' pronoun.
        Look backward for most recent non-current speaker.
        """
        for i in range(utterance_id - 1, 0, -1):
            speaker = self.speaker_turns.get(i, "")
            if speaker and speaker != current_speaker:
                return speaker
        
        # Fallback: look forward
        for i in range(utterance_id + 1, len(self.utterances) + 1):
            speaker = self.speaker_turns.get(i, "")
            if speaker and speaker != current_speaker:
                return speaker
        
        return "Unknown"
    
    def get_speaker_at(self, utterance_id: int) -> str:
        """Get speaker name for utterance ID."""
        return self.speaker_turns.get(utterance_id, "Unknown")
