# app/pipeline/post_processor.py
"""
Post-processing: resolve coreferences, normalize deadlines, rescore priority.
"""
import logging
import dateparser
from datetime import datetime, date, timedelta
from typing import Optional
import re

logger = logging.getLogger("post_processor")

# Priority keywords (guardrails)
HIGH_KEYWORDS = ["critical", "urgent", "accelerated", "asap", "eod", "blocker", "immediately", "today", "now"]
MEDIUM_KEYWORDS = ["tomorrow", "this week", "by friday", "monday", "tuesday", "wednesday", "thursday"]
LOW_KEYWORDS = ["eventually", "nice-to-have", "when possible", "someday", "later"]


def normalize_deadline(deadline_text: Optional[str], meeting_date: str) -> tuple[Optional[str], Optional[date]]:
    """
    Parse deadline text to ISO date with custom patterns.
    
    Handles:
    - "end of day tomorrow" → tomorrow's date
    - "EOD Friday" → next Friday
    - "immediately" → today
    - "tomorrow" → tomorrow's date
    - "by Friday" → next Friday
    - "next week" → 7 days from meeting
    
    Returns:
        (deadline_text, deadline_iso)
    """
    if not deadline_text or deadline_text.lower() in ["null", "none", ""]:
        return (None, None)
    
    # Parse meeting date properly
    try:
        base_datetime = datetime.fromisoformat(meeting_date.replace('Z', '+00:00'))
    except:
        try:
            base_datetime = datetime.fromisoformat(meeting_date)
        except:
            base_datetime = datetime.utcnow()
    
    deadline_lower = deadline_text.lower().strip()
    
    # Custom patterns (fast path)
    custom_parsed = _parse_custom_patterns(deadline_lower, base_datetime)
    if custom_parsed:
        logger.info(f"Custom pattern parsed '{deadline_text}' → {custom_parsed}")
        return (deadline_text, custom_parsed)
    
    # Fallback to dateparser
    parsed_date = dateparser.parse(
        deadline_text,
        settings={
            'RELATIVE_BASE': base_datetime,
            'PREFER_DATES_FROM': 'future',
            'TIMEZONE': 'UTC',
            'RETURN_AS_TIMEZONE_AWARE': False
        }
    )
    
    if parsed_date:
        logger.info(f"Dateparser parsed '{deadline_text}' → {parsed_date.date()}")
        return (deadline_text, parsed_date.date())
    
    logger.warning(f"Could not parse deadline: '{deadline_text}'")
    return (deadline_text, None)


def _parse_custom_patterns(deadline_lower: str, base_datetime: datetime) -> Optional[date]:
    """
    Parse common deadline patterns that dateparser misses.
    
    Patterns:
    - immediately, asap, now → today
    - today, eod today → today
    - tomorrow, eod tomorrow, end of day tomorrow → tomorrow
    - by [day] → next occurrence of day
    - next week → +7 days
    - this week → friday of current week
    """
    base_date = base_datetime.date()
    
    # Immediately / ASAP / Now → today
    if any(word in deadline_lower for word in ["immediately", "asap", "now", "right away", "right now"]):
        return base_date
    
    # Today / EOD today
    if "today" in deadline_lower or (re.search(r'\beod\b', deadline_lower) and "tomorrow" not in deadline_lower):
        return base_date
    
    # Tomorrow / EOD tomorrow / end of day tomorrow
    if "tomorrow" in deadline_lower or "eod tomorrow" in deadline_lower or "end of day tomorrow" in deadline_lower:
        return base_date + timedelta(days=1)
    
    # By Friday / Friday / next Friday
    day_names = {
        'monday': 0, 'mon': 0,
        'tuesday': 1, 'tue': 1, 'tues': 1,
        'wednesday': 2, 'wed': 2,
        'thursday': 3, 'thu': 3, 'thur': 3, 'thurs': 3,
        'friday': 4, 'fri': 4,
        'saturday': 5, 'sat': 5,
        'sunday': 6, 'sun': 6
    }
    
    for day_name, day_num in day_names.items():
        if day_name in deadline_lower:
            # Find next occurrence of this day
            days_ahead = day_num - base_date.weekday()
            if days_ahead <= 0:  # Target day already passed this week
                days_ahead += 7
            return base_date + timedelta(days=days_ahead)
    
    # Next week
    if "next week" in deadline_lower:
        return base_date + timedelta(days=7)
    
    # This week (default to Friday)
    if "this week" in deadline_lower:
        days_until_friday = (4 - base_date.weekday()) % 7
        if days_until_friday == 0:
            days_until_friday = 7
        return base_date + timedelta(days=days_until_friday)
    
    # In X days
    days_match = re.search(r'in (\d+) days?', deadline_lower)
    if days_match:
        return base_date + timedelta(days=int(days_match.group(1)))
    
    return None


def rescore_priority(
    deadline_text: Optional[str],
    deadline_iso: Optional[date],
    meeting_date: str,
    original_priority: str
) -> str:
    """
    Rescore priority using keyword guardrails.
    
    Priority hierarchy:
    1. Keyword-based (overrides everything)
    2. Deadline-based (if ISO parsed)
    3. Original LLM priority (fallback)
    """
    if not deadline_text:
        return "low"
    
    deadline_lower = deadline_text.lower()
    
    # Check keywords
    if any(kw in deadline_lower for kw in HIGH_KEYWORDS):
        return "high"
    
    if any(kw in deadline_lower for kw in MEDIUM_KEYWORDS):
        return "medium"
    
    if any(kw in deadline_lower for kw in LOW_KEYWORDS):
        return "low"
    
    # Use deadline distance if parsed
    if deadline_iso:
        meeting_dt = date.fromisoformat(meeting_date)
        days_until = (deadline_iso - meeting_dt).days
        
        if days_until < 0:
            return "critical"  # Overdue
        elif days_until <= 1:
            return "high"
        elif days_until <= 3:
            return "medium"
        elif days_until <= 7:
            return "normal"
        else:
            return "low"
    
    # Fallback to LLM priority
    return original_priority or "medium"


def apply_priority_guardrails(priority: str, confidence: float) -> str:
    """Apply confidence-based guardrails to priority."""
    if confidence < 0.5:
        return "low"  # Low confidence → downgrade priority
    return priority
