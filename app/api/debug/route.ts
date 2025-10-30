import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientIP =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";
  const host = request.headers.get("host") || "unknown";

  return NextResponse.json(
    {
      clientIP,
      userAgent,
      host,
      url: request.url,
      timestamp: new Date().toISOString(),
      livekitConfig: {
        hasWsUrl: !!process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
        wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
        hasApiKey: !!process.env.LIVEKIT_API_KEY,
        hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
