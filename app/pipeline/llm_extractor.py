# app/pipeline/llm_extractor.py
"""
LLM-based extraction with function calling, self-consistency, and evidence validation.
"""
import os
import json
import logging
import requests
from typing import List, Optional
from datetime import datetime, date
import dateparser
from dotenv import load_dotenv
from collections import Counter, defaultdict

from app.pipeline.utterance_parser import Utterance, create_context_string
from app.pipeline.coreference_resolver import CoreferenceResolver
from app.pipeline.extraction_schema import ExtractedActionItem, ExtractionResult, FUNCTION_SCHEMA

load_dotenv()
logger = logging.getLogger("llm_extractor")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


class LLMExtractor:
    """Extract action items using LLM with self-consistency and validation."""
    
    def __init__(self, meeting_date: str):
        self.meeting_date = meeting_date
        self.system_prompt = self._build_system_prompt()
    
    def _build_system_prompt(self) -> str:
        """Build system prompt with rules and few-shot examples."""
        return f"""You are an expert meeting-minutes extractor. Extract action items from transcripts.

MEETING DATE: {self.meeting_date}

RULES:
1. Extract ONLY concrete action items (things to be done)
2. Identify assignee:
   - "I will do X" → use "I" (we'll resolve to speaker)
   - "You should do X" → use "you" (we'll resolve to addressee)
   - "Name will do X" → use the explicit name
3. Extract deadlines EXACTLY as mentioned (we'll parse later)
4. Priority based on urgency keywords:
   - HIGH: critical, urgent, accelerated, ASAP, EOD, blocker, immediately
   - MEDIUM: tomorrow, this week, by Friday, specific dates
   - LOW: eventually, nice-to-have, when possible, no deadline
5. Include verbatim evidence: exact quotes and utterance IDs
6. Confidence: 0.9+ for explicit tasks, 0.7+ for implied, <0.7 if unsure

FEW-SHOT EXAMPLES:

Example 1 (You → addressee):
TRANSCRIPT:
[1][00:00:00] Alex: I need you to finalize the Q3 report by Friday.

OUTPUT:
{{"items":[{{"task":"Finalize the Q3 report","assigned_to":"you","deadline":"by Friday","priority":"high","confidence":0.9,"evidence":{{"utterance_ids":[1],"quotes":["I need you to finalize the Q3 report by Friday."]}}}}]}}

Example 2 (Self-commit):
[1][00:00:00] Priya: I'll set up the dashboard and share the link today.

OUTPUT:
{{"items":[{{"task":"Set up the dashboard and share the link","assigned_to":"I","deadline":"today","priority":"medium","confidence":0.85,"evidence":{{"utterance_ids":[1],"quotes":["I'll set up the dashboard and share the link today."]}}}}]}}

Example 3 (Explicit name):
[1][00:00:00] Maria: Dev will deploy the app by end of day tomorrow.

OUTPUT:
{{"items":[{{"task":"Deploy the app","assigned_to":"Dev","deadline":"end of day tomorrow","priority":"high","confidence":0.95,"evidence":{{"utterance_ids":[1],"quotes":["Dev will deploy the app by end of day tomorrow."]}}}}]}}

Now extract ALL action items from the transcript below. Return ONLY valid JSON."""

    def extract_single_run(self, context_str: str, temperature: float = 0.7) -> ExtractionResult:
        """Single extraction run with given temperature."""
        if not GROQ_API_KEY:
            logger.error("GROQ_API_KEY not set")
            return ExtractionResult(items=[])
        
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}"
            }
            
            payload = {
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": f"TRANSCRIPT:\n{context_str}\n\nExtract action items:"}
                ],
                "tools": [FUNCTION_SCHEMA],
                "tool_choice": {"type": "function", "function": {"name": "extract_action_items"}},
                "temperature": temperature,
                "max_tokens": 4096
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            
            # Extract function call
            if "choices" in result and len(result["choices"]) > 0:
                message = result["choices"][0]["message"]
                
                if "tool_calls" in message and message["tool_calls"]:
                    tool_call = message["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    
                    # Log the raw extraction
                    logger.info(f"Raw LLM extraction: {json.dumps(args, indent=2)}")
                    
                    # Parse into Pydantic model
                    extraction = ExtractionResult(**args)
                    logger.info(f"Extracted {len(extraction.items)} items (temp={temperature})")
                    return extraction
            
            logger.warning(f"No function call in response (temp={temperature})")
            return ExtractionResult(items=[])
            
        except Exception as e:
            logger.error(f"Extraction failed (temp={temperature}): {e}")
            return ExtractionResult(items=[])
    
    def extract_with_self_consistency(self, context_str: str, n_samples: int = 3) -> ExtractionResult:
        """
        Run extraction N times and aggregate with majority voting.
        
        Self-consistency: reduces hallucinations, improves accuracy.
        """
        logger.info(f"Running {n_samples} extraction samples for self-consistency...")
        
        all_runs: List[ExtractionResult] = []
        temperatures = [0.5, 0.7, 0.9]  # Vary temperature
        
        for i in range(n_samples):
            temp = temperatures[i % len(temperatures)]
            result = self.extract_single_run(context_str, temperature=temp)
            all_runs.append(result)
        
        # Aggregate results
        aggregated = self._aggregate_results(all_runs)
        logger.info(f"After aggregation: {len(aggregated.items)} unique items")
        
        return aggregated
    
    def _aggregate_results(self, runs: List[ExtractionResult]) -> ExtractionResult:
        """
        Majority voting across runs.
        
        Steps:
        1. Cluster similar tasks (fuzzy match on normalized text)
        2. For each cluster, vote on: assignee, deadline, priority
        3. Union evidence, average confidence
        """
        if not runs:
            return ExtractionResult(items=[])
        
        # Flatten all items
        all_items: List[ExtractedActionItem] = []
        for run in runs:
            all_items.extend(run.items)
        
        if not all_items:
            return ExtractionResult(items=[])
        
        # Cluster by task similarity
        clusters = self._cluster_tasks(all_items)
        
        # Vote per cluster
        final_items: List[ExtractedActionItem] = []
        for cluster in clusters:
            voted_item = self._vote_cluster(cluster)
            if voted_item:
                final_items.append(voted_item)
        
        return ExtractionResult(items=final_items)
    
    def _cluster_tasks(self, items: List[ExtractedActionItem]) -> List[List[ExtractedActionItem]]:
        """Cluster similar tasks using normalized text matching."""
        clusters: List[List[ExtractedActionItem]] = []
        
        for item in items:
            normalized = self._normalize_task(item.task)
            
            # Find matching cluster
            matched = False
            for cluster in clusters:
                cluster_norm = self._normalize_task(cluster[0].task)
                if self._tasks_similar(normalized, cluster_norm):
                    cluster.append(item)
                    matched = True
                    break
            
            if not matched:
                clusters.append([item])
        
        logger.info(f"Clustered {len(items)} items into {len(clusters)} unique tasks")
        return clusters
    
    def _normalize_task(self, task: str) -> str:
        """Normalize task text for comparison."""
        import re
        # Lowercase, remove punctuation, strip whitespace
        normalized = task.lower()
        normalized = re.sub(r'[^\w\s]', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized
    
    def _tasks_similar(self, task1: str, task2: str, threshold: float = 0.7) -> bool:
        """Check if two tasks are similar (simple word overlap)."""
        words1 = set(task1.split())
        words2 = set(task2.split())
        
        if not words1 or not words2:
            return False
        
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        jaccard = intersection / union if union > 0 else 0
        return jaccard >= threshold
    
    def _vote_cluster(self, cluster: List[ExtractedActionItem]) -> Optional[ExtractedActionItem]:
        """Majority vote on fields within a cluster."""
        if not cluster:
            return None
        
        # Vote on each field
        assignees = [item.assigned_to for item in cluster]
        deadlines = [item.deadline for item in cluster if item.deadline]
        priorities = [item.priority for item in cluster if item.priority]
        
        voted_assignee = Counter(assignees).most_common(1)[0][0] if assignees else ""
        voted_deadline = Counter(deadlines).most_common(1)[0][0] if deadlines else None
        voted_priority = Counter(priorities).most_common(1)[0][0] if priorities else "medium"
        
        # Average confidence
        avg_confidence = sum(item.confidence for item in cluster) / len(cluster)
        
        # Union evidence (deduplicate)
        all_utterance_ids = set()
        all_quotes = set()
        for item in cluster:
            all_utterance_ids.update(item.evidence.utterance_ids)
            all_quotes.update(item.evidence.quotes)
        
        # Take the most detailed task description
        voted_task = max(cluster, key=lambda x: len(x.task)).task
        
        from app.pipeline.extraction_schema import Evidence
        return ExtractedActionItem(
            task=voted_task,
            assigned_to=voted_assignee,
            deadline=voted_deadline,
            priority=voted_priority,
            confidence=avg_confidence,
            evidence=Evidence(
                utterance_ids=sorted(list(all_utterance_ids))[:5],  # Max 5
                quotes=list(all_quotes)[:3]  # Max 3 quotes
            )
        )
