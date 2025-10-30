"use client";

import { useState } from "react";

export default function TestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results: any = {};

    try {
      // Test 1: Check API connectivity
      console.log("Testing API connectivity...");
      const debugResponse = await fetch("/api/debug");
      if (debugResponse.ok) {
        results.apiConnectivity = await debugResponse.json();
      } else {
        results.apiConnectivity = { error: "Failed to connect to debug API" };
      }

      // Test 2: Test LiveKit token generation
      console.log("Testing LiveKit token generation...");
      const tokenResponse = await fetch("/api/livekit/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: "test-room",
          participantName: "Test User",
          participantEmail: "test@example.com",
        }),
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        results.tokenGeneration = {
          success: true,
          hasToken: !!tokenData.token,
          tokenLength: tokenData.token?.length || 0,
          wsUrl: tokenData.wsUrl,
        };
      } else {
        const errorData = await tokenResponse.json();
        results.tokenGeneration = { error: errorData };
      }

      // Test 3: Check browser capabilities
      console.log("Testing browser capabilities...");
      results.browserCapabilities = {
        hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
        hasWebRTC: !!window.RTCPeerConnection,
        userAgent: navigator.userAgent,
        currentHost: window.location.host,
        protocol: window.location.protocol,
      };

      // Test 4: Test media permissions (simplified)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        results.mediaPermissions = {
          success: true,
          hasAudio: stream.getAudioTracks().length > 0,
          hasVideo: stream.getVideoTracks().length > 0,
        };
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaError: any) {
        results.mediaPermissions = {
          error: mediaError.message || "Media access denied",
        };
      }
    } catch (error: any) {
      results.generalError = error.message;
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          LiveKit Connection Test
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={runTests}
            disabled={testing}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? "Running Tests..." : "Run Connection Tests"}
          </button>
        </div>

        {testResults && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>
              • Run this test on both machines (yours and the other person's)
            </li>
            <li>• Compare the results to identify differences</li>
            <li>• Make sure media permissions are granted</li>
            <li>• Check that API connectivity works from both machines</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
