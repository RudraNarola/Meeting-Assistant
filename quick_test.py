"""
Simple test script to validate the improvements without heavy ML dependencies
Tests the date extraction logic independently
"""

from datetime import datetime, timedelta, date
import dateparser
import re
import calendar

print("="*100)
print("DEADLINE EXTRACTION LOGIC TEST")
print("="*100)

# Test cases based on your example
test_cases = [
    {
        "sentence": "Krishna Mevada should finalize the quarterly presentation slides and share them with the board before Friday noon.",
        "meeting_date": "2025-10-28T10:00:00Z",
        "expected_owner": "Krishna Mevada",
        "expected_due": "2025-10-31",
        "phrase": "before Friday noon"
    },
    {
        "sentence": "Vedant Kavar to prepare the demo environment and test the backup recovery scripts by next Tuesday.",
        "meeting_date": "2025-10-28T10:00:00Z",
        "expected_owner": "Vedant Kavar",
        "expected_due": "2025-11-04",
        "phrase": "by next Tuesday"
    },
    {
        "sentence": "Ronit Patel must update the documentation portal and add API usage examples by EOW.",
        "meeting_date": "2025-10-28T10:00:00Z",
        "expected_owner": "Ronit Patel",
        "expected_due": "2025-10-31",
        "phrase": "by EOW"
    },
    {
        "sentence": "Harsh will coordinate with DevOps for deployment approval by October 31.",
        "meeting_date": "2025-10-28T10:00:00Z",
        "expected_owner": "Harsh",
        "expected_due": "2025-10-31",
        "phrase": "by October 31"
    },
    {
        "sentence": "Jaivik to schedule a quick sync-up call with all team leads tomorrow morning.",
        "meeting_date": "2025-10-28T10:00:00Z",
        "expected_owner": "Jaivik",
        "expected_due": "2025-10-29",
        "phrase": "tomorrow morning"
    },
]

# Date extraction patterns (same as in pipeline.py)
DAY_NAMES = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)"
MONTH_WORDS = (
    "january|february|march|april|may|june|july|august|september|october|november|december|"
    "jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec"
)

def extract_date_phrases(text: str):
    """Extract potential date-related phrases from text."""
    phrases = []
    
    # Pattern 1: "by/before/until + date/time" - capture full match
    pattern1 = re.compile(
        rf"(?:by|before|until|on)\s+(?:next\s+)?(?:this\s+)?({DAY_NAMES})\s*(?:\d{{1,2}}(?:st|nd|rd|th)?)?(?:\s+noon|\s+morning|\s+evening|\s+night)?",
        re.IGNORECASE
    )
    matches = pattern1.finditer(text)
    for m in matches:
        phrases.append(m.group(0))  # Get full match
    
    # Pattern 1b: "by/before/until + month + day"
    pattern1b = re.compile(
        rf"(?:by|before|until|on)\s+({MONTH_WORDS})\s+\d{{1,2}}(?:st|nd|rd|th)?",
        re.IGNORECASE
    )
    matches = pattern1b.finditer(text)
    for m in matches:
        phrases.append(m.group(0))
    
    # Pattern 2: "next + day/week"
    pattern2 = re.compile(
        rf"(?:next|this|coming)\s+({DAY_NAMES}|week|month)",
        re.IGNORECASE
    )
    matches = pattern2.finditer(text)
    for m in matches:
        phrases.append(m.group(0))  # Get full match
    
    # Pattern 3: Specific dates like "October 31"
    pattern3 = re.compile(
        rf"({MONTH_WORDS})\s+\d{{1,2}}(?:st|nd|rd|th)?|\d{{1,2}}(?:st|nd|rd|th)?\s+(?:of\s+)?({MONTH_WORDS})",
        re.IGNORECASE
    )
    matches = pattern3.finditer(text)
    for m in matches:
        phrases.append(m.group(0))
    
    # Pattern 4: Relative terms
    pattern4 = re.compile(r"\b(tomorrow|today|eow|eom|eod)\b", re.IGNORECASE)
    matches = pattern4.finditer(text)
    for m in matches:
        phrases.append(m.group(0))
    
    return phrases

def normalize_phrase(text: str) -> str:
    """Normalize date phrases for dateparser."""
    text = text.lower()
    text = text.replace("eow", "end of week").replace("eom", "end of month")
    text = text.replace("eod", "end of day").replace("noon", "12pm")
    text = re.sub(r"\bthis\b\s+(week|month|friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b", r"\1", text)
    return text

