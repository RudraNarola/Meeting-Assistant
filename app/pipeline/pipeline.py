# app/pipeline/hf_pipeline.py
from transformers.pipelines import pipeline as hf_pipeline
from app.utils.schemas import ActionItem, Participant
from datetime import datetime, timedelta, date
from typing import List, Optional, Tuple
from app.pipeline.preprocess import split_sentences
from app.pipeline.priority_scorer import assign_priority
import logging, dateparser, re, os, requests, calendar
from dotenv import load_dotenv

# Load .env file
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hf_pipeline")

# ----------------------------
# Load Hugging Face models
# ----------------------------
try:
    logger.info("Loading Hugging Face models...")
    clf = hf_pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    ner = hf_pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
    logger.info("Models loaded successfully.")
except Exception as e:
    logger.error(f"Error loading models: {e}")
    clf = ner = None


# ----------------------------
# Zero-shot classification
# ----------------------------
def score_action(sentences: List[str]) -> List[float]:
    """Return confidence scores that each sentence is an action item."""
    if not clf or not sentences:
        return [0.0] * len(sentences)

    label_sets = [
        ["action item", "discussion", "decision", "information"],
        ["task", "discussion", "decision", "information"],
        ["follow-up", "discussion", "decision", "information"],
    ]

    scores = [0.0] * len(sentences)
    for labels in label_sets:
        res = clf(sentences, candidate_labels=labels, multi_label=False)
        results = res if isinstance(res, list) else [res]
        for i, r in enumerate(results):
            try:
                idx = r["labels"].index(labels[0])
                scores[i] = max(scores[i], float(r["scores"][idx]))
            except Exception:
                pass
    return scores


def is_action_mask(sentences: List[str], threshold: float = 0.35) -> List[bool]:
    """Mark which sentences are action items."""
    scores = score_action(sentences)
    for i, s in enumerate(sentences):
        logger.info(f"Sentence {i}: {s.strip()} -> score={scores[i]:.2f}")
    return [s >= threshold for s in scores]


# ----------------------------
# Owner extraction
# ----------------------------
def _firstnames_index(participants: List[Participant]) -> List[Tuple[str, Participant]]:
    out = []
    for p in participants:
        if not p or not p.name:
            continue
        first = p.name.strip().split()[0].lower()
        out.append((first, p))
    return out


def extract_owner(text: str, participants: List[Participant]) -> Optional[Participant]:
    """Extract owner using multiple strategies: pattern matching, NER, and name matching."""
    
    # If no participants provided, extract name directly from text using NER
    if not participants:
        return extract_owner_from_text(text)
    
    low = text.lower()
    firstnames = _firstnames_index(participants)
    
    # Strategy 1: Check for explicit assignment patterns (highest priority)
    # Patterns like: "Name should/must/will/to do something" or "Name to do"
    assignment_patterns = [
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:should|must|will|to)\s+",
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+to\s+",
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:should|must|will|needs to|has to)\s+",
    ]
    
    for pattern in assignment_patterns:
        match = re.search(pattern, text)
        if match:
            potential_name = match.group(1).strip()
            logger.info(f"Found potential owner via pattern: {potential_name}")
            
            # Try to match with participants (full name or first name)
            for p in participants:
                if not p or not p.name:
                    continue
                # Check full name match
                if potential_name.lower() in p.name.lower() or p.name.lower() in potential_name.lower():
                    logger.info(f"Matched owner (full name): {p.name}")
                    return p
                # Check first name match
                first = p.name.strip().split()[0].lower()
                if first == potential_name.split()[0].lower():
                    logger.info(f"Matched owner (first name): {p.name}")
                    return p
    
    # Strategy 2: NER-based extraction
    if ner:
        try:
            ents = ner(text)
            for e in ents:
                if e.get("entity_group") == "PER":
                    token = str(e.get("word", "")).lower().replace("##", "")
                    logger.info(f"NER found PERSON entity: {token}")
                    
                    for first, p in firstnames:
                        if first in token or token in first:
                            logger.info(f"Matched owner via NER: {p.name}")
                            return p
                    
                    # Try matching with full names
                    for p in participants:
                        if not p or not p.name:
                            continue
                        if token in p.name.lower() or p.name.lower() in token:
                            logger.info(f"Matched owner via NER (full name): {p.name}")
                            return p
        except Exception as e:
            logger.debug(f"NER extraction failed: {e}")
    
    # Strategy 3: Text-based first name fallback
    for first, p in firstnames:
        if re.search(rf"\b{re.escape(first)}\b", low):
            logger.info(f"Matched owner via text search: {p.name}")
            return p
    
    logger.info("No owner found")
    return None


