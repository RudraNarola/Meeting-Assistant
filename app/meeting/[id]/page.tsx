"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: string;
  joinUrl: string;
  hostId: string;
  recordingUrl?: string;
  aiAnalysis?: {
    tasksSuggested: string[];
    keyPoints: string[];
    actionItems: string[];
  };
}

export default function MeetingDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetingId, setMeetingId] = useState<string>("");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const joinMeeting = () => {
    if (meetingId) {
      router.push(`/meeting/${meetingId}/join`);
    }
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
            Please sign in with Google to access meeting details.
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
              Meeting Not Found
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-2"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {meeting.title}
          </h1>
          {meeting.description && (
            <p className="text-gray-600">{meeting.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Meeting Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Details Card */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Meeting Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Scheduled Date:</span>
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
            </div>

            {/* AI Analysis Results */}
            {meeting.aiAnalysis && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">
                  AI Analysis Results
                </h2>

                {meeting.aiAnalysis.keyPoints.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Key Points</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {meeting.aiAnalysis.keyPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {meeting.aiAnalysis.actionItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Action Items</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {meeting.aiAnalysis.actionItems.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {meeting.aiAnalysis.tasksSuggested.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Suggested Tasks for Calendar
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {meeting.aiAnalysis.tasksSuggested.map((task, index) => (
                        <li key={index}>{task}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Recording */}
            {meeting.recordingUrl && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">Recording</h2>
                <div className="flex items-center space-x-4">
                  <a
                    href={meeting.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Download Recording
                  </a>
                  <span className="text-sm text-gray-500">
                    Audio recording available for download
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {meeting.status === "scheduled" && (
                  <button
                    onClick={joinMeeting}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium"
                  >
                    Join Meeting
                  </button>
                )}

                <button
                  onClick={() => copyToClipboard(meeting.joinUrl)}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Copy Meeting Link
                </button>

                <button
                  onClick={() => copyToClipboard(window.location.href)}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Share Meeting Details
                </button>
              </div>
            </div>

            {/* Meeting Link */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Meeting Link</h3>
              <div className="bg-gray-50 p-3 rounded border text-sm font-mono break-all">
                {meeting.joinUrl}
              </div>
              <button
                onClick={() => copyToClipboard(meeting.joinUrl)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
