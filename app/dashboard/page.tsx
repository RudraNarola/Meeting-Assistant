"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: string;
  joinUrl: string;
  hostId: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchMeetings();
    }
  }, [session]);

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings/list");
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      } else {
        console.error("Failed to fetch meetings");
        setMeetings([]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      setMeetings([]);
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (status === "loading") {
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
            Please sign in with Google to access your dashboard.
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
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-gray-700 hover:text-gray-900 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage your meetings and view upcoming sessions
            </p>
          </div>
          <Link
            href="/create-meeting"
            className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700"
          >
            Create Meeting
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Total Meetings
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {meetings.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upcoming
            </h3>
            <p className="text-3xl font-bold text-green-600">
              {meetings.filter((m) => m.status === "scheduled").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Completed
            </h3>
            <p className="text-3xl font-bold text-gray-600">
              {meetings.filter((m) => m.status === "ended").length}
            </p>
          </div>
        </div>

        {/* Meetings List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Meetings
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-600">Loading meetings...</div>
            </div>
          ) : meetings.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-600 mb-4">No meetings found</div>
              <Link
                href="/create-meeting"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
              >
                Create Your First Meeting
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {meeting.title}
                      </h3>
                      {meeting.description && (
                        <p className="text-gray-600 mb-2">
                          {meeting.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          📅{" "}
                          {new Date(meeting.scheduledAt).toLocaleDateString()}
                        </span>
                        <span>
                          🕐{" "}
                          {new Date(meeting.scheduledAt).toLocaleTimeString()}
                        </span>
                        <span>⏱️ {meeting.duration} min</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
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
                    <div className="flex space-x-2 ml-4">
                      {meeting.status === "scheduled" && (
                        <Link
                          href={`/meeting/${meeting.id}/join`}
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Join
                        </Link>
                      )}
                      <button
                        onClick={() => copyToClipboard(meeting.joinUrl)}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Copy Link
                      </button>
                      <Link
                        href={`/meeting/${meeting.id}`}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
