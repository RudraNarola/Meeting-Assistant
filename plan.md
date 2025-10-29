# AI-Powered Meeting Assistant Platform - Implementation Plan

## Project Overview

I want to create a AI powered meeting assistant platform that allows users to schedule, manage, and join virtual meetings seamlessly.

For virtual meeting I plan to use LiveKit library for real-time audio and video communication.

The main goal for now is to store multi channel audio of meeting on cloud storage (Firebase Storage) then I can give it other service so they generate transcript and summary from it.

Also I want Login/Signup functionality using OAuth 2.0 (only Google) for user authentication as later I want those google token for Google Calendar integration to schedule meetings directly from the platform.

## Technology Stack

- **Frontend & Backend**: Next.js (Full-stack)
- **Real-time Communication**: LiveKit Cloud
- **Authentication**: Google OAuth 2.0
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Calendar Integration**: Google Calendar API

---

# Detailed Implementation Plan

## Phase 1: Project Setup & Configuration (Days 1-2)

### 1.1 Environment Setup

```bash
# Install dependencies
npm install @livekit/components-react livekit-client livekit-server-sdk
npm install firebase @google-cloud/storage
npm install next-auth @auth/firebase-adapter
npm install @google-cloud/firestore
npm install googleapis nodemailer
npm install @types/node @types/react typescript
npm install tailwindcss @headlessui/react lucide-react
```

**Required Environment Variables:**

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# LiveKit
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-livekit-domain.livekit.cloud

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket

# AI Service Integration
AI_SERVICE_URL=your_ai_service_endpoint
AI_SERVICE_API_KEY=your_ai_service_api_key
```

### 1.2 Firebase Setup Steps

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/
   - Click "Create a project"
   - Enter project name and enable Google Analytics (optional)
2. **Enable Firestore Database**

   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in test mode"
   - Select location closest to your users

3. **Enable Firebase Storage**

   - Go to Storage
   - Click "Get started"
   - Choose "Start in test mode"
   - Select location

4. **Generate Service Account**
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Download JSON file and extract credentials

### 1.3 Google Cloud Console Setup

1. **Create Google Cloud Project**

   - Go to https://console.cloud.google.com/
   - Create new project or select existing one

2. **Enable APIs**

   - Enable Google OAuth 2.0 API
   - Enable Google Calendar API
   - Enable Gmail API (for notifications)

3. **Configure OAuth Consent Screen**

   - Go to APIs & Services > OAuth consent screen
   - Choose "External" user type
   - Fill required information
   - Add scopes: email, profile, calendar

4. **Create OAuth Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: Web application
   - Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

### 1.4 LiveKit Cloud Setup

Since you already have an account:

1. **Get API Credentials**

   - Go to LiveKit Cloud Dashboard
   - Navigate to Settings > Keys
   - Copy API Key and Secret
   - Note your WebSocket URL

2. **Configure Project Settings**
   - Set up recording settings for multi-track audio
   - Configure room settings for your needs

---

## Phase 2: Authentication System (Days 3-4)

### 2.1 NextAuth.js Configuration with Calendar Edit Permissions

**File: `app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { FirestoreAdapter } from "@auth/firebase-adapter";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar", // Read calendar
            "https://www.googleapis.com/auth/calendar.events", // Create/edit events
            "https://www.googleapis.com/auth/calendar.events.owned", // Edit owned events
          ].join(" "),
          access_type: "offline", // Critical for refresh token
          prompt: "consent", // Force consent to get refresh token
        },
      },
    }),
  ],
  adapter: FirestoreAdapter(/* firestore config */),
  callbacks: {
    async jwt({ token, account, profile }) {
      // Store tokens on first signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // Return previous token if still valid
      if (Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Refresh expired token
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Pass tokens to session for your AI service
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      session.expiresAt = token.expiresAt;
      return session;
    },
  },
};

