import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

import MeetingList from "../components/MeetingList";
import MeetingDetail from "../components/MeetingDetail";
import TasksPanel from "../components/TasksPanel";
import AnalyticsPanel from "../components/AnalyticsPanel";
import UpcomingMeetings from "../components/UpcomingMeetings";

export default function Home() {
  const [meetings, setMeetings] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Lightweight mock data for unauthenticated visitors so the dashboard looks populated
  const MOCK_MEETINGS = [
    {
      id: "m-1",
      title: "Product Sync - Mock",
      date: "2025-10-30T10:00:00Z",
      durationMinutes: 30,
      attendees: ["alice@example.com", "bob@example.com"],
      participants: ["alice@example.com", "bob@example.com"],
      transcript:
        "Alice: Quick sync on product status.\nBob: All good, will deliver the changes by EOD.",
      importantMessages: [
        {
          speaker: "Alice",
          time: "10:02",
          text: "We need the API changes by Friday.",
        },
        { speaker: "Bob", time: "10:10", text: "I will update the PR." },
      ],
      actionItems: [
        { id: "a1", text: "Update API contract", due: "2025-10-31" },
      ],
      tasks: [
        {
          id: "t1",
          title: "Update API contract",
          assignee: "alice@example.com",
          status: "in-progress",
        },
        {
          id: "t2",
          title: "Publish release notes",
          assignee: "bob@example.com",
          status: "todo",
        },
      ],
      notes: "This is mock data shown when not logged in.",
    },
    {
      id: "m-2",
      title: "Design Review - Mock",
      date: "2025-11-02T14:00:00Z",
      durationMinutes: 45,
      attendees: ["carol@example.com"],
      participants: ["carol@example.com"],
      transcript:
        "Carol: Reviewing the new UI mockups.\nDesigner: Updated with feedback.",
      importantMessages: [
        {
          speaker: "Carol",
          time: "14:05",
          text: "The color palette needs tweaking.",
        },
      ],
      actionItems: [
        { id: "a2", text: "Tweak color palette", due: "2025-11-05" },
      ],
      tasks: [
        {
          id: "t3",
          title: "Adjust colors",
          assignee: "carol@example.com",
          status: "todo",
        },
      ],
      notes: "Discuss mockups and feedback.",
    },
  ];

  useEffect(() => {
    // previously redirected to /login when unauthenticated
    // keep on the dashboard even when not authenticated so the app
    // doesn't land on a missing /login or /register page (those were removed)
    // we won't fetch protected data unless `user` exists
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await fetch("/api/meetings");
      const json = await res.json();
      setMeetings(json.meetings || []);
      setUpcomingMeetings(json.upcomingMeetings || []);
      setSelected((json.meetings && json.meetings[0]) || null);
      setLoading(false);
    }

    if (user) {
      fetchData();
    } else {
      // when unauthenticated, show mock meetings so the UI is visible
      setMeetings(MOCK_MEETINGS);
      setUpcomingMeetings(MOCK_MEETINGS.slice(0, 1));
      setSelected(MOCK_MEETINGS[0] || null);
      setLoading(false);
    }
  }, [user]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--bg-gradient);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            color: white;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Allow rendering for unauthenticated users (public view).
  // Protected data will only load when `user` is present.

  return (
    <>
      {/* Hide the Navbar when a local token exists or when a user is present
          from AuthContext. This ensures that when users authenticate via the
          backend-hosted pages (which store the JWT in localStorage and
          redirect back), the dashboard won't show guest navigation or the
          "Login / Register" buttons. */}{" "}
      {/* Navbar and unauthenticated banner removed per user request */}
      <div className="container">
        <header>
          <h1>
            <span className="icon">✨</span> Meeting Assistant
          </h1>
          <p className="subtitle">Your AI-powered meeting companion</p>
        </header>

        <main>
          <section className="left">
            <div className="section-header">
              <h2>📅 Meetings</h2>
            </div>
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading meetings…</p>
              </div>
            ) : (
              <MeetingList
                meetings={meetings}
                onSelect={setSelected}
                selectedId={selected?.id}
              />
            )}
          </section>

          <section className="center">
            {selected ? (
              <MeetingDetail meeting={selected} />
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>Select a meeting to view details</p>
              </div>
            )}
          </section>

          <section className="right">
            <TasksPanel meeting={selected} />
            <AnalyticsPanel meetings={meetings} />
          </section>
        </main>

        {/* Upcoming Meetings Section */}
        <section className="upcoming-section">
          <UpcomingMeetings meetings={upcomingMeetings} />
        </section>

        <style jsx>{`
          .unauth-banner {
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.06),
              rgba(255, 255, 255, 0.02)
            );
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 10px 20px;
            margin: 16px auto;
            max-width: 1400px;
            border-radius: 10px;
            color: rgba(255, 255, 255, 0.95);
            text-align: center;
          }

          .unauth-banner .link {
            margin: 0 8px;
            color: #fff;
            font-weight: 700;
            text-decoration: underline;
          }

          .container {
            min-height: 100vh;
            padding: 32px;
            animation: fadeInUp 0.6s ease-out;
          }

          header {
            text-align: center;
            margin-bottom: 40px;
            animation: fadeInUp 0.8s ease-out;
          }

          header h1 {
            margin: 0;
            font-size: 3rem;
            font-weight: 800;
            background: linear-gradient(
              135deg,
              #fff 0%,
              rgba(255, 255, 255, 0.8) 100%
            );
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 4px 20px rgba(255, 255, 255, 0.3);
            letter-spacing: -1px;
          }

          .icon {
            display: inline-block;
            animation: pulse 2s ease-in-out infinite;
          }

          .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.1rem;
            margin: 8px 0 0 0;
            font-weight: 300;
          }

          main {
            display: grid;
            grid-template-columns: 300px 1fr 360px;
            gap: 24px;
            animation: fadeInUp 1s ease-out;
          }

          section {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 24px;
            box-shadow: var(--shadow-soft);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          section:hover {
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
          }

          .section-header h2 {
            margin: 0 0 16px 0;
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--text-dark);
          }

          .left {
            max-height: 80vh;
            overflow-y: auto;
            overflow-x: hidden;
          }

          .center {
            max-height: 80vh;
            overflow-y: auto;
          }

          .right {
            display: flex;
            flex-direction: column;
            gap: 20px;
            max-height: 80vh;
            overflow-y: auto;
          }

          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: var(--text-light);
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(102, 126, 234, 0.1);
            border-top-color: var(--accent-purple);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: var(--text-light);
          }

          .empty-icon {
            font-size: 4rem;
            margin-bottom: 16px;
            opacity: 0.6;
          }

          @media (max-width: 1200px) {
            main {
              grid-template-columns: 1fr;
              gap: 20px;
            }

            .left,
            .center,
            .right {
              max-height: none;
            }
          }

          .upcoming-section {
            margin-top: 40px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 32px;
            box-shadow: var(--shadow-soft);
          }
        `}</style>
      </div>
    </>
  );
}
