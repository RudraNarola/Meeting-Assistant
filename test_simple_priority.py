"""
Test simple deadline-based priority assignment.
"""
from datetime import datetime, timedelta
from app.pipeline.priority_scorer import PriorityScorer

# Reference date: October 28, 2025 (from postman_test.json)
meeting_time = datetime(2025, 10, 28, 10, 0, 0)

print("=" * 70)
print("SIMPLE DEADLINE-BASED PRIORITY SYSTEM TEST")
print("=" * 70)
print(f"Meeting Time: {meeting_time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Reference Date: {meeting_time.date()}")
print("\nPriority Rules:")
print("  HIGH   : Due within 0-2 days (today, tomorrow, day after)")
print("  NORMAL : Due within 3-7 days")
print("  LOW    : Due after 7 days or no deadline")
print("=" * 70)

test_cases = [
    {
        "task": "Finalize quarterly presentation slides",
        "due_date": datetime(2025, 10, 31, 12, 0, 0).date(),  # Friday - 3 days away
        "expected": "NORMAL"
    },
    {
        "task": "Prepare demo environment",
        "due_date": datetime(2025, 11, 4, 0, 0, 0).date(),  # Next Tuesday - 7 days away
        "expected": "NORMAL"
    },
    {
        "task": "Update documentation portal",
        "due_date": datetime(2025, 10, 31, 23, 59, 0).date(),  # End of week - 3 days away
        "expected": "NORMAL"
    },
    {
        "task": "Coordinate with DevOps for deployment",
        "due_date": datetime(2025, 10, 31, 0, 0, 0).date(),  # October 31 - 3 days away
        "expected": "NORMAL"
    },
    {
        "task": "Schedule sync-up call with team leads",
        "due_date": datetime(2025, 10, 29, 9, 0, 0).date(),  # Tomorrow morning - 1 day away
        "expected": "HIGH"
    },
    {
        "task": "Review security patches",
        "due_date": datetime(2025, 10, 28, 17, 0, 0).date(),  # Today - 0 days away
        "expected": "HIGH"
    },
    {
        "task": "Long-term planning document",
        "due_date": datetime(2025, 11, 15, 0, 0, 0).date(),  # 18 days away
        "expected": "LOW"
    },
    {
        "task": "Task without deadline",
        "due_date": None,
        "expected": "LOW"
    },
]

passed = 0
failed = 0

for i, test in enumerate(test_cases, 1):
    print(f"\nTest {i}: {test['task']}")
    
    if test['due_date']:
        days_diff = (test['due_date'] - meeting_time.date()).days
        print(f"  Due Date: {test['due_date']} ({days_diff} days from meeting)")
    else:
        print(f"  Due Date: None")
    
    priority = PriorityScorer.calculate_priority(
        title=test['task'],
        due_date=test['due_date'],
        meeting_time=meeting_time
    )
    
    result = priority.value.upper()
    expected = test['expected']
    
    status = "PASS" if result == expected else "FAIL"
    symbol = "✓" if result == expected else "✗"
    
    print(f"  Expected: {expected}")
    print(f"  Got:      {result}")
    print(f"  Status:   {symbol} {status}")
    
    if result == expected:
        passed += 1
    else:
        failed += 1

print("\n" + "=" * 70)
print(f"RESULTS: {passed}/{len(test_cases)} tests passed")
if failed == 0:
    print("SUCCESS! All tests passed!")
else:
    print(f"FAILED: {failed} test(s) failed")
print("=" * 70)
