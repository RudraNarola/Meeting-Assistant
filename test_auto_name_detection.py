"""
Test extraction WITHOUT providing participant list.
The system should automatically detect names from the transcription.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.pipeline.pipeline import extract_action_items
from datetime import datetime
import json

# Test transcription WITHOUT participant list
transcription = """
Krishna Mevada should finalize the quarterly presentation slides and share them with the board before Friday noon. 
Vedant Kavar to prepare the demo environment and test the backup recovery scripts by next Tuesday. 
Ronit Patel must update the documentation portal and add API usage examples by EOW. 
Harsh will coordinate with DevOps for deployment approval by October 31. 
Jaivik to schedule a quick sync-up call with all team leads tomorrow morning.
"""

meeting_time = "2025-10-28T10:00:00"

print("=" * 80)
print("TESTING EXTRACTION WITHOUT PARTICIPANT LIST")
print("=" * 80)
print(f"Meeting Time: {meeting_time}")
print(f"Transcription: {transcription[:100]}...")
print("\nParticipant List: EMPTY (testing auto-detection)")
print("=" * 80)

# Extract action items WITHOUT providing participants
items = extract_action_items(
    summary=transcription,
    participants=[],  # Empty list - no participants provided!
    meeting_time=meeting_time
)

print(f"\n✓ Extracted {len(items)} action items\n")
print("=" * 80)

for i, item in enumerate(items, 1):
    print(f"\nTask {i}:")
    print(f"  Title:    {item.title}")
    print(f"  Owner:    {item.owner.name if item.owner else 'NOT DETECTED'}")
    print(f"  Email:    {item.owner.email if item.owner and item.owner.email else 'N/A'}")
    print(f"  Due:      {item.due if item.due else 'NOT DETECTED'}")
    print(f"  Priority: {item.priority.value.upper()}")
    print(f"  Confidence: {item.confidence:.2f}")

print("\n" + "=" * 80)
print("VERIFICATION CHECKLIST")
print("=" * 80)

expected_owners = ["Krishna Mevada", "Vedant Kavar", "Ronit Patel", "Harsh", "Jaivik"]
expected_priorities = ["medium", "normal", "medium", "medium", "high"]

detected_owners = [item.owner.name if item.owner else None for item in items]
detected_priorities = [item.priority.value for item in items]

print("\nOwner Detection:")
for i, (expected, detected) in enumerate(zip(expected_owners, detected_owners), 1):
    if detected and expected.lower() in detected.lower():
        print(f"  Task {i}: ✓ Expected '{expected}', Got '{detected}'")
    else:
        print(f"  Task {i}: ✗ Expected '{expected}', Got '{detected}'")

print("\nPriority Assignment:")
for i, (expected, detected) in enumerate(zip(expected_priorities, detected_priorities), 1):
    status = "✓" if expected == detected else "✗"
    print(f"  Task {i}: {status} Expected '{expected}', Got '{detected}'")

print("\n" + "=" * 80)
print("JSON OUTPUT")
print("=" * 80)

output = {
    "meeting_id": "M-12345",
    "items": [
        {
            "title": item.title,
            "owner": item.owner.name if item.owner else None,
            "due_date": str(item.due) if item.due else None,
            "priority": item.priority.value,
            "confidence": item.confidence
        }
        for item in items
    ]
}

print(json.dumps(output, indent=2))
