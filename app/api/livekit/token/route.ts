import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { generateAccessToken } from "@/lib/livekit";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomName, participantName, participantEmail } = body;

    if (!roomName || !participantName || !participantEmail) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("Generating LiveKit token for:", {
      roomName,
      participantName,
      participantEmail,
      wsUrl: process.env.LIVEKIT_WS_URL,
    });

    const token = await generateAccessToken(
      roomName,
      participantName,
      participantEmail
    );

    console.log("Token generated successfully");

    return NextResponse.json({
      token,
      wsUrl: process.env.LIVEKIT_WS_URL,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
