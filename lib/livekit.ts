import { AccessToken } from "livekit-server-sdk";

export async function generateAccessToken(
  roomName: string,
  participantName: string,
  participantEmail: string
) {
  try {
    console.log("Generating access token with:", {
      roomName,
      participantName,
      participantEmail,
      hasApiKey: !!process.env.LIVEKIT_API_KEY,
      hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
    });

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      throw new Error("LiveKit API key or secret not configured");
    }

    // Create highly unique identity to avoid conflicts
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const uniqueIdentity = `user-${random}-${timestamp}`;

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: uniqueIdentity, // Use highly unique identity
        name: participantName,
        metadata: JSON.stringify({
          email: participantEmail,
          joinedAt: new Date().toISOString(),
        }),
      }
    );

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();
    console.log("JWT token generated successfully");
    return jwt;
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    throw error;
  }
}