async function refreshAccessToken(token) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      });

    const response = await fetch(url, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Date.now() / 1000 + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
```

### 2.2 Audio Storage with Email Mapping

**File: `lib/audio-storage.ts`**

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "./firebase";
import { collection, doc, setDoc, updateDoc } from "firebase/firestore";

export interface ParticipantAudio {
  participantEmail: string;
  participantName: string;
  audioUrl: string;
  audioFileName: string;
  uploadedAt: string;
  audioSize: number;
  duration?: number; // in seconds if available
}

export async function uploadParticipantAudio(
  meetingId: string,
  participantEmail: string,
  participantName: string,
  audioBlob: Blob
): Promise<ParticipantAudio> {
  const storage = getStorage();

  // Create structured file path
  const timestamp = Date.now();
  const fileName = `recordings/${meetingId}/${participantEmail.replace(
    "@",
    "_at_"
  )}-${timestamp}.webm`;
  const storageRef = ref(storage, fileName);

  // Upload audio file
  await uploadBytes(storageRef, audioBlob);
  const downloadURL = await getDownloadURL(storageRef);

  // Create participant audio record
  const participantAudio: ParticipantAudio = {
    participantEmail,
    participantName,
    audioUrl: downloadURL,
    audioFileName: fileName,
    uploadedAt: new Date().toISOString(),
    audioSize: audioBlob.size,
  };

  // Store in Firestore for easy querying
  await setDoc(doc(db, "meeting-audio", `${meetingId}_${participantEmail}`), {
    meetingId,
    ...participantAudio,
  });

  return participantAudio;
}

// Function to notify your AI service with meeting data and tokens
export async function notifyAIService(meetingId: string, hostTokens: any) {
  const meetingAudioFiles = await getMeetingAudioFiles(meetingId);

  const payload = {
    meetingId,
    audioFiles: meetingAudioFiles,
    googleTokens: {
      accessToken: hostTokens.accessToken,
      refreshToken: hostTokens.refreshToken,
      expiresAt: hostTokens.expiresAt,
    },
    notificationUrl: `${process.env.NEXTAUTH_URL}/api/meetings/${meetingId}/ai-complete`,
  };

  // Call your AI service
  await fetch(`${process.env.AI_SERVICE_URL}/process-meeting`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_SERVICE_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
}
```

### 2.3 Database Schema Design

**Firestore Collections:**

```typescript
// users/{userId}
interface User {
  id: string;
  name: string;
  email: string;
  image: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  tokenExpiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// meetings/{meetingId}
interface Meeting {
  id: string;
  title: string;
  description?: string;
  hostId: string; // host email
  hostName: string;
  scheduledAt: Timestamp;
  duration: number; // in minutes
  status: "scheduled" | "live" | "ended" | "processing";
  roomName: string;
  joinUrl: string;
  participants: string[]; // array of participant emails

  // Host's Google tokens for AI service
  hostGoogleTokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Timestamp;
  };

  // AI processing status
  aiProcessingStatus?: "pending" | "sent" | "completed" | "failed";
  aiNotifiedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// meeting-audio/{meetingId}_{participantEmail}
interface MeetingAudio {
  meetingId: string;
  participantEmail: string;
  participantName: string;
  audioUrl: string; // Firebase Storage download URL
  audioFileName: string; // Storage path
  uploadedAt: string; // ISO string
  audioSize: number; // in bytes
  duration?: number; // in seconds if available
}

// meeting-participants/{meetingId}_{participantEmail}
interface MeetingParticipant {
  meetingId: string;
  participantEmail: string;
  participantName: string;
  joinedAt?: Timestamp;
  leftAt?: Timestamp;
  isHost: boolean;
}
```

---

## Phase 3: Meeting Management (Days 5-7) ✅ COMPLETED

**Status: COMPLETED** - Meeting creation, dashboard, and management features implemented successfully.

**Completed Features:**

- ✅ Meeting creation form with validation and scheduling
- ✅ User dashboard with statistics and meeting list
- ✅ Meeting details page with join links and information
- ✅ API endpoints for CRUD operations on meetings
- ✅ Authentication guards and proper session management
- ✅ Responsive UI design across all pages
- ✅ Error handling and loading states
- ✅ Next.js 16+ compatibility with async params

**Files Implemented:**

- `app/create-meeting/page.tsx` - Complete meeting creation interface
- `app/dashboard/page.tsx` - User dashboard with meeting overview
- `app/meeting/[id]/page.tsx` - Meeting details and management
- `app/api/meetings/route.ts` - Meeting creation endpoint
- `app/api/meetings/list/route.ts` - List user meetings
- `app/api/meetings/[id]/route.ts` - Get meeting details
- `types/next-auth.d.ts` - TypeScript declarations for NextAuth

### 3.1 Meeting Creation Flow (Simplified) ✅ IMPLEMENTED

**File: `app/create-meeting/page.tsx`**

```typescript
"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function CreateMeeting() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    duration: 60,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create meeting with host's Google tokens
      const meeting = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          hostId: session?.user?.email,
          hostName: session?.user?.name,
          hostGoogleTokens: {
            accessToken: session?.accessToken,
            refreshToken: session?.refreshToken,
            expiresAt: session?.expiresAt,
          },
        }),
      }).then((res) => res.json());

      // Redirect to meeting details with shareable URL
      window.location.href = `/meeting/${meeting.id}`;
    } catch (error) {
      console.error("Error creating meeting:", error);
    }
  };

  if (!session) {
    return (
      <div className="text-center">
        <p>Please sign in with Google to create meetings.</p>
        <p className="text-sm text-gray-600 mt-2">
          We need Google Calendar permissions to enable AI task creation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div>
        <label className="block mb-2">Meeting Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full p-2 border rounded"
          placeholder="Meeting agenda, topics to discuss..."
        />
      </div>

      <div>
        <label className="block mb-2">Scheduled Date & Time</label>
        <input
          type="datetime-local"
          value={formData.scheduledAt}
          onChange={(e) =>
            setFormData({ ...formData, scheduledAt: e.target.value })
          }
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block mb-2">Duration (minutes)</label>
        <select
          value={formData.duration}
          onChange={(e) =>
            setFormData({ ...formData, duration: parseInt(e.target.value) })
          }
          className="w-full p-2 border rounded"
        >
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
        </select>
      </div>

      {/* Info about automatic processing */}
      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-semibold mb-2">🤖 AI Processing</h3>
        <p className="text-sm text-gray-700">
          This meeting will be automatically recorded with separate audio
          channels for each participant. After the meeting ends, audio files
          will be sent to our AI service for task extraction and calendar
          integration.
        </p>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Create Meeting
      </button>
    </form>
  );
}
```

**File: `app/api/meetings/route.ts`** (Simplified)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, scheduledAt, duration, hostGoogleTokens } =
      body;

    // Generate unique meeting ID
    const meetingId = `meeting-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const roomName = `room-${meetingId}`;

    // Create meeting document
    const meetingData = {
      id: meetingId,
      title,
      description: description || "",
      hostId: session.user.email,
      hostName: session.user.name || "",
      scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
      duration,
      status: "scheduled",
      roomName,
      joinUrl: `${process.env.NEXTAUTH_URL}/meeting/${meetingId}`,
      participants: [],
      hostGoogleTokens: {
        accessToken: hostGoogleTokens.accessToken,
        refreshToken: hostGoogleTokens.refreshToken,
        expiresAt: Timestamp.fromDate(
          new Date(hostGoogleTokens.expiresAt * 1000)
        ),
      },
      aiProcessingStatus: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "meetings"), meetingData);

    return NextResponse.json({
      id: meetingId,
      joinUrl: meetingData.joinUrl,
      docId: docRef.id,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}
```

