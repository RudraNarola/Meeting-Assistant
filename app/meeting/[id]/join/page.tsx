"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Room,
  DisconnectReason,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
  Participant,
  RoomEvent,
  TrackPublication,
} from "livekit-client";
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useRoomContext,
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

// Room Manager Component to handle recording logic
interface RoomManagerProps {
  meetingId: string;
  meetingTitle?: string;
  onRecordingStatusChange: (
    status: "idle" | "starting" | "recording" | "stopping"
  ) => void;
  onRecordingStateChange: (isRecording: boolean) => void;
}

function RoomManager({
  meetingId,
  meetingTitle,
  onRecordingStatusChange,
  onRecordingStateChange,
}: RoomManagerProps) {
  const room = useRoomContext();
  const [participantAudioStreams, setParticipantAudioStreams] = useState<
    Map<string, MediaStream>
  >(new Map());
  const [mediaRecorders, setMediaRecorders] = useState<
    Map<string, MediaRecorder>
  >(new Map());
  const [isRecording, setIsRecording] = useState(false);

  // Store all audio chunks from all participants
  const [allAudioChunks, setAllAudioChunks] = useState<Map<string, Blob[]>>(
    new Map()
  );

  console.log("🎯 RoomManager mounted/updated:", {
    meetingId,
    meetingTitle,
    roomState: room?.state,
    hasRoom: !!room,
    isRecording,
    participantCount: allAudioChunks.size,
  });

  // Helper function to save audio files to server's public/recordings/ directory
  const saveAudioToServer = async (
    audioFiles: Array<{ blob: Blob; filename: string }>
  ) => {
    try {
      console.log(`💾 Saving ${audioFiles.length} audio files to server...`);

      const formData = new FormData();

      // Add all audio files
      audioFiles.forEach(({ blob, filename }) => {
        formData.append("audio", blob, filename);
      });

      // Add meeting metadata
      formData.append("meetingId", meetingId);

      const response = await fetch("/api/recordings/save-local", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Audio files saved to server:", result);
        return result;
      } else {
        const errorText = await response.text().catch(() => "No error text");
        console.error(
          "❌ Failed to save audio to server:",
          response.status,
          errorText
        );
        return null;
      }
    } catch (error) {
      console.error("❌ Error saving audio to server:", error);
      return null;
    }
  };

  // Helper function to upload all aggregated audio at the end of meeting
  const uploadAllAudio = async () => {
    if (allAudioChunks.size === 0) {
      console.warn("⚠️ No audio chunks to upload");
      return;
    }

    console.log(
      `🚀 Processing aggregated audio for ${allAudioChunks.size} participants...`
    );

    try {
      const formData = new FormData();
      let totalSize = 0;
      const audioFilesToSave: Array<{ blob: Blob; filename: string }> = [];

      // Prepare all audio files
      console.log("� Preparing audio files...");
      const participants = Array.from(allAudioChunks.entries());

      for (const [participantId, chunks] of participants) {
        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, {
            type: "audio/webm;codecs=opus",
          });

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const filename = `${participantId}_${timestamp}.webm`;

          // Add to list for server-side save
          audioFilesToSave.push({ blob: audioBlob, filename });

          // Also add to FormData for backend upload
          formData.append("audio", audioBlob, filename);
          totalSize += audioBlob.size;

          console.log(
            `📦 Prepared ${participantId}: ${audioBlob.size} bytes (${chunks.length} chunks)`
          );
        }
      }

      // First, save to server's public/recordings/ directory
      console.log(
        `💾 Saving ${audioFilesToSave.length} files to ./public/recordings/${meetingId}/...`
      );
      await saveAudioToServer(audioFilesToSave);

      // Add meeting metadata
      formData.append("title", meetingTitle || `Meeting ${meetingId}`);
      formData.append(
        "description",
        `Recorded audio from meeting "${meetingTitle || meetingId}" with ${
          allAudioChunks.size
        } participant(s)`
      );
      formData.append("platform", "google-meet");
      formData.append("meetingId", meetingId);
      formData.append("participantCount", allAudioChunks.size.toString());

      console.log(`📋 Upload summary:`, {
        totalParticipants: allAudioChunks.size,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        title: meetingTitle || `Meeting ${meetingId}`,
        savedToServer: `./public/recordings/${meetingId}/`,
        endpoint: "http://localhost:8080/api/v1/audio/upload",
      });

      console.log("📤 Uploading to backend API...");
      const response = await fetch(
        "http://localhost:8080/api/v1/audio/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      console.log(
        `📡 Response status: ${response.status} ${response.statusText}`
      );

      if (response.ok) {
        const result = await response.json();
        console.log(
          "✅ All audio saved to server and uploaded to backend successfully:",
          result
        );
      } else {
        const errorText = await response.text().catch(() => "No error text");
        console.error(
          "❌ Failed to upload to backend (but files are saved on server):",
          response.status,
          response.statusText,
          errorText
        );
      }
    } catch (error) {
      console.error("❌ Error uploading aggregated audio:", error);
    }
  };

  const startRecordingForParticipant = (
    participantId: string,
    audioStream: MediaStream
  ) => {
    try {
      console.log(`🎙️ Starting recording for participant: ${participantId}`);

      const options: MediaRecorderOptions = {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000,
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options.mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/wav")) {
          options.mimeType = "audio/wav";
        } else {
          delete options.mimeType;
        }
      }

      console.log(`📼 Using MIME type: ${options.mimeType}`);

      const mediaRecorder = new MediaRecorder(audioStream, options);

      // Initialize chunk storage for this participant
      setAllAudioChunks((prev) => {
        const newMap = new Map(prev);
        newMap.set(participantId, []);
        return newMap;
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(
            `📦 Audio chunk received: ${event.data.size} bytes for ${participantId}`
          );

          // Store chunk in the aggregated storage
          setAllAudioChunks((prev) => {
            const newMap = new Map(prev);
            const existingChunks = newMap.get(participantId) || [];
            newMap.set(participantId, [...existingChunks, event.data]);
            return newMap;
          });
        }
      };

      mediaRecorder.onstop = () => {
        console.log(`⏹️ Recording stopped for ${participantId}`);

        // Log final chunk count using the current state
        setAllAudioChunks((prev) => {
          const participantChunks = prev.get(participantId);
          if (participantChunks) {
            const totalSize = participantChunks.reduce(
              (sum, chunk) => sum + chunk.size,
              0
            );
            console.log(
              `💾 Stored ${participantChunks.length} chunks (${totalSize} bytes) for ${participantId}`
            );
          }
          return prev; // Don't modify, just log
        });
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      mediaRecorder.start(1000);
      console.log(`✅ MediaRecorder started for ${participantId}`);

      setMediaRecorders((prev) => {
        const newMap = new Map(prev);
        newMap.set(participantId, mediaRecorder);
        return newMap;
      });
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecordingForParticipant = (participantId: string) => {
    console.log(`🛑 Stopping recording for participant: ${participantId}`);
    const recorder = mediaRecorders.get(participantId);
    if (recorder && recorder.state === "recording") {
      console.log(`⏸️ Stopping MediaRecorder for ${participantId}`);
      recorder.stop();
    } else {
      console.warn(
        `⚠️ MediaRecorder not found or not recording for ${participantId}. State: ${recorder?.state}`
      );
    }

    setParticipantAudioStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(participantId);
      return newMap;
    });

    setMediaRecorders((prev) => {
      const newMap = new Map(prev);
      newMap.delete(participantId);
      return newMap;
    });
  };

  const handleTrackSubscribed = (
    track: RemoteTrack | Track,
    publication: TrackPublication,
    participant: Participant
  ) => {
    if (track.kind === Track.Kind.Audio) {
      const mediaStreamTrack = track.mediaStreamTrack;
      if (mediaStreamTrack) {
        const audioStream = new MediaStream([mediaStreamTrack]);

        setParticipantAudioStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(participant.identity, audioStream);
          return newMap;
        });

        startRecordingForParticipant(participant.identity, audioStream);
      }
    }
  };

  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant: Participant) => {
      participant.trackPublications.forEach((publication: TrackPublication) => {
        if (publication.kind === Track.Kind.Audio && publication.track) {
          handleTrackSubscribed(publication.track, publication, participant);
        }
      });

      participant.on(
        "trackSubscribed",
        (track: RemoteTrack, publication: RemoteTrackPublication) => {
          handleTrackSubscribed(track, publication, participant);
        }
      );
    };

    const handleParticipantDisconnected = (participant: Participant) => {
      stopRecordingForParticipant(participant.identity);
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: Participant
      ) => {
        handleTrackSubscribed(track, publication, participant);
      }
    );

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(
        RoomEvent.ParticipantDisconnected,
        handleParticipantDisconnected
      );
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    };
  }, [room, isRecording, meetingId, mediaRecorders]);

  // Auto-start recording when room is connected
  useEffect(() => {
    if (!room) return;

    const autoStartRecording = async () => {
      if (isRecording) return;

      console.log(`🎬 Auto-starting recording for meeting: ${meetingId}`);
      onRecordingStatusChange("starting");
      setIsRecording(true);
      onRecordingStateChange(true);

      // Wait for tracks to be ready
      setTimeout(() => {
        // Handle local participant
        const localParticipant = room.localParticipant;
        console.log(`👤 Local participant: ${localParticipant.identity}`);
        localParticipant?.trackPublications.forEach((publication) => {
          if (publication.kind === Track.Kind.Audio && publication.track) {
            console.log(
              `🎤 Starting recording for local participant audio track`
            );
            handleTrackSubscribed(
              publication.track,
              publication,
              localParticipant
            );
          }
        });

        // Handle remote participants
        console.log(
          `👥 Remote participants count: ${room.remoteParticipants.size}`
        );
        room.remoteParticipants.forEach((participant) => {
          console.log(`👤 Remote participant: ${participant.identity}`);
          participant.trackPublications.forEach((publication) => {
            if (publication.kind === Track.Kind.Audio && publication.track) {
              console.log(
                `🎤 Starting recording for remote participant audio track`
              );
              handleTrackSubscribed(
                publication.track,
                publication,
                participant
              );
            }
          });
        });

        onRecordingStatusChange("recording");
        console.log(`✅ Recording started successfully`);
      }, 1000);
    };

    // Start recording when room becomes connected
    if (room.state === "connected" && !isRecording) {
      autoStartRecording();
    }

    // Listen for room connection events
    const handleRoomConnected = () => {
      if (!isRecording) {
        autoStartRecording();
      }
    };

    // Auto-stop recording when leaving room
    const handleDisconnected = async () => {
      console.log(`🚪 Room disconnected. IsRecording: ${isRecording}`);
      if (isRecording) {
        onRecordingStatusChange("stopping");

        console.log(`📊 Total active recorders: ${mediaRecorders.size}`);

        // Stop all recorders first
        mediaRecorders.forEach((recorder, participantId) => {
          console.log(
            `🛑 Stopping recorder for ${participantId}, state: ${recorder.state}`
          );
          stopRecordingForParticipant(participantId);
        });

        // Wait a bit for all recorders to finish stopping
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Upload all aggregated audio
        console.log(`📤 Starting aggregated upload...`);
        await uploadAllAudio();

        setIsRecording(false);
        onRecordingStateChange(false);
        onRecordingStatusChange("idle");
      }
    };

    room.on("connected", handleRoomConnected);
    room.on("disconnected", handleDisconnected);

    return () => {
      room.off("connected", handleRoomConnected);
      room.off("disconnected", handleDisconnected);
    };
  }, [
    room,
    isRecording,
    onRecordingStatusChange,
    onRecordingStateChange,
    mediaRecorders,
    allAudioChunks,
    uploadAllAudio,
  ]);

  return null;
}

