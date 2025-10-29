# app/pipeline/priority_scorer.py
"""
Simple deadline-based priority scoring for action items.
Priority is assigned based purely on how soon the task is due.
"""

from datetime import datetime, date
from typing import Optional
from app.utils.schemas import PriorityEnum
import logging

logger = logging.getLogger("priority_scorer")


class PriorityScorer:
    """
    Simple priority assignment based on deadline proximity.
    
    Priority Rules:
    - HIGH: Due today, tomorrow, or within 2 days
    - NORMAL: Due within 3-7 days
    - LOW: Due after 7 days or no deadline
    """
    
    @staticmethod
    def calculate_priority(
        title: str,
        due_date: Optional[date] = None,
        meeting_time: Optional[datetime] = None,
        full_text: Optional[str] = None
    ) -> PriorityEnum:
        """
        Calculate priority based purely on deadline.
        
        Args:
            title: The task title
            due_date: Due date of the task
            meeting_time: When the meeting occurred (for relative calculation)
            full_text: Full sentence from meeting (not used in simple mode)
        
        Returns:
            PriorityEnum: high, normal, or low
        """
        if not due_date:
            logger.info(f"No deadline - assigning LOW priority to: {title[:50]}")
            return PriorityEnum.low
        
        # Use meeting time as reference, or current time
        reference_time = meeting_time if meeting_time else datetime.utcnow()
        ref_date = reference_time.date()
        
        # Calculate days until due
        days_until_due = (due_date - ref_date).days
        
        # Assign priority based on days remaining
        if days_until_due < 0:
            # Overdue - high priority
            logger.info(f"OVERDUE ({abs(days_until_due)} days) - HIGH priority: {title[:50]}")
            return PriorityEnum.high
        elif days_until_due <= 2:
            # Due today, tomorrow, or day after - high priority
            logger.info(f"Due in {days_until_due} day(s) - HIGH priority: {title[:50]}")
            return PriorityEnum.high
        elif days_until_due <= 7:
            # Due within a week - normal priority
            logger.info(f"Due in {days_until_due} days - NORMAL priority: {title[:50]}")
            return PriorityEnum.normal
        else:
            # Due later than a week - low priority
            logger.info(f"Due in {days_until_due} days - LOW priority: {title[:50]}")
            return PriorityEnum.low


def assign_priority(
    title: str,
    due_date: Optional[date] = None,
    meeting_time: Optional[datetime] = None,
    full_text: Optional[str] = None
) -> PriorityEnum:
    """
    Convenience function to assign priority to a task.
    
    Args:
        title: Task title
        due_date: Due date
        meeting_time: Meeting timestamp
        full_text: Full sentence from meeting
    
    Returns:
        PriorityEnum: high, normal, or low
    """
    return PriorityScorer.calculate_priority(title, due_date, meeting_time, full_text)