def extract_owner_from_text(text: str) -> Optional[Participant]:
    """
    Extract owner name directly from text using NER and pattern matching.
    Used when no participant list is provided.
    """
    # Strategy 1: Pattern matching for assignment patterns
    assignment_patterns = [
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:should|must|will|to)\s+",
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+to\s+",
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:should|must|will|needs to|has to)\s+",
    ]
    
    for pattern in assignment_patterns:
        match = re.search(pattern, text)
        if match:
            name = match.group(1).strip()
            logger.info(f"Extracted owner from pattern: {name}")
            return Participant(name=name)
    
    # Strategy 2: Use NER to find person names
    if ner:
        try:
            ents = ner(text)
            person_names = []
            
            for e in ents:
                if e.get("entity_group") == "PER":
                    name = str(e.get("word", "")).strip().replace("##", "")
                    # Clean up and capitalize properly
                    name = " ".join(word.capitalize() for word in name.split())
                    if name and len(name) > 2:  # Avoid single letters
                        person_names.append(name)
            
            # Return the first detected person name
            if person_names:
                logger.info(f"Extracted owner via NER: {person_names[0]}")
                return Participant(name=person_names[0])
                
        except Exception as e:
            logger.debug(f"NER extraction failed: {e}")
    
    logger.info("No owner found in text")
    return None


# ----------------------------
# Robust due date extraction
# ----------------------------
DAY_NAMES = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)"
MONTH_WORDS = (
    "january|february|march|april|may|june|july|august|september|october|november|december|"
    "jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec"
)

def _normalize_phrase(text: str) -> str:
    """Normalize date phrases for dateparser."""
    text = text.lower()
    
    # Expand common abbreviations
    text = text.replace("eow", "end of week").replace("eom", "end of month")
    text = text.replace("eod", "end of day").replace("noon", "12pm")
    
    # Handle "this week/month" variations
    text = re.sub(r"\bthis\b\s+(week|month|friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b", r"\1", text)
    
    return text


def _extract_date_phrases(text: str) -> List[str]:
    """Extract potential date-related phrases from text."""
    phrases = []
    
    # Pattern 1: "by/before/until + date/time" - capture full match
    pattern1 = re.compile(
        rf"(?:by|before|until|on)\s+(?:next\s+)?(?:this\s+)?({DAY_NAMES})\s*(?:\d{{1,2}}(?:st|nd|rd|th)?)?(?:\s+noon|\s+morning|\s+evening|\s+night)?",
        re.IGNORECASE
    )
    matches = pattern1.finditer(text)
    for m in matches:
        phrases.append(m.group(0))  # Get full match, not just the group
    
    # Pattern 1b: "by/before/until + month + day"
    pattern1b = re.compile(
        rf"(?:by|before|until|on)\s+({MONTH_WORDS})\s+\d{{1,2}}(?:st|nd|rd|th)?",
        re.IGNORECASE
    )
    matches = pattern1b.finditer(text)
    for m in matches:
        phrases.append(m.group(0))
    
    # Pattern 2: "next/this + day/week"
    pattern2 = re.compile(
        rf"(?:next|this|coming)\s+({DAY_NAMES}|week|month)",
        re.IGNORECASE
    )
    matches = pattern2.finditer(text)
    for m in matches:
        phrases.append(m.group(0))  # Get full match
    
    # Pattern 3: Specific dates like "October 31" or "31st October"
    pattern3 = re.compile(
        rf"({MONTH_WORDS})\s+\d{{1,2}}(?:st|nd|rd|th)?|\d{{1,2}}(?:st|nd|rd|th)?\s+(?:of\s+)?({MONTH_WORDS})",
        re.IGNORECASE
    )
    matches = pattern3.finditer(text)
    for m in matches:
        phrases.append(m.group(0))
    
    # Pattern 4: Numeric dates (MM/DD, DD-MM-YYYY, etc.)
    pattern4 = re.compile(
        r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b"
    )
    phrases.extend(pattern4.findall(text))
    
    # Pattern 5: Relative terms
    pattern5 = re.compile(
        r"\b(tomorrow|today|eow|eom|eod)\b",
        re.IGNORECASE
    )
    phrases.extend(pattern5.findall(text))
    
    return phrases


def parse_due_date_from_phrase(text: str, ref: datetime) -> Optional[date]:
    """Parse both relative and explicit due dates with enhanced patterns."""
    low = _normalize_phrase(text)
    
    # Quick relative cases
    if "tomorrow" in low:
        return (ref + timedelta(days=1)).date()
    if "today" in low:
        return ref.date()
    if "end of week" in low:
        days_until_friday = (calendar.FRIDAY - ref.weekday()) % 7
        if days_until_friday == 0:  # If today is Friday
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
    
    # Extract specific date phrases
    phrases = _extract_date_phrases(text)
    
    for phrase in phrases:
        if not phrase or not phrase.strip():
            continue
            
        try:
            # Try dateparser with future preference
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
                logger.info(f"Parsed '{phrase}' as {parsed.date()}")
                return parsed.date()
        except Exception as e:
            logger.debug(f"Failed to parse phrase '{phrase}': {e}")
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
            logger.info(f"Fallback parsed entire text as {parsed.date()}")
            return parsed.date()
    except Exception:
        pass
    
    return None