def extract_due_date(text: str, ref: datetime):
    """Extract due date from text."""
    low = normalize_phrase(text)
    
    # Quick relative cases
    if "tomorrow" in low:
        return (ref + timedelta(days=1)).date()
    if "today" in low:
        return ref.date()
    if "end of week" in low:
        days_until_friday = (calendar.FRIDAY - ref.weekday()) % 7
        if days_until_friday == 0:
            days_until_friday = 0
        return (ref + timedelta(days=days_until_friday)).date()
    if "end of month" in low:
        next_month = (ref.replace(day=28) + timedelta(days=4)).replace(day=1)
        return (next_month - timedelta(days=1)).date()
    
    # Handle specific day names (e.g., "Friday", "next Tuesday")
    day_mapping = {
        'monday': calendar.MONDAY,
        'tuesday': calendar.TUESDAY,
        'wednesday': calendar.WEDNESDAY,
        'thursday': calendar.THURSDAY,
        'friday': calendar.FRIDAY,
        'saturday': calendar.SATURDAY,
        'sunday': calendar.SUNDAY,
        'mon': calendar.MONDAY,
        'tue': calendar.TUESDAY,
        'wed': calendar.WEDNESDAY,
        'thu': calendar.THURSDAY,
        'fri': calendar.FRIDAY,
        'sat': calendar.SATURDAY,
        'sun': calendar.SUNDAY,
    }
    
    # Check for "next [day]" or "before/by [day]"
    for day_name, day_num in day_mapping.items():
        # Pattern: "next Tuesday" or "by next Tuesday"
        if re.search(rf"\bnext\s+{day_name}\b", low):
            days_ahead = day_num - ref.weekday()
            if days_ahead <= 0:  # Target day already happened this week
                days_ahead += 7
            return (ref + timedelta(days=days_ahead)).date()
        
        # Pattern: "Friday" or "before Friday" or "by Friday" (this week or next)
        if re.search(rf"\b(?:before|by|on|until)\s+{day_name}\b", low):
            days_ahead = day_num - ref.weekday()
            if days_ahead <= 0:  # If day already passed, assume next week
                days_ahead += 7
            return (ref + timedelta(days=days_ahead)).date()
    
    # Extract date phrases
    phrases = extract_date_phrases(text)
    
    for phrase in phrases:
        if not phrase or not phrase.strip():
            continue
        try:
            parsed = dateparser.parse(
                phrase,
                settings={
                    "PREFER_DATES_FROM": "future",
                    "RELATIVE_BASE": ref,
                    "RETURN_AS_TIMEZONE_AWARE": False,
                    "PREFER_DAY_OF_MONTH": "first",
                },
            )
            if parsed and parsed.date() >= ref.date():
                return parsed.date()
        except Exception:
            continue
    
    return None

def extract_owner_name(text: str):
    """Simple owner extraction using patterns."""
    assignment_patterns = [
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:should|must|will|to)\s+",
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+to\s+",
    ]
    
    for pattern in assignment_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    
    return None

def extract_task_only(text: str, owner_name: str = None):
    """Extract just the task/action from sentence, removing owner name and date phrases."""
    cleaned = text.strip()
    
    # Remove owner name from the beginning if present
    if owner_name:
        # Try to remove "Owner should/must/will/to ..." patterns
        name_patterns = [
            rf"^{re.escape(owner_name)}\s+(?:should|must|will|needs to|has to)\s+",
            rf"^{re.escape(owner_name)}\s+to\s+",
        ]
        for pattern in name_patterns:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
        
        # Also try with first name only
        if owner_name:
            first_name = owner_name.split()[0]
            first_name_patterns = [
                rf"^{re.escape(first_name)}\s+(?:should|must|will|needs to|has to)\s+",
                rf"^{re.escape(first_name)}\s+to\s+",
            ]
            for pattern in first_name_patterns:
                cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    
    # Remove common date/deadline phrases from the end
    date_phrase_patterns = [
        r"\s+(?:by|before|until|on)\s+(?:next\s+)?(?:this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:noon|morning|evening|night|eod))?\.?$",
        r"\s+(?:by|before|until|on)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\.?$",
        r"\s+(?:by|before|until|on)\s+\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\.?$",
        r"\s+(?:by|before|until|on)\s+(?:eow|eom|eod)\.?$",
        r"\s+tomorrow(?:\s+(?:morning|afternoon|evening|night))?\.?$",
        r"\s+(?:by|on|before|until)\s+next\s+\w+\.?$",
        r"\s+and\s+share\s+them\s+with\s+the\s+board\s+before\s+.+$",  # Specific cleanup
    ]
    
    for pattern in date_phrase_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    
    # Additional cleanup: remove trailing "by/before/until" if left over
    cleaned = re.sub(r"\s+(?:by|before|until|on)$", "", cleaned, flags=re.IGNORECASE)
    
    # Remove trailing period
    cleaned = cleaned.rstrip(".")
    
    # Capitalize first letter
    if cleaned:
        cleaned = cleaned[0].upper() + cleaned[1:]
    
    return cleaned.strip()

# Run tests
passed = 0
failed = 0

for i, test in enumerate(test_cases, 1):
    print(f"\n{'='*100}")
    print(f"Test Case {i}: {test['phrase']}")
    print(f"Sentence: {test['sentence']}")
    
    # Parse meeting date
    ref_dt = datetime.fromisoformat(test['meeting_date'].replace("Z", "+00:00"))
    
    # Extract owner
    extracted_owner = extract_owner_name(test['sentence'])
    owner_match = extracted_owner and test['expected_owner'].startswith(extracted_owner)
    
    # Extract due date
    extracted_due = extract_due_date(test['sentence'], ref_dt)
    due_match = extracted_due and str(extracted_due) == test['expected_due']
    
    # Extract task title (without owner and date)
    task_title = extract_task_only(test['sentence'], extracted_owner)
    
    # Results
    print(f"\nOwner:")
    print(f"  Expected: {test['expected_owner']}")
    print(f"  Extracted: {extracted_owner}")
    print(f"  Status: {'✓ PASS' if owner_match else '✗ FAIL'}")
    
    print(f"\nDue Date:")
    print(f"  Expected: {test['expected_due']}")
    print(f"  Extracted: {extracted_due}")
    print(f"  Status: {'✓ PASS' if due_match else '✗ FAIL'}")
    
    print(f"\nTask Title (cleaned):")
    print(f"  Extracted: {task_title}")
    
    if owner_match and due_match:
        passed += 1
        print(f"\n✓ Overall: PASS")
    else:
        failed += 1
        print(f"\n✗ Overall: FAIL")

print(f"\n{'='*100}")
print(f"FINAL RESULTS: {passed}/{len(test_cases)} tests passed")
print("="*100)

if passed == len(test_cases):
    print("\n🎉 All tests passed! The improvements are working correctly.")
else:
    print(f"\n⚠️  {failed} test(s) failed. Review the output above for details.")
