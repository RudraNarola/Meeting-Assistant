# Simple Deadline-Based Priority System

## Overview
The priority assignment system now uses a **simple deadline-based approach**. Tasks are assigned priorities based purely on how soon they are due, making it easy to understand and predict.

## Priority Rules

| Priority | Deadline Range | Description |
|----------|---------------|-------------|
| **HIGH** | 0-2 days | Due today, tomorrow, or day after tomorrow |
| **NORMAL** | 3-7 days | Due within a week |
| **LOW** | 8+ days or no deadline | Due later than a week or no deadline set |

## Examples

Given a meeting on **October 28, 2025**:

### HIGH Priority Tasks (0-2 days)
- ✅ Task due **today** (Oct 28) → HIGH
- ✅ Task due **tomorrow** (Oct 29) → HIGH  
- ✅ Task due **day after** (Oct 30) → HIGH

### NORMAL Priority Tasks (3-7 days)
- ✅ Task due in **3 days** (Oct 31) → NORMAL
- ✅ Task due in **5 days** (Nov 2) → NORMAL
- ✅ Task due in **7 days** (Nov 4) → NORMAL

### LOW Priority Tasks (8+ days or no deadline)
- ✅ Task due in **10 days** (Nov 7) → LOW
- ✅ Task due in **2 weeks** (Nov 11) → LOW
- ✅ Task with **no deadline** → LOW

## Implementation

The system calculates the number of days between the meeting time and the due date:

```python
days_until_due = (due_date - meeting_date).days

if days_until_due <= 2:
    priority = "HIGH"
elif days_until_due <= 7:
    priority = "NORMAL"
else:
    priority = "LOW"
```

## Benefits

1. **Simple & Predictable**: Easy to understand how priorities are assigned
2. **Consistent**: Same deadline = same priority every time
3. **Automatic**: No manual configuration needed
4. **Fast**: No complex keyword analysis or scoring calculations

## Testing

Run the test suite to verify the system:
```bash
python test_simple_priority.py
```

All 8 test cases should pass, demonstrating:
- Tasks due today/tomorrow get HIGH priority
- Tasks due in 3-7 days get NORMAL priority  
- Tasks due later or without deadlines get LOW priority

## API Response Example

When you extract action items from the test data in `postman_test.json`, you'll see priorities assigned like this:

```json
{
  "action_items": [
    {
      "task": "Finalize quarterly presentation slides",
      "assigned_to": "Krishna Mevada",
      "due_date": "2025-10-31",
      "priority": "normal"  // 3 days away
    },
    {
      "task": "Schedule sync-up call with team leads",
      "assigned_to": "Jaivik Kalathiya",
      "due_date": "2025-10-29",
      "priority": "high"  // Tomorrow - 1 day away
    }
  ]
}
```

## Customization

To adjust the priority thresholds, edit `app/pipeline/priority_scorer.py`:

```python
# Change these values to adjust priority ranges
if days_until_due <= 2:      # Default: 2 days for HIGH
    return PriorityEnum.high
elif days_until_due <= 7:    # Default: 7 days for NORMAL
    return PriorityEnum.normal
```

For example, to make HIGH priority more aggressive (0-3 days):
```python
if days_until_due <= 3:  # Changed from 2 to 3
    return PriorityEnum.high
```