### 3.2 Meeting Dashboard

**File: `app/dashboard/page.tsx`**

- List all meetings (hosted + participated)
- Filter by status (upcoming, live, past)
- Quick actions: Join, Edit, Delete, Copy Link
- Show participant count and recording status

### 3.3 Meeting Invitation System

**Simple URL Sharing:**

- Meeting URL format: `https://yourapp.com/meeting/{meetingId}`
- Copy link button on meeting details
- QR code generation (optional)
- Email sharing via browser's native share API

---

## Phase 4: LiveKit Integration (Days 8-10)

### 4.1 Room Management

**File: `lib/livekit.ts`**

```typescript
import { AccessToken } from "livekit-server-sdk";

export function generateAccessToken(roomName: string, participantName: string) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantName,
      name: participantName,
    }
  );

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}
```

### 4.2 Meeting Room Component

**File: `app/meeting/[meetingId]/page.tsx`**

- LiveKit VideoConference component
- Custom controls for mute/unmute, video on/off
- Participant list sidebar
- Recording controls (start/stop)
- Leave meeting button

### 4.3 Audio Recording Setup

**Multi-track Recording Configuration:**

```typescript
// Configure room for separate track recording
const roomOptions = {
  adaptiveStream: true,
  dynacast: true,
  audioRecording: {
    enabled: true,
    separateTracks: true, // This enables per-participant audio files
  },
};
```

