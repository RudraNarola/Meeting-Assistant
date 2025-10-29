import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  apiKey: process.env.FIREBASE_API_KEY,
};

// Initialize Firebase
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get meeting to verify access
    const meetingRef = doc(db, "meetings", meetingId);
    const meetingDoc = await getDoc(meetingRef);

    if (!meetingDoc.exists()) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const meetingData = meetingDoc.data();

    // Check if user has access to this meeting
    if (meetingData.hostId !== session.user.email) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get recordings from meeting document
    const recordings = meetingData.recordings || [];

    // Filter and format recordings for response
    const formattedRecordings = recordings.map((recording: any) => ({
      participantId: recording.participantId,
      timestamp: recording.timestamp,
      fileName: recording.fileName,
      publicUrl: recording.publicUrl,
      fileSize: recording.fileSize,
      uploadedAt: recording.uploadedAt,
      uploadedBy: recording.uploadedBy,
      storageType: recording.storageType || "local",
    }));

    return NextResponse.json({
      meetingId,
      recordings: formattedRecordings,
      totalRecordings: formattedRecordings.length,
    });
  } catch (error) {
    console.error("Error fetching meeting recordings:", error);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 }
    );
  }
}