def extract_due(text: str, ref: datetime) -> Optional[date]:
    """Extract due date using multiple strategies."""
    logger.info(f"Extracting due date from: {text}")
    
    # Strategy 1: Look for explicit date patterns in the text
    due_date = parse_due_date_from_phrase(text, ref)
    if due_date:
        logger.info(f"Found due date via pattern matching: {due_date}")
        return due_date
    
    # Strategy 2: Try NER for DATE entities
    if ner:
        try:
            ents = ner(text)
            for e in ents:
                if e.get("entity_group") == "DATE":
                    word = str(e.get("word", "")).strip()
                    logger.info(f"NER found DATE entity: {word}")
                    
                    # Try to parse the NER entity
                    dt = dateparser.parse(
                        word,
                        settings={
                            "PREFER_DATES_FROM": "future",
                            "RELATIVE_BASE": ref,
                            "RETURN_AS_TIMEZONE_AWARE": False,
                        },
                    )
                    if dt and dt.date() >= ref.date():
                        logger.info(f"NER date parsed as: {dt.date()}")
                        return dt.date()
        except Exception as e:
            logger.warning(f"NER date extraction failed: {e}")
    
    logger.info("No due date found")
    return None


# ----------------------------
# Task extraction from sentence
# ----------------------------
def extract_task_only(text: str, owner_name: Optional[str] = None) -> str:
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


# ----------------------------
# Title generation (Gemini)
# ----------------------------
def generate_title(text: str, owner_name: Optional[str] = None) -> str:
    """Generate short imperative titles using Gemini; fallback to rule-based."""
    # First, extract just the task part (without owner name and date)
    task_only = extract_task_only(text, owner_name)
    
    if not GEMINI_API_KEY:
        # Fallback: use the cleaned task text
        return task_only[:80] if task_only else text[:80]

    prompt = (
        "Rewrite the following task into a short, imperative title "
        "(Verb + Object) in 3–7 words, professional and concise. "
        "Remove any person names, dates, or deadlines. Focus only on the action:\n"
        f"{task_only}"
    )

    try:
        resp = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp:generateContent",
            headers={"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        title = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
            .rstrip(".")
        )
        
        if title:
            # Ensure it starts with capital letter
            title = title[0].upper() + title[1:] if title else title
            return title
        else:
            return task_only[:80] if task_only else text[:80]
            
    except Exception as e:
        logger.error(f"Gemini API failed: {e}")
        return task_only[:80] if task_only else text[:80]

# ----------------------------
# Main extraction pipeline
# ----------------------------
def extract_action_items(summary: str, participants: List[Participant], meeting_time: Optional[str] = None) -> List[ActionItem]:
    """Extract action items using models, meeting_time for relative parsing."""
    logger.info("Running Hugging Face + Gemini action item extraction...")
    logger.info(f"Meeting time: {meeting_time}")
    logger.info(f"Number of participants: {len(participants)}")

    # Use meeting timestamp if available
    if meeting_time:
        try:
            ref_dt = datetime.fromisoformat(meeting_time.replace("Z", "+00:00"))
            logger.info(f"Using meeting reference time: {ref_dt}")
        except Exception as e:
            logger.warning(f"Invalid meeting_time format: {e}; falling back to UTC now.")
            ref_dt = datetime.utcnow()
    else:
        ref_dt = datetime.utcnow()

    sents = split_sentences(summary)
    if not sents:
        return []
    
    logger.info(f"Split into {len(sents)} sentences")

    mask = is_action_mask(sents, threshold=0.30)  # Lowered threshold for better recall
    items: List[ActionItem] = []

    for idx, sent in enumerate(sents):
        if not mask[idx]:
            logger.info(f"Sentence {idx} skipped (not an action item)")
            continue
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing action item {idx}: {sent}")
        
        owner = extract_owner(sent, participants)
        due = extract_due(sent, ref_dt)
        
        # Generate title with owner name to remove it from the task
        owner_name = owner.name if owner else None
        title = generate_title(sent, owner_name)

        if len(title.split()) > 10:
            title = " ".join(title.split()[:7])
        
        # Intelligently assign priority based on multiple factors
        priority = assign_priority(
            title=title,
            due_date=due,
            meeting_time=ref_dt,
            full_text=sent
        )
        
        logger.info(f"Extracted - Title: {title}")
        logger.info(f"Extracted - Owner: {owner.name if owner else 'None'}")
        logger.info(f"Extracted - Due: {due}")
        logger.info(f"Extracted - Priority: {priority}")

        item = ActionItem(
            id=f"hf-{int(ref_dt.timestamp())}-{idx}",
            title=title,
            owner=owner,
            due=due,
            priority=priority,
            status="open"
        )
        items.append(item)

    logger.info(f"\n{'='*60}")
    logger.info(f"Extracted {len(items)} action items total.")
    return items
