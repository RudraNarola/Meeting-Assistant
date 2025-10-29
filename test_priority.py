"""Test intelligent priority scoring system"""
from datetime import datetime, timedelta, date
from app.pipeline.priority_scorer import assign_priority, PriorityScorer
from app.utils.schemas import PriorityEnum

print("="*100)
print("INTELLIGENT PRIORITY SCORING TEST")
print("="*100)

# Reference time for testing
meeting_time = datetime(2025, 10, 28, 10, 0, 0)

test_cases = [
    {
        "title": "Finalize the quarterly presentation slides and share them with the board",
        "full_text": "Krishna Mevada should finalize the quarterly presentation slides and share them with the board before Friday noon.",
        "due": date(2025, 10, 31),  # 3 days away
        "expected": "high",  # Board involvement + soon deadline
        "reason": "Important stakeholder (board) + deadline in 3 days"
    },
    {
        "title": "Prepare the demo environment and test the backup recovery scripts",
        "full_text": "Vedant Kavar to prepare the demo environment and test the backup recovery scripts by next Tuesday.",
        "due": date(2025, 11, 4),  # 7 days away
        "expected": "normal",
        "reason": "Technical task + moderate deadline"
    },
    {
        "title": "Update the documentation portal and add API usage examples",
        "full_text": "Ronit Patel must update the documentation portal and add API usage examples by EOW.",
        "due": date(2025, 10, 31),  # 3 days away
        "expected": "normal",
        "reason": "Documentation task + 3 days deadline"
    },
    {
        "title": "Coordinate with DevOps for deployment approval",
        "full_text": "Harsh will coordinate with DevOps for deployment approval by October 31.",
        "due": date(2025, 10, 31),  # 3 days away
        "expected": "high",  # Deployment keyword + soon
        "reason": "Deployment task (high-priority keyword) + 3 days deadline"
    },
    {
        "title": "Schedule a quick sync-up call with all team leads",
        "full_text": "Jaivik to schedule a quick sync-up call with all team leads tomorrow morning.",
        "due": date(2025, 10, 29),  # Tomorrow
        "expected": "high",  # Very soon
        "reason": "Simple task but due tomorrow"
    },
    {
        "title": "Fix critical security vulnerability in production",
        "full_text": "Fix critical security vulnerability in production immediately.",
        "due": date(2025, 10, 28),  # Today
        "expected": "high",
        "reason": "Critical + security + production + immediately"
    },
    {
        "title": "Send weekly team update email",
        "full_text": "Send weekly team update email by end of month.",
        "due": date(2025, 10, 31),
        "expected": "low",
        "reason": "Simple task (send email) + routine"
    },
    {
        "title": "Design and implement new authentication system",
        "full_text": "Design and implement new authentication system for the client portal.",
        "due": date(2025, 11, 15),  # 18 days away
        "expected": "normal",
        "reason": "Complex task but distant deadline"
    },
]

print(f"\nMeeting Time: {meeting_time}")
print(f"Testing {len(test_cases)} scenarios...\n")

passed = 0
failed = 0

for i, test in enumerate(test_cases, 1):
    print(f"{'='*100}")
    print(f"Test Case {i}:")
    print(f"Title: {test['title']}")
    print(f"Due: {test['due']}")
    print(f"Full Text: {test['full_text'][:80]}...")
    
    # Calculate priority
    priority = assign_priority(
        title=test['title'],
        due_date=test['due'],
        meeting_time=meeting_time,
        full_text=test['full_text']
    )
    
    # Get detailed scoring breakdown
    scorer = PriorityScorer()
    time_score = scorer._calculate_time_urgency(test['due'], meeting_time)
    keyword_score = scorer._analyze_keywords(test['title'], test['full_text'])
    stakeholder_score = scorer._analyze_stakeholders(test['title'], test['full_text'])
    complexity_score = scorer._estimate_complexity(test['title'], test['full_text'])
    total_score = time_score + keyword_score + stakeholder_score + complexity_score
    
    print(f"\nScoring Breakdown:")
    print(f"  Time Urgency: {time_score}/40")
    print(f"  Keywords: {keyword_score}/30")
    print(f"  Stakeholders: {stakeholder_score}/20")
    print(f"  Complexity: {complexity_score}/10")
    print(f"  Total Score: {total_score}/100")
    
    print(f"\nExpected Priority: {test['expected']}")
    print(f"Calculated Priority: {priority}")
    print(f"Reason: {test['reason']}")
    
    if priority == test['expected']:
        print(f"[PASS]")
        passed += 1
    else:
        print(f"[FAIL] (Expected {test['expected']}, got {priority})")
        failed += 1

print(f"\n{'='*100}")
print(f"RESULTS: {passed}/{len(test_cases)} tests passed")
print("="*100)

print("\n📋 PRIORITY ASSIGNMENT LOGIC:")
print("  [HIGH] (65-100 points):")
print("     - Due today/tomorrow")
print("     - Contains urgent keywords (critical, security, production)")
print("     - Important stakeholders (board, executives, clients)")
print("     - Deployment/release related tasks")
print()
print("  [NORMAL] (30-64 points):")
print("     - Due within a week")
print("     - Standard business tasks")
print("     - Medium complexity")
print()
print("  [LOW] (0-29 points):")
print("     - Due in distant future")
print("     - Simple routine tasks (send email, schedule meeting)")
print("     - Low complexity")
print("="*100)
