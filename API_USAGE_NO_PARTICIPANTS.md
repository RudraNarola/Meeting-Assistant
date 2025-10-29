# API Usage Guide - No Participant List Required

## ✅ Solution: Auto-Detection of Names

Your API **NOW supports automatic name detection** from transcription text. Your friend **does NOT need to provide** a participant list!

## 📋 Input Format

Your friend only needs to send **3 required fields**:

```json
{
  "meeting_id": "M-12345",
  "summary": "Krishna Mevada should finalize the presentation by Friday. Vedant to deploy by next Tuesday.",
  "timestamp_utc": "2025-10-28T10:00:00Z"
}
```

### Required Fields:

1. **meeting_id** - Unique identifier for the meeting
2. **summary** - The meeting transcription (can be raw text)
3. **timestamp_utc** - Meeting date/time in ISO 8601 format

### Optional Fields:

- **org_id** - Organization identifier (optional)
- **participants** - Can be omitted! System auto-detects names from transcription

## 🎯 How Auto-Detection Works

The system uses **NER (Named Entity Recognition)** and **pattern matching**:

### Detection Strategies:

1. **Pattern Matching** (Primary):

   - Detects: "Name should...", "Name must...", "Name will...", "Name to..."
   - Example: "John should finish the report" → Owner: John

2. **NER (Named Entity Recognition)** (Secondary):

   - Uses ML model to find PERSON entities
   - Example: "Sarah mentioned the deadline" → Detects: Sarah

3. **Automatic Name Extraction**:
   - Extracts first and last names
   - Creates Participant object automatically
   - No email required

## 📊 5-Level Priority System

Tasks are **automatically assigned priorities** based on deadline:

| Priority     | Days Until Due | Description              |
| ------------ | -------------- | ------------------------ |
| **CRITICAL** | < 0 (overdue)  | Past deadline            |
| **HIGH**     | 0-1 days       | Due today or tomorrow    |
| **MEDIUM**   | 2-3 days       | Due within 2-3 days      |
| **NORMAL**   | 4-7 days       | Due within a week        |
| **LOW**      | > 7 days       | Due later or no deadline |

## 🔍 Example Request & Response

### Request (POST to `http://localhost:8000/extract`):

```json
{
  "meeting_id": "M-404",
  "summary": "Krishna Mevada should finalize the quarterly presentation slides and share them with the board before Friday noon. Vedant Kavar to prepare the demo environment and test the backup recovery scripts by next Tuesday. Ronit Patel must update the documentation portal and add API usage examples by EOW. Harsh will coordinate with DevOps for deployment approval by October 31. Jaivik to schedule a quick sync-up call with all team leads tomorrow morning.",
  "timestamp_utc": "2025-10-28T10:00:00Z"
}
```

### Response:

```json
{
  "meeting_id": "M-404",
  "items": [
    {
      "id": "uuid-1",
      "title": "Finalize quarterly presentation slides and share with board",
      "owner": {
        "name": "Krishna Mevada",
        "email": null
      },
      "due": "2025-10-31",
      "priority": "medium",
      "confidence": 0.85,
      "source": "huggingface",
      "status": "open",
      "tags": []
    },
    {
      "id": "uuid-2",
      "title": "Prepare demo environment and test backup recovery scripts",
      "owner": {
        "name": "Vedant Kavar",
        "email": null
      },
      "due": "2025-11-04",
      "priority": "normal",
      "confidence": 0.82,
      "source": "huggingface",
      "status": "open",
      "tags": []
    },
    {
      "id": "uuid-5",
      "title": "Schedule quick sync-up call with all team leads",
      "owner": {
        "name": "Jaivik",
        "email": null
      },
      "due": "2025-10-29",
      "priority": "high",
      "confidence": 0.9,
      "source": "huggingface",
      "status": "open",
      "tags": []
    }
  ]
}
```

## 🚀 API Endpoints

### 1. Extract Action Items

```
POST http://localhost:8000/extract
Content-Type: application/json

Body: { meeting_id, summary, timestamp_utc }
```

### 2. Health Check

```
GET http://localhost:8000/healthz
```

### 3. Get Tasks by Meeting ID

```
GET http://localhost:8000/tasks/{meeting_id}
```

## 💡 Tips for Best Results

### 1. **Clear Assignment Patterns**

✅ Good: "John should complete the report by Friday"
✅ Good: "Sarah to review the code tomorrow"
✅ Good: "Mike must deploy by next Tuesday"

❌ Avoid: "The report needs to be done" (no owner)

### 2. **Explicit Deadlines**

✅ Good: "by Friday", "tomorrow", "next Tuesday", "October 31"
✅ Good: "by EOW" (end of week), "by EOM" (end of month)

❌ Avoid: "soon", "later", "eventually"

### 3. **Structured Transcription**

✅ Good: One action per sentence
✅ Good: "Name + action + deadline" format

## 📝 Testing with Postman

1. **Start the server**:

   ```bash
   uvicorn app.main:app --reload
   ```

2. **Create POST request**:

   - URL: `http://localhost:8000/extract`
   - Method: `POST`
   - Headers: `Content-Type: application/json`
   - Body: Use the JSON from `test_no_participants.json`

3. **Send request** and verify:
   - ✓ All 5 tasks extracted
   - ✓ Owners auto-detected (Krishna, Vedant, Ronit, Harsh, Jaivik)
   - ✓ Deadlines parsed correctly
   - ✓ Priorities assigned (1 HIGH, 3 MEDIUM, 1 NORMAL)

## ⚠️ Important Notes

1. **Names must be mentioned in transcription** - System cannot detect unnamed tasks
2. **Email field will be null** - No participant list = no email data
3. **Confidence scores** - Indicate how certain the system is about the extraction
4. **ISO timestamp required** - Use format: `2025-10-28T10:00:00Z`

## 🎯 Summary for Your Friend

Tell your friend:

> "Just send me 3 things:
>
> 1. A unique **meeting_id**
> 2. The meeting **transcription** (as raw text)
> 3. The meeting **date/time** (ISO format)
>
> The system will automatically:
> ✓ Detect who is assigned to each task
> ✓ Extract all deadlines
> ✓ Assign priority levels (critical/high/medium/normal/low)
> ✓ Return structured JSON with all action items"

No participant list needed! 🎉
