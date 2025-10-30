import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow public access to meeting details for joining
    const { id: meetingId } = await params;
    const meetingRef = doc(db, "meetings", meetingId);
    const meetingDoc = await getDoc(meetingRef);

    if (!meetingDoc.exists()) {
      // Create a public meeting room for any ID
      const host = request.headers.get("host") || "localhost:3000";
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      const joinUrl = `${protocol}://${host}/meeting/${meetingId}/join`;

      const publicMeeting = {
        id: meetingId,
        title: "Public Meeting Room",
        description: "Open meeting room - anyone can join",
        scheduledAt: new Date().toISOString(),
        duration: 120,
        status: "live",
        joinUrl: joinUrl,
        hostId: "public",
        roomName: `room-${meetingId}`,
        createdAt: new Date().toISOString(),
        isPublic: true,
      };
      console.log("Created public meeting with joinUrl:", joinUrl);
      return NextResponse.json({ meeting: publicMeeting });
    }

    const meetingData = meetingDoc.data();

    // Remove host restriction - anyone can access meeting details
    const meeting = {
      id: meetingDoc.id,
      ...meetingData,
    };

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
