"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Recording {
  id: string;
  title: string;
  fileName: string;
  publicUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export default function RecordingsPage() {
  const { data: session } = useSession();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchRecordings();
    }
  }, [session]);

  const fetchRecordings = async () => {
    try {
      const response = await fetch("/api/recordings/list");
      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings || []);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (loading) {
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
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <span className="text-sm text-gray-600">
                {session.user?.name}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            My Recordings
          </h1>
          <Link
            href="/dashboard"
            className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            Back to Dashboard
          </Link>
        </div>

        {recordings.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-gray-600 mb-4">No recordings yet</p>
            <Link
              href="/dashboard"
              className="bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800 inline-block"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="bg-white rounded-lg border p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {recording.title}
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-500 mb-4">
                      <span>
                        📅 {new Date(recording.uploadedAt).toLocaleDateString()}
                      </span>
                      <span>📦 {formatFileSize(recording.fileSize)}</span>
                      <span>
                        {recording.fileType.startsWith("video")
                          ? "🎥 Video"
                          : "🎵 Audio"}
                      </span>
                    </div>

                    {/* Media Player */}
                    {recording.fileType.startsWith("video") ? (
                      <video
                        controls
                        className="w-full max-w-2xl rounded-md"
                        src={recording.publicUrl}
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <audio
                        controls
                        className="w-full max-w-2xl"
                        src={recording.publicUrl}
                      >
                        Your browser does not support the audio tag.
                      </audio>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href={recording.publicUrl}
                      download={recording.fileName}
                      className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border rounded text-center"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