---

## Phase 5: Multi-Channel Audio Storage (Days 11-13)

### 5.1 Recording Management

**File: `lib/recording.ts`**

```typescript
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes } from "firebase/storage";

export async function uploadRecording(
  meetingId: string,
  participantId: string,
  audioBlob: Blob
) {
  const storage = getStorage();
  const fileName = `recordings/${meetingId}/${participantId}-${Date.now()}.webm`;
  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, audioBlob);
  return fileName;
}
```

### 5.2 Recording Triggers

- Automatic recording start when first participant joins
- Stop recording when last participant leaves
- Manual recording controls for host
- Store recording metadata in Firestore

### 5.3 Post-Meeting Processing (Notify AI Service)

**File: `app/api/meetings/[meetingId]/complete/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyAIService } from "@/lib/audio-storage";

export async function POST(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;

    // Get meeting details
    const meetingDoc = await getDoc(doc(db, "meetings", meetingId));
    if (!meetingDoc.exists()) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const meetingData = meetingDoc.data();

    // Update meeting status
    await updateDoc(doc(db, "meetings", meetingId), {
      status: "processing",
      updatedAt: new Date(),
    });

    // Get all audio files for this meeting
    const audioQuery = query(
      collection(db, "meeting-audio"),
      where("meetingId", "==", meetingId)
    );
    const audioSnapshot = await getDocs(audioQuery);
    const audioFiles = audioSnapshot.docs.map((doc) => doc.data());

    // Prepare data for AI service
    const aiServicePayload = {
      meetingId,
      meetingTitle: meetingData.title,
      meetingDescription: meetingData.description,
      scheduledAt: meetingData.scheduledAt.toDate().toISOString(),
      duration: meetingData.duration,
      hostEmail: meetingData.hostId,

      // Audio files with participant mapping
      participantAudioFiles: audioFiles.map((audio) => ({
        participantEmail: audio.participantEmail,
        participantName: audio.participantName,
        audioUrl: audio.audioUrl,
        audioSize: audio.audioSize,
        duration: audio.duration,
      })),

      // Host's Google tokens for calendar integration
      googleTokens: {
        accessToken: meetingData.hostGoogleTokens.accessToken,
        refreshToken: meetingData.hostGoogleTokens.refreshToken,
        expiresAt: meetingData.hostGoogleTokens.expiresAt
          .toDate()
          .toISOString(),
      },

      // Callback URL for when AI processing is complete
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/meetings/${meetingId}/ai-complete`,
    };

    // Notify your AI service
    const aiResponse = await fetch(
      `${process.env.AI_SERVICE_URL}/process-meeting`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_SERVICE_API_KEY}`,
        },
        body: JSON.stringify(aiServicePayload),
      }
    );

    if (aiResponse.ok) {
      // Update meeting with AI notification status
      await updateDoc(doc(db, "meetings", meetingId), {
        aiProcessingStatus: "sent",
        aiNotifiedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "AI service notified successfully",
        audioFilesCount: audioFiles.length,
      });
    } else {
      throw new Error(`AI service responded with ${aiResponse.status}`);
    }
  } catch (error) {
    console.error("Error processing meeting completion:", error);

    // Update meeting with error status
    await updateDoc(doc(db, "meetings", params.meetingId), {
      aiProcessingStatus: "failed",
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { error: "Failed to notify AI service" },
      { status: 500 }
    );
  }
}
```

