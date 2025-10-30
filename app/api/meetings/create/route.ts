import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, scheduledAt, duration } = body;

    if (!title || !scheduledAt || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate unique meeting ID
    const meetingId = `meeting-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Get the request host for generating joinUrl
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const joinUrl = `${protocol}://${host}/meeting/${meetingId}/join`;

    // Create meeting document
    const meetingData = {
      id: meetingId,
      title,
      description: description || "",
      scheduledAt,
      duration,
      status: "scheduled",
      joinUrl,
      hostId: session.user.email,
      roomName: `room-${meetingId}`,
      createdAt: new Date().toISOString(),
      recordings: [],
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, "meetings"), meetingData);

    console.log("Meeting created:", meetingId);

    return NextResponse.json({
      success: true,
      meeting: {
        ...meetingData,
        firestoreId: docRef.id,
      },
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}
