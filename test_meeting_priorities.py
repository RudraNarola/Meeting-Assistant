"""
Test 5-level priority assignment for the actual meeting tasks.
Tests the tasks from Krishna, Vedant, Ronit, Harsh, and Jaivik.
"""
from datetime import datetime
from app.pipeline.priority_scorer import PriorityScorer

# Meeting time from postman_test.json
meeting_time = datetime(2025, 10, 28, 10, 0, 0)

print("=" * 80)
print("TESTING 5-LEVEL PRIORITY FOR MEETING TASKS")
print("=" * 80)
print(f"Meeting Time: {meeting_time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Reference Date: {meeting_time.date()}")
print("\nPriority Levels:")
print("  CRITICAL - Overdue (past deadline)")
print("  HIGH     - Due in 0-1 days (today/tomorrow)")
print("  MEDIUM   - Due in 2-3 days")
print("  NORMAL   - Due in 4-7 days")
print("  LOW      - Due after 7 days or no deadline")
print("=" * 80)

# Test cases based on actual meeting summary
test_cases = [
    {
        "name": "Krishna Mevada",
        "task": "Finalize quarterly presentation slides and share with board",
        "deadline_text": "before Friday noon",
        "due_date": datetime(2025, 10, 31, 12, 0, 0).date(),  # Oct 31 (3 days)
        "expected": "MEDIUM"
    },
    {
        "name": "Vedant Kavar",
        "task": "Prepare demo environment and test backup recovery scripts",
        "deadline_text": "by next Tuesday",
        "due_date": datetime(2025, 11, 4, 0, 0, 0).date(),  # Nov 4 (7 days)
        "expected": "NORMAL"
    },
    {
        "name": "Ronit Patel",
        "task": "Update documentation portal and add API usage examples",
        "deadline_text": "by EOW (End of Week)",
        "due_date": datetime(2025, 10, 31, 23, 59, 0).date(),  # Oct 31 (3 days)
        "expected": "MEDIUM"
    },
    {
        "name": "Harsh Ahluwalia",
        "task": "Coordinate with DevOps for deployment approval",
        "deadline_text": "by October 31",
        "due_date": datetime(2025, 10, 31, 0, 0, 0).date(),  # Oct 31 (3 days)
        "expected": "MEDIUM"
    },
    {
        "name": "Jaivik Kalathiya",
        "task": "Schedule quick sync-up call with all team leads",
        "deadline_text": "tomorrow morning",
        "due_date": datetime(2025, 10, 29, 9, 0, 0).date(),  # Oct 29 (1 day)
        "expected": "HIGH"
    }
]

passed = 0
failed = 0

for i, test in enumerate(test_cases, 1):
    print(f"\n{'='*80}")
    print(f"Test {i}: {test['name']}")
    print(f"{'='*80}")
    print(f"Task:         {test['task']}")
    print(f"Deadline:     {test['deadline_text']}")
    
    days_diff = (test['due_date'] - meeting_time.date()).days
    print(f"Due Date:     {test['due_date']} ({days_diff} days from meeting)")
    
    priority = PriorityScorer.calculate_priority(
        title=test['task'],
        due_date=test['due_date'],
        meeting_time=meeting_time
    )
    
    result = priority.value.upper()
    expected = test['expected']
    
    status = "PASS ✓" if result == expected else "FAIL ✗"
    
    print(f"Expected:     {expected}")
    print(f"Got:          {result}")
    print(f"Status:       {status}")
    
    if result == expected:
        passed += 1
    else:
        failed += 1

print("\n" + "=" * 80)
print("TEST RESULTS SUMMARY")
print("=" * 80)
print(f"Total Tests:  {len(test_cases)}")
print(f"Passed:       {passed} ✓")
print(f"Failed:       {failed} ✗")
print(f"Success Rate: {(passed/len(test_cases)*100):.1f}%")
print("=" * 80)

if failed == 0:
    print("\n🎉 SUCCESS! All priority assignments are correct!")
else:
    print(f"\n⚠️  {failed} test(s) failed - please review the priority rules")

# Show the priority breakdown
print("\n" + "=" * 80)
print("PRIORITY DISTRIBUTION FOR THIS MEETING")
print("=" * 80)

priority_counts = {}
for test in test_cases:
    priority = PriorityScorer.calculate_priority(
        title=test['task'],
        due_date=test['due_date'],
        meeting_time=meeting_time
    )
    level = priority.value.upper()
    priority_counts[level] = priority_counts.get(level, 0) + 1

for level in ['CRITICAL', 'HIGH', 'MEDIUM', 'NORMAL', 'LOW']:
    count = priority_counts.get(level, 0)
    bar = '█' * count
    print(f"{level:<10} ({count}): {bar}")

print("=" * 80)
