// Simple test script to validate LiveKit credentials
const { AccessToken } = require("livekit-server-sdk");

// Use the same credentials from .env.local
const LIVEKIT_API_KEY = "APIb6Jpq4kc4vsP";
const LIVEKIT_API_SECRET = "9E03zlOG78SjrdiASqStsKeXUSXdd6W4RraXhmqk2PX";

async function testLiveKitCredentials() {
  try {
    console.log("Testing LiveKit token generation...");
    
    const token = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: "test@example.com",
        name: "Test User",
      }
    );

    token.addGrant({
      room: "test-room",
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();
    console.log("✅ Token generated successfully");
    console.log("Token length:", jwt.length);
    console.log("Token preview:", jwt.substring(0, 50) + "...");
    
    // Try to decode the JWT to check its structure
    const parts = jwt.split('.');
    if (parts.length === 3) {
      try {
        const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        console.log("Token header:", header);
        console.log("Token payload:", {
          iss: payload.iss,
          sub: payload.sub,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          video: payload.video
        });
        
        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = payload.exp - now;
        console.log(`Token expires in ${expiresIn} seconds`);
        
        // Validate the issuer matches our API key
        if (payload.iss === LIVEKIT_API_KEY) {
          console.log("✅ Token issuer matches API key");
        } else {
          console.log("❌ Token issuer does not match API key");
          console.log("Expected:", LIVEKIT_API_KEY);
          console.log("Got:", payload.iss);
        }
        
      } catch (e) {
        console.error("❌ Could not decode token:", e.message);
      }
    } else {
      console.error("❌ Invalid JWT format");
    }
    
  } catch (error) {
    console.error("❌ Error generating token:", error.message);
  }
}

testLiveKitCredentials();