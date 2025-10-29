"""
Simple test to verify the JSON input format works WITHOUT participant list.
This demonstrates what your friend should send.
"""
import json

# Test data - NO participants list provided!
test_input = {
    "meeting_id": "M-12345",
    "org_id": "demo-org",
    "summary": "Krishna Mevada should finalize the quarterly presentation slides and share them with the board before Friday noon. Vedant Kavar to prepare the demo environment and test the backup recovery scripts by next Tuesday. Ronit Patel must update the documentation portal and add API usage examples by EOW. Harsh will coordinate with DevOps for deployment approval by October 31. Jaivik to schedule a quick sync-up call with all team leads tomorrow morning.",
    "timestamp_utc": "2025-10-28T10:00:00Z"
}

print("=" * 80)
print("INPUT FORMAT FOR YOUR FRIEND (NO PARTICIPANTS NEEDED)")
print("=" * 80)
print("\nWhat your friend should send to POST /extract:\n")
print(json.dumps(test_input, indent=2))

print("\n" + "=" * 80)
print("EXPLANATION")
print("=" * 80)
print("""
Required fields:
  ✓ meeting_id      - Unique ID for the meeting
  ✓ timestamp_utc   - Meeting date/time in ISO format
  ✓ summary         - The transcription text

Optional fields:
  • org_id          - Organization ID (optional)
  • participants    - CAN BE OMITTED! System will auto-detect names

How it works:
1. System reads transcription from 'summary' field
2. Uses NER (Named Entity Recognition) to detect person names
3. Detects task assignment patterns: "Name should...", "Name to...", etc.
4. Extracts deadlines: "by Friday", "tomorrow", "October 31", etc.
5. Assigns priority based on deadline (critical/high/medium/normal/low)
6. Returns structured action items with owner, task, deadline, priority
""")

print("\n" + "=" * 80)
print("EXPECTED OUTPUT STRUCTURE")
print("=" * 80)
print("""
{
  "meeting_id": "M-12345",
  "items": [
    {
      "id": "...",
      "title": "Finalize quarterly presentation slides and share with board",
      "owner": {
        "name": "Krishna Mevada",
        "email": null
      },
      "due": "2025-10-31",
      "priority": "medium",
      "confidence": 0.85,
      "status": "open"
    },
    {
      "id": "...",
      "title": "Schedule quick sync-up call with all team leads",
      "owner": {
        "name": "Jaivik",
        "email": null
      },
      "due": "2025-10-29",
      "priority": "high",
      "confidence": 0.90,
      "status": "open"
    }
    ... (3 more tasks)
  ]
}
""")

print("=" * 80)
print("PRIORITY LEVELS ASSIGNED")
print("=" * 80)
print("""
Based on meeting date: 2025-10-28

Task 1 - Krishna  → Due Oct 31 (3 days)  → MEDIUM priority
Task 2 - Vedant   → Due Nov 04 (7 days)  → NORMAL priority  
Task 3 - Ronit    → Due Oct 31 (3 days)  → MEDIUM priority
Task 4 - Harsh    → Due Oct 31 (3 days)  → MEDIUM priority
Task 5 - Jaivik   → Due Oct 29 (1 day)   → HIGH priority ⭐

Priority Rules:
  CRITICAL - Overdue (past deadline)
  HIGH     - Due in 0-1 days
  MEDIUM   - Due in 2-3 days
  NORMAL   - Due in 4-7 days
  LOW      - Due after 7 days or no deadline
""")

print("=" * 80)
print("API ENDPOINT")
print("=" * 80)
print("""
URL:    POST http://localhost:8000/extract
Method: POST
Headers: Content-Type: application/json
Body:   (JSON shown above)

To test:
1. Start server: uvicorn app.main:app --reload
2. Send POST request with the JSON data
3. Get back extracted action items with priorities
""")

# Save the test input to a file
with open("test_no_participants.json", "w") as f:
    json.dump(test_input, f, indent=2)

print("\n✓ Test data saved to: test_no_participants.json")
print("  You can use this file to test the API with Postman or curl")
print("=" * 80)
