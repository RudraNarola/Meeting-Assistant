"""
Test 5-level deadline-based priority assignment.
Priority levels: CRITICAL, HIGH, MEDIUM, NORMAL, LOW
"""
from datetime import datetime, timedelta
from app.pipeline.priority_scorer import PriorityScorer

# Reference date: October 28, 2025 (from postman_test.json)
meeting_time = datetime(2025, 10, 28, 10, 0, 0)

print("=" * 80)
print("5-LEVEL DEADLINE-BASED PRIORITY SYSTEM TEST")
print("=" * 80)
print(f"Meeting Time: {meeting_time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Reference Date: {meeting_time.date()}")
print("\nPriority Rules:")
print("  CRITICAL : Overdue (past deadline)")
print("  HIGH     : Due today or tomorrow (0-1 days)")
print("  MEDIUM   : Due within 2-3 days")
print("  NORMAL   : Due within 4-7 days")
print("  LOW      : Due after 7 days or no deadline")
print("=" * 80)

test_cases = [
    {
        "task": "Fix critical production bug",
        "due_date": datetime(2025, 10, 27, 17, 0, 0).date(),  # Yesterday - OVERDUE
        "expected": "CRITICAL"
    },
    {
        "task": "Deploy security patch",
        "due_date": datetime(2025, 10, 28, 17, 0, 0).date(),  # Today (0 days)
        "expected": "HIGH"
    },
    {
        "task": "Schedule sync-up call with team leads",
        "due_date": datetime(2025, 10, 29, 9, 0, 0).date(),  # Tomorrow (1 day)
        "expected": "HIGH"
    },
    {
        "task": "Review code changes",
        "due_date": datetime(2025, 10, 30, 0, 0, 0).date(),  # 2 days away
        "expected": "MEDIUM"
    },
    {
        "task": "Finalize quarterly presentation slides",
        "due_date": datetime(2025, 10, 31, 12, 0, 0).date(),  # Friday (3 days)
        "expected": "MEDIUM"
    },
    {
        "task": "Update API documentation",
        "due_date": datetime(2025, 11, 1, 0, 0, 0).date(),  # 4 days away
        "expected": "NORMAL"
    },
    {
        "task": "Coordinate with DevOps",
        "due_date": datetime(2025, 11, 2, 0, 0, 0).date(),  # 5 days away
        "expected": "NORMAL"
    },
    {
        "task": "Prepare demo environment",
        "due_date": datetime(2025, 11, 4, 0, 0, 0).date(),  # Next Tuesday (7 days)
        "expected": "NORMAL"
    },
    {
        "task": "Long-term planning document",
        "due_date": datetime(2025, 11, 15, 0, 0, 0).date(),  # 18 days away
        "expected": "LOW"
    },
    {
        "task": "Research new frameworks",
        "due_date": None,  # No deadline
        "expected": "LOW"
    },
]

passed = 0
failed = 0

for i, test in enumerate(test_cases, 1):
    print(f"\nTest {i}: {test['task']}")
    
    if test['due_date']:
        days_diff = (test['due_date'] - meeting_time.date()).days
        if days_diff < 0:
            print(f"  Due Date: {test['due_date']} (OVERDUE by {abs(days_diff)} days)")
        else:
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

print("\n" + "=" * 80)
print(f"RESULTS: {passed}/{len(test_cases)} tests passed")
if failed == 0:
    print("SUCCESS! All tests passed!")
else:
    print(f"FAILED: {failed} test(s) failed")
print("=" * 80)

# Summary table
print("\n" + "=" * 80)
print("PRIORITY LEVEL SUMMARY")
print("=" * 80)
print(f"{'Priority':<12} {'Days Until Due':<20} {'Example'}")
print("-" * 80)
print(f"{'CRITICAL':<12} {'< 0 (Overdue)':<20} {'Past deadline'}")
print(f"{'HIGH':<12} {'0-1 days':<20} {'Today or tomorrow'}")
print(f"{'MEDIUM':<12} {'2-3 days':<20} {'Day after tomorrow'}")
print(f"{'NORMAL':<12} {'4-7 days':<20} {'Within a week'}")
print(f"{'LOW':<12} {'> 7 days or None':<20} {'Later or no deadline'}")
print("=" * 80)
