"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Meeting Platform
            </h1>

            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <span className="text-sm text-gray-600">
                    {session.user?.name}
                  </span>
                  <Link
                    href="/dashboard"
                    className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signIn("google")}
                  className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
                >
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center space-y-8">
          <h2 className="text-5xl font-bold text-gray-900">
            Video Meetings Made Simple
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create meetings, invite participants, and record sessions locally.
            No complications, just meetings.
          </p>

          {session ? (
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard"
                className="bg-gray-900 text-white px-8 py-3 rounded-md text-lg hover:bg-gray-800"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="bg-gray-900 text-white px-8 py-3 rounded-md text-lg hover:bg-gray-800"
            >
              Get Started
            </button>
          )}
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-3xl mb-3">🎥</div>
            <h3 className="text-lg font-semibold mb-2">Video Meetings</h3>
            <p className="text-gray-600 text-sm">
              High-quality video and audio for your meetings
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">📹</div>
            <h3 className="text-lg font-semibold mb-2">Local Recording</h3>
            <p className="text-gray-600 text-sm">
              Record meetings and store them locally
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold mb-2">Easy Sharing</h3>
            <p className="text-gray-600 text-sm">
              Share meeting links instantly with anyone
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
