import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";

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

    // Use setDoc with meetingId as document ID instead of addDoc
    const meetingRef = doc(db, "meetings", meetingId);
    await setDoc(meetingRef, meetingData);

    return NextResponse.json({
      id: meetingId,
      joinUrl: meetingData.joinUrl,
      docId: meetingId, // Document ID is now the same as meetingId
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}
