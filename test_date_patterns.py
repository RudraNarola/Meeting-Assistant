"""Test date extraction patterns without loading ML models"""
from datetime import datetime, timedelta, date
import dateparser
import re
import calendar

# Test sentences from your example
test_cases = [
    ("Krishna Mevada should finalize the quarterly presentation slides and share them with the board before Friday noon.", 
     "2025-10-28T10:00:00Z", "2025-10-31"),
    
    ("Vedant Kavar to prepare the demo environment and test the backup recovery scripts by next Tuesday.", 
     "2025-10-28T10:00:00Z", "2025-11-04"),
    
    ("Ronit Patel must update the documentation portal and add API usage examples by EOW.", 
     "2025-10-28T10:00:00Z", "2025-10-31"),
    
    ("Harsh will coordinate with DevOps for deployment approval by October 31.", 
     "2025-10-28T10:00:00Z", "2025-10-31"),
    
    ("Jaivik to schedule a quick sync-up call with all team leads tomorrow morning.", 
     "2025-10-28T10:00:00Z", "2025-10-29"),
]

DAY_NAMES = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)"
MONTH_WORDS = (
    "january|february|march|april|may|june|july|august|september|october|november|december|"
    "jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec"
)

def _normalize_phrase(text: str) -> str:
    """Normalize date phrases for dateparser."""
    text = text.lower()
    text = text.replace("eow", "end of week").replace("eom", "end of month")
    text = text.replace("eod", "end of day").replace("noon", "12pm")
    text = re.sub(r"\bthis\b\s+(week|month|friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b", r"\1", text)
    return text

def _extract_date_phrases(text: str):
    """Extract potential date-related phrases from text."""
    phrases = []
    
    # Pattern 1: "by/before/until + date/time"
    pattern1 = re.compile(
        rf"(?:by|before|until|on)\s+(?:next\s+)?({DAY_NAMES}|{MONTH_WORDS})\s*(?:\d{{1,2}}(?:st|nd|rd|th)?)?(?:\s+noon|\s+morning|\s+evening)?",
        re.IGNORECASE
    )
    matches = pattern1.finditer(text)
    for m in matches:
        phrases.append(m.group(0))
    
    # Pattern 2: "next + day/week"
    pattern2 = re.compile(
        rf"(?:next|this)\s+({DAY_NAMES}|week|month)",
        re.IGNORECASE
    )
    matches = pattern2.finditer(text)
    for m in matches:
        phrases.append(m.group(0))
    
    # Pattern 3: Specific dates like "October 31"
    pattern3 = re.compile(
        rf"({MONTH_WORDS})\s+\d{{1,2}}(?:st|nd|rd|th)?|\d{{1,2}}(?:st|nd|rd|th)?\s+({MONTH_WORDS})",
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

def parse_due_date_from_phrase(text: str, ref: datetime):
    """Parse both relative and explicit due dates with enhanced patterns."""
    low = _normalize_phrase(text)
    
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
    
    # Extract specific date phrases
    phrases = _extract_date_phrases(text)
    
    print(f"  Extracted phrases: {phrases}")
    
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
                print(f"  ✓ Parsed '{phrase}' as {parsed.date()}")
                return parsed.date()
        except Exception as e:
            print(f"  ✗ Failed to parse phrase '{phrase}': {e}")
            continue
    
    # Fallback: try parsing the entire text
    try:
        parsed = dateparser.parse(
            low,
            settings={
                "PREFER_DATES_FROM": "future",
                "RELATIVE_BASE": ref,
                "RETURN_AS_TIMEZONE_AWARE": False,
            },
        )
        if parsed and parsed.date() >= ref.date():
            print(f"  ✓ Fallback parsed entire text as {parsed.date()}")
            return parsed.date()
    except Exception:
        pass
    
    return None

print("=" * 100)
print("TESTING DATE EXTRACTION PATTERNS")
print("=" * 100)

passed = 0
failed = 0

for i, (sentence, meeting_time, expected_date) in enumerate(test_cases, 1):
    print(f"\n{'='*100}")
    print(f"Test Case {i}:")
    print(f"Sentence: {sentence}")
    print(f"Reference: {meeting_time}")
    print(f"Expected: {expected_date}")
    
    ref_dt = datetime.fromisoformat(meeting_time.replace("Z", "+00:00"))
    extracted = parse_due_date_from_phrase(sentence, ref_dt)
    
    if extracted:
        extracted_str = str(extracted)
        status = "✓ PASS" if extracted_str == expected_date else "✗ FAIL"
        if extracted_str == expected_date:
            passed += 1
        else:
            failed += 1
        print(f"Extracted: {extracted_str}")
        print(f"Status: {status}")
    else:
        print(f"Extracted: None")
        print(f"Status: ✗ FAIL (no date found)")
        failed += 1

print(f"\n{'='*100}")
print(f"RESULTS: {passed} passed, {failed} failed out of {len(test_cases)} tests")
print("=" * 100)