export default function JoinMeeting({ params }: JoinMeetingPageProps) {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState<string>("");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // Recording state managed by RoomManager
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "starting" | "recording" | "stopping"
  >("idle");

  useEffect(() => {
    params.then(({ id }) => {
      setMeetingId(id);
    });
  }, [params]);

  useEffect(() => {
    if (meetingId) {
      fetchMeeting();
    }
  }, [meetingId]);

  const fetchMeeting = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`);
      if (response.ok) {
        const data = await response.json();
        setMeeting(data.meeting);
      } else {
        // Temporarily allow access to any meeting - create a mock meeting
        setMeeting({
          id: meetingId,
          title: "Meeting Room",
          description: "Open meeting room",
          scheduledAt: new Date().toISOString(),
          duration: 60,
          status: "live",
          joinUrl: window.location.href,
          hostId: "system",
          roomName: `room-${meetingId}`,
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      // Fallback to mock meeting
      setMeeting({
        id: meetingId,
        title: "Meeting Room",
        description: "Open meeting room",
        scheduledAt: new Date().toISOString(),
        duration: 60,
        status: "live",
        joinUrl: window.location.href,
        hostId: "system",
        roomName: `room-${meetingId}`,
      });
      setLoading(false);
    }
  };

  const joinMeeting = async () => {
    if (!meeting) return;

    setIsJoining(true);
    setError(""); // Clear any previous errors

    try {
      // Generate unique participant info
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const participantName = `User-${randomId}`;
      const participantEmail = `user-${randomId}-${timestamp}@example.com`;

      console.log("Joining meeting with:", {
        roomName: meeting.roomName,
        participantName,
        participantEmail,
        currentHost: window.location.host,
        userAgent: navigator.userAgent.substring(0, 50),
      });

      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: meeting.roomName,
          participantName: participantName,
          participantEmail: participantEmail,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Token received successfully:", { hasToken: !!data.token });
        setToken(data.token);
        setHasJoined(true);
      } else {
        const errorData = await response.json();
        console.error("Token request failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        setError(
          `Failed to join meeting: ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error joining meeting:", error);
      setError(
        `Failed to join meeting: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
    setIsJoining(false);
  };

  const leaveMeeting = () => {
    setHasJoined(false);
    setToken("");
  };

  const handleDisconnected = (reason?: DisconnectReason) => {
    console.log("LiveKit disconnected:", reason);
    setHasJoined(false);
    setToken("");
    if (reason) {
      const reasonText =
        typeof reason === "string" ? reason : reason.toString();
      setError(`Connection lost: ${reasonText}`);
    }
  };

  const handleError = (error: Error) => {
    console.error("LiveKit error:", {
      message: error.message,
      stack: error.stack,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
    });
    setError(`Meeting error: ${error.message}`);
    setHasJoined(false);
    setToken("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Temporarily removed session check
  // if (!session) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="text-center">
  //         <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
  //         <p className="text-gray-600 mb-6">
  //           Please sign in with Google to join this meeting.
  //         </p>
  //         <Link
  //           href="/"
  //           className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
  //         >
  //           Go to Homepage
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link href="/" className="text-xl font-semibold text-gray-900">
                Meeting Platform
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
              {error || "The meeting you're looking for doesn't exist."}
            </p>
            <Link
              href="/dashboard"
              className="bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800"
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

    if (!serverUrl) {
      console.error("NEXT_PUBLIC_LIVEKIT_WS_URL is not configured");
      setError("LiveKit server URL not configured");
      setHasJoined(false);
      setToken("");
      return null;
    }

    console.log("🎥 Rendering LiveKit Room:", {
      serverUrl,
      hasToken: !!token,
      tokenLength: token.length,
      meetingId,
      meetingTitle: meeting?.title,
      currentHost: window.location.host,
      isLocalhost: window.location.hostname === "localhost",
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
          options={{
            // Add connection options for better reliability
            autoPlayAudio: true,
            autoPlayVideo: true,
            publishOnConnect: true,
          }}
        >
          {/* Recording Status Indicator */}
          <div className="absolute top-4 right-4 z-50 flex items-center space-x-4">
            <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2 text-white text-sm">
              <span
                className={`font-semibold ${
                  recordingStatus === "recording"
                    ? "text-red-400"
                    : recordingStatus === "starting"
                    ? "text-yellow-400"
                    : recordingStatus === "stopping"
                    ? "text-orange-400"
                    : "text-gray-400"
                }`}
              >
                {recordingStatus === "recording"
                  ? "🔴 Recording Audio"
                  : recordingStatus === "starting"
                  ? "⏳ Starting Recording..."
                  : recordingStatus === "stopping"
                  ? "⏹️ Stopping Recording..."
                  : "⚪ Recording Standby"}
              </span>
            </div>
          </div>

          <RoomManager
            meetingId={meetingId}
            meetingTitle={meeting?.title}
            onRecordingStatusChange={setRecordingStatus}
            onRecordingStateChange={setIsRecording}
          />
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
                <p className="font-medium text-black">
                  {new Date(meeting.scheduledAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Time:</span>
                <p className="font-medium text-black">
                  {new Date(meeting.scheduledAt).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <p className="font-medium text-black">
                  {meeting.duration} minutes
                </p>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Status:</span>
                <span
                  className={`inline-block px-2 py-1 w-1/2 mx-auto rounded-full text-xs font-medium ${
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
              <button
                onClick={joinMeeting}
                disabled={isJoining}
                className="bg-gray-900 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
