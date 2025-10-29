import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface ParticipantAudio {
  participantEmail: string;
  participantName: string;
  audioUrl: string;
  audioFileName: string;
  uploadedAt: string;
  audioSize: number;
  duration?: number; // in seconds if available
  storageType: "local" | "firebase";
  localPath?: string;
  publicUrl?: string;
}

export async function uploadParticipantAudio(
  meetingId: string,
  participantEmail: string,
  participantName: string,
  audioBlob: Blob
): Promise<ParticipantAudio> {
  // Create structured file path for local storage
  const timestamp = Date.now();
  const sanitizedEmail = participantEmail
    .replace("@", "_at_")
    .replace(/\./g, "_");
  const fileName = `${sanitizedEmail}-${timestamp}.webm`;

  // Create local directory structure
  const recordingsDir = path.join(
    process.cwd(),
    "public",
    "recordings",
    meetingId
  );

  // Ensure directory exists
  if (!existsSync(recordingsDir)) {
    await mkdir(recordingsDir, { recursive: true });
  }

  // Local file path
  const localFilePath = path.join(recordingsDir, fileName);
  const publicUrl = `/recordings/${meetingId}/${fileName}`;

  // Convert blob to buffer and save locally
  const arrayBuffer = await audioBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(localFilePath, buffer);

  // Create participant audio record
  const participantAudio: ParticipantAudio = {
    participantEmail,
    participantName,
    audioUrl: publicUrl, // Use public URL for access
    audioFileName: fileName,
    uploadedAt: new Date().toISOString(),
    audioSize: audioBlob.size,
    storageType: "local",
    localPath: localFilePath,
    publicUrl: publicUrl,
  };

  // Store in Firestore for easy querying
  await setDoc(doc(db, "meeting-audio", `${meetingId}_${participantEmail}`), {
    meetingId,
    ...participantAudio,
  });

  return participantAudio;
}

export async function getMeetingAudioFiles(meetingId: string) {
  const audioQuery = query(
    collection(db, "meeting-audio"),
    where("meetingId", "==", meetingId)
  );
  const audioSnapshot = await getDocs(audioQuery);
  return audioSnapshot.docs.map((doc) => doc.data());
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
