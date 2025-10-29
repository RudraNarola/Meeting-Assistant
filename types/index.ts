import { Timestamp } from "firebase/firestore";

export interface User {
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

export interface Meeting {
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

export interface MeetingAudio {
  meetingId: string;
  participantEmail: string;
  participantName: string;
  audioUrl: string; // Firebase Storage download URL
  audioFileName: string; // Storage path
  uploadedAt: string; // ISO string
  audioSize: number; // in bytes
  duration?: number; // in seconds if available
}

export interface MeetingParticipant {
  meetingId: string;
  participantEmail: string;
  participantName: string;
  joinedAt?: Timestamp;
  leftAt?: Timestamp;
  isHost: boolean;
}