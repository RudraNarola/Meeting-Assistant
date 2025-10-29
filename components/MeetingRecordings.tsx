"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Recording {
  participantId: string;
  timestamp: string;
  fileName: string;
  publicUrl: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  storageType: string;
}

interface MeetingRecordingsProps {
  meetingId: string;
}

export default function MeetingRecordings({
  meetingId,
}: MeetingRecordingsProps) {
  const { data: session } = useSession();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session && meetingId) {
      fetchRecordings();
    }
  }, [session, meetingId]);

  const fetchRecordings = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/recordings`);
      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings);
      } else if (response.status === 404) {
        setError("Meeting not found");
      } else if (response.status === 403) {
        setError("You don't have access to view recordings for this meeting");
      } else {
        setError("Failed to load recordings");
      }
    } catch (error) {
      console.error("Error fetching recordings:", error);
      setError("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const downloadRecording = (publicUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = publicUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Meeting Recordings
        </h3>
        <div className="text-center py-4">
          <div className="text-gray-500">Loading recordings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Meeting Recordings
        </h3>
        <div className="text-center py-4">
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Meeting Recordings ({recordings.length})
      </h3>

      {recordings.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">🎙️ No recordings available</div>
          <div className="text-sm text-gray-400">
            Recordings will appear here after participants join and start
            recording
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {recordings.map((recording, index) => (
            <div
              key={`${recording.participantId}-${recording.timestamp}`}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      Participant {index + 1}
                    </div>
                    <span className="text-sm text-gray-600">
                      {recording.participantId}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">File Size:</span>{" "}
                      {formatFileSize(recording.fileSize)}
                    </div>
                    <div>
                      <span className="font-medium">Recorded:</span>{" "}
                      {formatTimestamp(recording.uploadedAt)}
                    </div>
                    <div>
                      <span className="font-medium">Storage:</span>
                      <span className="ml-1 bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                        {recording.storageType}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Format:</span> WebM Audio
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Audio Player */}
                  <audio controls className="h-8" preload="metadata">
                    <source src={recording.publicUrl} type="audio/webm" />
                    <source src={recording.publicUrl} type="audio/mp4" />
                    Your browser does not support the audio element.
                  </audio>

                  {/* Download Button */}
                  <button
                    onClick={() =>
                      downloadRecording(recording.publicUrl, recording.fileName)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    title="Download recording"
                  >
                    📥 Download
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              🚀 Ready for AI Processing
            </h4>
            <p className="text-sm text-blue-800">
              These multi-channel audio recordings are ready to be sent to your
              AI service for transcription, summary generation, and automatic
              task creation in Google Calendar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
