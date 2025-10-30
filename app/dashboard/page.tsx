"use client";

import { useSession, signOut } from "next-auth/react";
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
  recordings?: any[];
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);

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
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      setLoading(false);
    }
  };

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/meetings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          scheduledAt: new Date().toISOString(),
          duration,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateModal(false);
        setTitle("");
        setDescription("");
        setDuration(60);
        fetchMeetings();
        router.push(`/meeting/${data.meeting.id}/join`);
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("recording") as File;
    const meetingTitle = formData.get("meetingTitle") as string;
    const meetingDescription = formData.get("meetingDescription") as string;

    if (!file) return;

    setUploadingFile(true);
    try {
      const uploadData = new FormData();
      uploadData.append("audio", file);
      uploadData.append("title", meetingTitle || file.name);
      uploadData.append("description", meetingDescription || "");
      uploadData.append("platform", "google-meet");

      const response = await fetch("http://localhost:8080/api/v1/audio/upload", {
        method: "POST",
        body: uploadData,
      });

      if (response.ok) {
        setShowUploadModal(false);
        fetchMeetings();
        alert("Recording uploaded and processed successfully!");
      } else {
        const errorData = await response.json().catch(() => null);
        alert(`Failed to upload recording: ${errorData?.message || response.statusText}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file");
    }
    setUploadingFile(false);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Sign in required</h2>
          <Link
            href="/"
            className="bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800"
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
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-semibold text-gray-900">
              Meeting Platform
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/recordings"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                📹 My Recordings
              </Link>
              <span className="text-sm text-gray-600">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">My Meetings</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
            >
              📁 Upload Recording
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
              + Create Meeting
            </button>
          </div>
        </div>

        {/* Meetings List */}
        {meetings.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-gray-600 mb-4">No meetings yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800"
            >
              Create your first meeting
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white rounded-lg border p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {meeting.title}
                    </h3>
                    {meeting.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {meeting.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>
                        📅 {new Date(meeting.scheduledAt).toLocaleDateString()}
                      </span>
                      <span>⏱️ {meeting.duration} min</span>
                      {meeting.recordings && meeting.recordings.length > 0 && (
                        <span>📹 {meeting.recordings.length} recordings</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLink(meeting.joinUrl)}
                      className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border rounded"
                    >
                      Copy Link
                    </button>
                    <Link
                      href={`/meeting/${meeting.id}/join`}
                      className="bg-gray-900 text-white px-4 py-1 rounded text-sm hover:bg-gray-800"
                    >
                      Join
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Create Meeting
            </h2>
            <form onSubmit={createMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-gray-900"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full border rounded-md px-3 py-2 text-gray-900"
                  min="15"
                  max="480"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-300 rounded-md py-2 hover:bg-gray-50 text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white rounded-md py-2 hover:bg-gray-800"
                >
                  Create & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Recording Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Upload Recording
            </h2>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Meeting Title
                </label>
                <input
                  type="text"
                  name="meetingTitle"
                  className="w-full border rounded-md px-3 py-2 text-gray-900"
                  placeholder="Enter meeting name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Description (optional)
                </label>
                <textarea
                  name="meetingDescription"
                  className="w-full border rounded-md px-3 py-2 text-gray-900"
                  placeholder="Enter meeting description"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Recording File (Audio/Video)
                </label>
                <input
                  type="file"
                  name="recording"
                  accept="audio/*,video/*"
                  className="w-full border rounded-md px-3 py-2 text-gray-900"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  Supported formats: MP4, WebM, MP3, WAV, etc.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 border border-gray-300 rounded-md py-2 hover:bg-gray-50 text-gray-900"
                  disabled={uploadingFile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white rounded-md py-2 hover:bg-gray-800 disabled:opacity-50"
                  disabled={uploadingFile}
                >
                  {uploadingFile ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
