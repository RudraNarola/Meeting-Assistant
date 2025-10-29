"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Room, DisconnectReason } from "livekit-client";
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: string;
  joinUrl: string;
  hostId: string;
  roomName: string;
}

interface JoinMeetingPageProps {
  params: Promise<{ id: string }>;
}

export default function JoinMeeting({ params }: JoinMeetingPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetingId, setMeetingId] = useState<string>("");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setMeetingId(id);
    });
  }, [params]);

  useEffect(() => {
    if (session && meetingId) {
      fetchMeeting();
    }
  }, [session, meetingId]);

  const fetchMeeting = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`);
      if (response.ok) {
        const data = await response.json();
        setMeeting(data.meeting);
      } else if (response.status === 404) {
        setError("Meeting not found");
      } else if (response.status === 403) {
        setError("You don't have access to this meeting");
      } else {
        setError("Failed to load meeting");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      setError("Failed to load meeting");
      setLoading(false);
    }
  };

  const joinMeeting = async () => {
    if (!meeting || !session?.user?.name || !session?.user?.email) return;

    setIsJoining(true);
    try {
      console.log("Attempting to join meeting:", {
        roomName: meeting.roomName,
        participantName: session.user.name,
        participantEmail: session.user.email,
      });

      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: meeting.roomName,
          participantName: session.user.name,
          participantEmail: session.user.email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Token received successfully:", data.token ? "✓" : "✗");
        console.log("Token details:", {
          tokenLength: data.token?.length,
          wsUrl: data.wsUrl,
          tokenPreview: data.token?.substring(0, 50) + "...",
        });
        setToken(data.token);
        setHasJoined(true);
      } else {
        const errorData = await response.json();
        console.error("Token request failed:", response.status, errorData);
        setError("Failed to join meeting");
      }
    } catch (error) {
      console.error("Error joining meeting:", error);
      setError("Failed to join meeting");
    }
    setIsJoining(false);
  };

  const leaveMeeting = () => {
    setHasJoined(false);
    setToken("");
  };

  const handleDisconnected = (reason?: DisconnectReason) => {
    console.log("LiveKit disconnected. Reason:", reason);
    setHasJoined(false);
    setToken("");
    if (reason) {
      setError(`Connection lost: ${reason}`);
    }
  };

  const handleError = (error: Error) => {
    console.error("LiveKit error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause,
    });
    setError(`Meeting error: ${error.message}`);
    setHasJoined(false);
    setToken("");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in with Google to join this meeting.
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                AI Meeting Assistant
              </Link>
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Meeting Not Available
            </h2>
            <p className="text-gray-600 mb-6">
              {error ||
                "The meeting you're looking for doesn't exist or you don't have access to it."}
            </p>
            <Link
              href="/dashboard"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (hasJoined && token) {
    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL;
    console.log("Connecting to LiveKit with:", {
      serverUrl,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 50) + "...",
    });

    return (
      <div className="h-screen bg-black">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          data-lk-theme="default"
          style={{ height: "100vh" }}
          onDisconnected={handleDisconnected}
          onError={handleError}
          connect={true}
          onConnected={() => {
            console.log("Successfully connected to LiveKit room");
          }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              AI Meeting Assistant
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 text-sm font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Meeting Lobby */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {meeting.title}
            </h1>

            {meeting.description && (
              <p className="text-gray-600 mb-6">{meeting.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8 text-sm">
              <div>
                <span className="text-gray-500">Scheduled:</span>
                <p className="font-medium">
                  {new Date(meeting.scheduledAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Time:</span>
                <p className="font-medium">
                  {new Date(meeting.scheduledAt).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <p className="font-medium">{meeting.duration} minutes</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    meeting.status === "scheduled"
                      ? "bg-green-100 text-green-800"
                      : meeting.status === "live"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {meeting.status}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  🎙️ Multi-Channel Audio Recording
                </h3>
                <p className="text-blue-800 text-sm">
                  This meeting will record each participant's audio separately
                  for AI analysis. Your consent to recording is required to
                  join.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">
                  🤖 AI Task Extraction
                </h3>
                <p className="text-green-800 text-sm">
                  After the meeting, AI will analyze the conversation and
                  automatically create relevant tasks in the host's Google
                  Calendar.
                </p>
              </div>

              <button
                onClick={joinMeeting}
                disabled={isJoining}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? "Joining..." : "Join Meeting"}
              </button>

              <div className="flex justify-center space-x-4 pt-4">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  Back to Dashboard
                </Link>
                <span className="text-gray-400">•</span>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(window.location.href)
                  }
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  Copy Meeting Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
