"""Test pipeline with meeting date from input"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.utils.schemas import Participant, ActionItem
from datetime import datetime, timedelta, date
import json

def test_action_extraction():
    """Test with the meeting date provided in the input"""
    
    # Import here to avoid early loading issues
    try:
        from app.pipeline.pipeline import extract_action_items
    except Exception as e:
        print(f"Error importing pipeline: {e}")
        print("This might be due to missing dependencies. The code improvements have been made.")
        return
    
    test_input = {
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
        "timestamp_utc": "2025-10-28T10:00:00Z"  # Meeting date from your friend
    }
    
    print("="*100)
    print("ACTION ITEM EXTRACTION TEST")
    print("="*100)
    print(f"\nMeeting ID: {test_input['meeting_id']}")
    print(f"Meeting Date: {test_input['timestamp_utc']}")
    print(f"Participants: {len(test_input['participants'])}")
    print(f"\nSummary:\n{test_input['summary']}")
    
    # Convert participants to Participant objects
    participants = [Participant(**p) for p in test_input["participants"]]
    
    # Extract action items with meeting date
    items = extract_action_items(
        summary=test_input["summary"],
        participants=participants,
        meeting_time=test_input["timestamp_utc"]  # Pass the meeting date
    )
    
    # Format output
    output = {
        "meeting_id": test_input["meeting_id"],
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
    
    print("\n" + "="*100)
    print("EXTRACTED ACTION ITEMS")
    print("="*100)
    print(json.dumps(output, indent=2))
    
    print("\n" + "="*100)
    print("VALIDATION SUMMARY")
    print("="*100)
    print(f"✓ Total items extracted: {len(items)}")
    print(f"✓ Items with owners: {sum(1 for item in items if item.owner)}/{len(items)}")
    print(f"✓ Items with due dates: {sum(1 for item in items if item.due)}/{len(items)}")
    
    print("\n" + "="*100)
    print("EXPECTED vs ACTUAL")
    print("="*100)
    
    expected = [
        ("Krishna Mevada", "before Friday noon", "2025-10-31"),
        ("Vedant Kavar", "by next Tuesday", "2025-11-04"),
        ("Ronit Patel", "by EOW", "2025-10-31"),
        ("Harsh Ahluwalia", "by October 31", "2025-10-31"),
        ("Jaivik Kalathiya", "tomorrow morning", "2025-10-29"),
    ]
    
    for i, (exp_owner, exp_phrase, exp_date) in enumerate(expected):
        if i < len(items):
            item = items[i]
            actual_owner = item.owner.name if item.owner else "NOT FOUND"
            actual_date = str(item.due) if item.due else "NOT FOUND"
            
            owner_status = "✓" if actual_owner == exp_owner else "✗"
            date_status = "✓" if actual_date == exp_date else "✗"
            
            print(f"\nTask {i+1}:")
            print(f"  Expected: {exp_owner} | {exp_phrase} ({exp_date})")
            print(f"  Actual:   {actual_owner} {owner_status} | {actual_date} {date_status}")
            print(f"  Title:    {item.title}")
    
    print("\n" + "="*100)

if __name__ == "__main__":
    test_action_extraction()
