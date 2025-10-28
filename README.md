# Meeting-Assistant

1. AI Meeting Summarizer + Action Item Tracker

Think Zoom/Meet but with an AI secretary that joins meetings, summarizes discussions, and assigns tasks.

Services:

Audio Capture + Transcription (Go + Kafka + Whisper)

Summarization Service (LLM) (Python + LangChain + MongoDB)

Action Item Extraction (Rust + Redis)

Calendar/Task Sync Service (Java + PostgreSQL)

Dashboard + Notifications (Node.js + RabbitMQ)

✅ Usefulness: Every company needs this. Saves hours.

😎 Vibe: Feels futuristic + AI-first

## Services & Functionality Breakdown

### 1. **User & Profile Service (@Earth Magic)**

- **Functionality:**
  - User registration, login (JWT auth, role-based access).
  - Secure API for other services to fetch/update user data.
- **Tech Stack:**
  - **Language:** Java (Spring Boot, strong for auth + REST APIs).
  - **Database:** PostgreSQL (reliable, relational for structured user data).

### 2. **Audio Capture + Transcription Service** 🎤  (@Jaivik Kalathiya )

- **Functionality:**
  - Captures live meeting audio/video stream.
  - Uses **speech-to-text** (Whisper, Vosk, or Azure Speech) for transcription.
  - Streams partial transcripts via Kafka topics.
- **Language/Tech:**
  - **Go** (lightweight + good concurrency).
  - **Kafka** (for real-time transcript streaming).
  - **Whisper API / Vosk / DeepSpeech** for transcription.
- **Database:**
  - Firebase for storing raw transcript and audio

### **3. Summarization Service** 📝 (@Thor Odin)

- **Functionality:**
  - Consumes transcripts from Kafka.
  - Generates concise meeting summaries.
  - Stores summaries for later retrieval.
- **Tech Stack:**
  - **Language:** Python (rich NLP ecosystem).
  - **LLM Framework:** LangChain + any local/hosted LLM (Llama 3, GPT API, etc.).
  - **DB:** MongoDB (document store → good for transcripts + summaries).
  - **Communication:** REST/gRPC endpoint for on-demand summary retrieval.

### 4. **Action Item Extraction Service** ✅ (@Ronit patel)

- **Functionality:**
  - Extracts **tasks, deadlines, and ownership** from summaries.
  - Maps tasks to individuals (NLP entity recognition).
  - Prioritization (urgent vs normal).
- **Language/Tech:**
  - Python (fast + memory safe).
  - NLP models (Spacy / HuggingFace Transformers).
- **Database:** **Redis** (fast KV store for active tasks + cache).

---

### 5. **Calendar/Task Sync Service** 📅 (@SoftHell Gaming )

- **Functionality:**
  - Integrates with **Google Calendar / Outlook / Notion / Trello** APIs.
  - Creates events, deadlines, reminders.
  - Two-way sync (updates tasks if changed in calendar).
- **Language/Tech:**
  - **Java (Spring Boot)** (great for integrations + API-heavy work).
  - **PostgreSQL** (relational DB for calendar events & tasks).
- **Communication:** REST/gRPC with Action Item Service.

---

### 6. **Dashboard + Notification Service** 📊 (Anyone)

- **Functionality:**
  - Frontend UI → view summaries, tasks, meeting history.
  - Push/email/Slack notifications for action items.
  - Analytics: task completion rate, meeting time vs productivity.
- **Language/Tech:**
  - **Node.js (Express/Next.js)** for backend + frontend API.
  - **React** (dashboard UI).
  - **RabbitMQ** for async notifications.
- **Database:** **Elasticsearch** (for search across transcripts/summaries).

<aside>
💡

## **Extra Ideas :**

- [ ] **Action Item Auto-Suggest**
  - AI doesn’t just extract tasks — it **suggests tasks** based on discussion:
    - “Since we decided to increase marketing budget, suggest creating campaign draft.”
  - Uses **simple keyword-context mapping**, not full LLM (easy + light).
  - **Tech Stack:**
    - Python + SpaCy/NLTK for NLP
    - Redis for storing suggested tasks
    - RabbitMQ for async communication with dashboard
- [ ] **Visual Decision Map** - Creates **graphical decision trees** from meeting: - Shows “Decision → Assigned Person → Deadline → Dependencies” - **Cool factor:** Converts text to visual workflow instantly - **Tech Stack:** - Python + NLP for decision extraction - Node.js + D3.js / Mermaid.js for visualization
</aside>

<aside>
💡

# Resources:

**Transcript** : https://www.videosdk.live/developer-hub/social/implementing-real-time-transcription-guide#understanding-real-time-transcription-and-its-applications

</aside>

![_- visual selection.png](attachment:fda4522a-c075-42f0-bf0c-9677b7d4e314:_-_visual_selection.png)
