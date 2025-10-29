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

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantEmail, // Use email as unique identity
        name: participantName,
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
