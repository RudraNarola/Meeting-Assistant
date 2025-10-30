import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Firebase configuration (for Firestore only)
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  apiKey: process.env.FIREBASE_API_KEY,
};

// Initialize Firebase
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    // Allow public access for recording uploads
    console.log("Recording upload request received");

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const meetingId = formData.get("meetingId") as string;
    const participantId = formData.get("participantId") as string;
    const timestamp = formData.get("timestamp") as string;

    if (!audioFile || !meetingId || !participantId || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("Storing audio recording locally:", {
      meetingId,
      participantId,
      timestamp,
      fileSize: audioFile.size,
      fileType: audioFile.type,
    });

    // Create local storage directory structure
    const recordingsDir = path.join(
      process.cwd(),
      "public",
      "recordings",
      meetingId,
      participantId
    );

    // Ensure directory exists
    if (!existsSync(recordingsDir)) {
      await mkdir(recordingsDir, { recursive: true });
    }

    // Create filename
    const fileName = `audio-${timestamp}.webm`;
    const filePath = path.join(recordingsDir, fileName);
    const publicUrl = `/recordings/${meetingId}/${participantId}/${fileName}`;

    // Convert file to buffer and save locally
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await writeFile(filePath, buffer);

    console.log("Audio file saved locally:", filePath);

    // Update meeting document with recording info
    const meetingRef = doc(db, "meetings", meetingId);
    const recordingInfo = {
      participantId,
      timestamp,
      fileName,
      localPath: filePath,
      publicUrl,
      fileSize: audioFile.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: participantId, // Use participantId since no authentication
      storageType: "local",
    };

    await updateDoc(meetingRef, {
      recordings: arrayUnion(recordingInfo),
    });

    console.log("Audio recording metadata saved to Firestore:", recordingInfo);

    return NextResponse.json({
      success: true,
      fileName,
      publicUrl,
      localPath: filePath,
      fileSize: audioFile.size,
      storageType: "local",
      message: "Audio recording saved locally",
    });
  } catch (error) {
    console.error("Error saving audio recording locally:", error);
    return NextResponse.json(
      { error: "Failed to save audio recording" },
      { status: 500 }
    );
  }
}
