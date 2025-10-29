import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";

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
