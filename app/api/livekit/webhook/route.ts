import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver, TrackType } from "livekit-server-sdk";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

// Initialize webhook receiver
const webhookReceiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    // Verify webhook
    const event = await webhookReceiver.receive(body, authHeader);

    console.log("LiveKit webhook event:", event.event, event.room?.name);

    switch (event.event) {
      case "room_started":
        if (event.room) {
          await updateMeetingStatus(event.room.name, "live");
        }
        break;

      case "room_finished":
        if (event.room) {
          await updateMeetingStatus(event.room.name, "ended");
        }
        break;

      case "participant_joined":
        console.log("Participant joined:", event.participant?.identity);
        break;

      case "participant_left":
        console.log("Participant left:", event.participant?.identity);
        break;

      case "track_published":
        if (event.track?.type === TrackType.AUDIO) {
          console.log("Audio track published:", event.participant?.identity);
          // Here you would typically start recording the audio track
          // For now, we'll just log it
        }
        break;

      case "track_unpublished":
        if (event.track?.type === TrackType.AUDIO) {
          console.log("Audio track unpublished:", event.participant?.identity);
        }
        break;

      default:
        console.log("Unhandled event:", event.event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing LiveKit webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function updateMeetingStatus(roomName: string, status: string) {
  try {
    // Find meeting by roomName and update status
    // Note: In a production app, you'd want to maintain a roomName -> meetingId mapping
    // For now, we'll extract the meeting ID from the room name
    const meetingId = roomName.replace("room-", "");

    const meetingRef = doc(db, "meetings", meetingId);
    await updateDoc(meetingRef, {
      status,
      updatedAt: Timestamp.now(),
    });

    console.log(`Updated meeting ${meetingId} status to ${status}`);
  } catch (error) {
    console.error("Error updating meeting status:", error);
  }
}