**File: `app/api/meetings/[meetingId]/ai-complete/route.ts`** (Webhook for AI service)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Webhook endpoint for your AI service to notify completion
export async function POST(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;
    const body = await request.json();

    // Verify the request is from your AI service
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.AI_SERVICE_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update meeting status
    await updateDoc(doc(db, "meetings", meetingId), {
      aiProcessingStatus: "completed",
      updatedAt: new Date(),
      // Optionally store any results from AI service
      aiResults: body.results || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling AI completion webhook:", error);
    return NextResponse.json(
      { error: "Failed to process AI completion" },
      { status: 500 }
    );
  }
}
```

---

## Phase 6: Meeting Join Flow (Days 14-15)

### 6.1 Join Meeting Page

**File: `app/meeting/[meetingId]/join/page.tsx`**

- Meeting details display
- Guest name input for non-authenticated users
- Device permissions check (camera/microphone)
- Join button with loading state

### 6.2 Meeting Validation

```typescript
// Validate meeting exists and is accessible
export async function validateMeeting(meetingId: string) {
  const meeting = await getMeeting(meetingId);

  if (!meeting) throw new Error("Meeting not found");
  if (meeting.status === "ended") throw new Error("Meeting has ended");

  return meeting;
}
```

---

## Phase 7: Integration & Polish (Days 16-18)

### 7.1 Error Handling & Loading States

- Global error boundary
- Loading spinners for all async operations
- Toast notifications for success/error messages
- Offline state handling

### 7.2 Responsive Design

- Mobile-first design approach
- Touch-friendly controls
- Responsive video grid
- Mobile-optimized meeting controls

### 7.3 Performance Optimization

- Code splitting for meeting components
- Lazy loading of non-critical features
- Image optimization
- Bundle size optimization

---

## File Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── meetings/route.ts
│   │   ├── meetings/[id]/route.ts
│   │   └── livekit/token/route.ts
│   ├── create-meeting/page.tsx
│   ├── dashboard/page.tsx
│   ├── meeting/[meetingId]/
│   │   ├── page.tsx
│   │   └── join/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── MeetingRoom.tsx
│   ├── ParticipantList.tsx
│   ├── MeetingControls.tsx
│   ├── MeetingCard.tsx
│   └── AuthProvider.tsx
├── lib/
│   ├── firebase.ts
│   ├── livekit.ts
│   ├── recording.ts
│   └── db.ts
├── types/
│   └── index.ts
└── public/
```

---

## Testing Checklist

- [ ] User authentication flow
- [ ] Meeting creation and editing
- [ ] Meeting join flow (authenticated + guest)
- [ ] Audio/video functionality
- [ ] Recording start/stop
- [ ] Multi-participant scenarios
- [ ] Network disconnection handling
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

---

## Deployment Considerations

1. **Environment Variables**: Set up production environment variables
2. **Domain Configuration**: Update OAuth redirect URIs for production domain
3. **Firebase Security Rules**: Implement proper Firestore and Storage security rules
4. **SSL Certificate**: Ensure HTTPS for WebRTC functionality
5. **CDN**: Use CDN for static assets
6. **Monitoring**: Set up error tracking and analytics

---

## Future Enhancements

- Screen sharing functionality
- Meeting chat feature
- Waiting room implementation
- Meeting scheduling with calendar integration
- Advanced recording controls
- Meeting templates
- Participant permissions management
- Meeting analytics and insights
