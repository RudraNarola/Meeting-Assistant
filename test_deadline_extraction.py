"""Test script to verify deadline and owner extraction improvements"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.pipeline.pipeline import extract_action_items
from app.utils.schemas import Participant
import json
from datetime import datetime

# Test case from user
test_data = {
    "meeting_id": "M-404",
    "org_id": "demo",
    "summary": "Krishna Mevada should finalize the quarterly presentation slides and share them with the board before Friday noon. Vedant Kavar to prepare the demo environment and test the backup recovery scripts by next Tuesday. Ronit Patel must update the documentation portal and add API usage examples by EOW. Harsh will coordinate with DevOps for deployment approval by October 31. Jaivik to schedule a quick sync-up call with all team leads tomorrow morning.",
    "participants": [
        {"name": "Krishna Mevada", "email": "krishna@example.com"},
        {"name": "Vedant Kavar", "email": "vedant@example.com"},
        {"name": "Ronit Patel", "email": "ronit@example.com"},
        {"name": "Harsh Ahluwalia", "email": "harsh@example.com"},
        {"name": "Jaivik Kalathiya", "email": "jaivik@example.com"}
    ],
    "timestamp_utc": "2025-10-28T10:00:00Z"
}

# Convert participants to Participant objects
participants = [Participant(**p) for p in test_data["participants"]]

print("=" * 80)
print("TESTING ACTION ITEM EXTRACTION")
print("=" * 80)
print(f"\nMeeting ID: {test_data['meeting_id']}")
print(f"Meeting Time: {test_data['timestamp_utc']}")
print(f"\nSummary:\n{test_data['summary']}")
print("\n" + "=" * 80)

# Extract action items
items = extract_action_items(
    summary=test_data["summary"],
    participants=participants,
    meeting_time=test_data["timestamp_utc"]
)

# Format output
output = {
    "meeting_id": test_data["meeting_id"],
    "items": [
        {
            "id": item.id,
            "title": item.title,
            "owner": {
                "name": item.owner.name,
                "email": item.owner.email
            } if item.owner else None,
            "due": str(item.due) if item.due else None,
            "priority": item.priority,
            "source": item.source,
            "confidence": item.confidence,
            "status": item.status,
            "tags": item.tags
        }
        for item in items
    ]
}

print("\n" + "=" * 80)
print("EXTRACTION RESULTS")
print("=" * 80)
print(json.dumps(output, indent=2))

# Validation summary
print("\n" + "=" * 80)
print("VALIDATION SUMMARY")
print("=" * 80)
print(f"Total items extracted: {len(items)}")
print(f"Items with owners: {sum(1 for item in items if item.owner)}")
print(f"Items with due dates: {sum(1 for item in items if item.due)}")

print("\nExpected Due Dates (from summary):")
print("  1. Krishna Mevada -> before Friday noon (Oct 31, 2025)")
print("  2. Vedant Kavar -> by next Tuesday (Nov 4, 2025)")
print("  3. Ronit Patel -> by EOW (Oct 31, 2025)")
print("  4. Harsh -> by October 31 (Oct 31, 2025)")
print("  5. Jaivik -> tomorrow morning (Oct 29, 2025)")

print("\nActual Extracted Due Dates:")
for i, item in enumerate(items, 1):
    owner_name = item.owner.name if item.owner else "Unknown"
    due_date = str(item.due) if item.due else "NOT FOUND"
    print(f"  {i}. {owner_name} -> {due_date}")

print("\n" + "=" * 80)
