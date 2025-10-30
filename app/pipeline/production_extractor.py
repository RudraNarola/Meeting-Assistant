# app/pipeline/production_extractor.py
"""
Production-grade action item extractor with all hardening features:
- Utterance parsing
- Coreference resolution
- Self-consistency (3-sample voting)
- Evidence tracking
- Deadline normalization
- Priority guardrails
"""
import logging
from typing import List, Optional
from datetime import datetime

from app.pipeline.utterance_parser import parse_transcript, create_context_string, Utterance
from app.pipeline.coreference_resolver import CoreferenceResolver
from app.pipeline.llm_extractor import LLMExtractor
from app.pipeline.extraction_schema import ExtractedActionItem, ExtractionResult
from app.pipeline.post_processor import normalize_deadline, rescore_priority, apply_priority_guardrails
from app.utils.schemas import ActionItem, Participant, PriorityEnum

logger = logging.getLogger("production_extractor")


def extract_action_items_production(
    transcription: str,
    meeting_time: Optional[str] = None,
    use_self_consistency: bool = True
) -> List[ActionItem]:
    """
    Full production pipeline for action item extraction.
    
    Pipeline:
    1. Parse transcript → utterances
    2. Build context string with IDs
    3. Extract with LLM (self-consistency if enabled)
    4. Resolve coreferences (I/you → names)
    5. Normalize deadlines
    6. Rescore priorities with guardrails
    7. Convert to ActionItem schema
    
    Args:
        transcription: Raw transcript with [timestamp] Speaker: text format
        meeting_time: ISO timestamp of meeting (for relative date parsing)
        use_self_consistency: Run 3-sample voting (slower but more accurate)
    
    Returns:
        List of validated ActionItem objects
    """
    logger.info("="*60)
    logger.info("Starting production action item extraction")
    logger.info("="*60)
    
    # Step 1: Parse transcript into utterances
    logger.info("Step 1: Parsing transcript into utterances...")
    utterances = parse_transcript(transcription)
    
    if not utterances:
        logger.warning("No utterances parsed from transcript")
        return []
    
    logger.info(f"✓ Parsed {len(utterances)} utterances")
    for u in utterances[:3]:  # Show first 3
        logger.info(f"  [{u['id']}] {u['speaker']}: {u['text'][:50]}...")
    
    # Step 2: Create context string for LLM
    logger.info("Step 2: Building context string...")
    context_str = create_context_string(utterances)
    logger.info(f"✓ Context string: {len(context_str)} characters")
    
    # Step 3: Extract with LLM
    meeting_date = meeting_time.split('T')[0] if meeting_time else datetime.utcnow().date().isoformat()
    extractor = LLMExtractor(meeting_date=meeting_date)
    
    if use_self_consistency:
        logger.info("Step 3: Extracting with self-consistency (3 samples)...")
        extraction_result = extractor.extract_with_self_consistency(context_str, n_samples=3)
    else:
        logger.info("Step 3: Extracting (single run)...")
        extraction_result = extractor.extract_single_run(context_str, temperature=0.5)
    
    logger.info(f"✓ Extracted {len(extraction_result.items)} action items")
    
    if not extraction_result.items:
        logger.warning("No action items extracted")
        return []
    
    # Step 4: Resolve coreferences
    logger.info("Step 4: Resolving coreferences (I/you → names)...")
    coref_resolver = CoreferenceResolver(utterances)
    
    for item in extraction_result.items:
        # Get utterance ID to find speaker context
        utterance_id = item.evidence.utterance_ids[0] if item.evidence.utterance_ids else 1
        
        # Resolve assignee
        original_assignee = item.assigned_to
        item.assigned_to = coref_resolver.resolve_assignee(utterance_id, item.assigned_to)
        
        if original_assignee != item.assigned_to:
            logger.info(f"  Resolved '{original_assignee}' → '{item.assigned_to}'")
    
    # Step 5: Normalize deadlines
    logger.info("Step 5: Normalizing deadlines...")
    for item in extraction_result.items:
        deadline_text, deadline_iso = normalize_deadline(item.deadline, meeting_date)
        item.deadline = deadline_text
        # Store ISO in temp field (we'll use it for priority)
        item._deadline_iso = deadline_iso
    
    # Step 6: Rescore priorities with guardrails
    logger.info("Step 6: Rescoring priorities with guardrails...")
    for item in extraction_result.items:
        original_priority = item.priority
        
        # Rescore based on keywords and deadline
        item.priority = rescore_priority(
            item.deadline,
            getattr(item, '_deadline_iso', None),
            meeting_date,
            item.priority
        )
        
        # Apply confidence guardrails
        item.priority = apply_priority_guardrails(item.priority, item.confidence)
        
        if original_priority != item.priority:
            logger.info(f"  '{item.task[:40]}...' priority: {original_priority} → {item.priority}")
    
    # Step 7: Convert to ActionItem schema
    logger.info("Step 7: Converting to ActionItem schema...")
    action_items = []
    ref_dt = datetime.fromisoformat(meeting_time) if meeting_time else datetime.utcnow()
    
    for idx, item in enumerate(extraction_result.items):
        try:
            # Map priority string to enum
            priority_map = {
                "critical": PriorityEnum.critical,
                "high": PriorityEnum.high,
                "medium": PriorityEnum.medium,
                "normal": PriorityEnum.normal,
                "low": PriorityEnum.low
            }
            priority_enum = priority_map.get(item.priority, PriorityEnum.normal)
            
            # Create ActionItem
            action_item = ActionItem(
                id=f"prod-{int(ref_dt.timestamp())}-{idx}",
                title=item.task,
                owner=Participant(name=item.assigned_to) if item.assigned_to else None,
                due=getattr(item, '_deadline_iso', None),
                priority=priority_enum,
                status="open"  # Always start as open, status managed separately
            )
            
            action_items.append(action_item)
            
            logger.info(f"✓ Item {idx+1}: '{action_item.title}'")
            logger.info(f"    Assignee: {action_item.owner.name if action_item.owner else 'None'}")
            logger.info(f"    Deadline: {action_item.due}")
            logger.info(f"    Priority: {action_item.priority.value}")
            logger.info(f"    Confidence: {item.confidence:.2f}")
            logger.info(f"    Evidence: {item.evidence.quotes[0][:80] if item.evidence.quotes else 'N/A'}...")
            
        except Exception as e:
            logger.error(f"Error converting item {idx}: {e}")
            continue
    
    logger.info("="*60)
    logger.info(f"✓ COMPLETE: Extracted {len(action_items)} validated action items")
    logger.info("="*60)
    
    return action_items
