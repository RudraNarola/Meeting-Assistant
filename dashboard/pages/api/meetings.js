export default function handler(req, res) {
  // Mock meeting data — later to be replaced with real transcript and metadata
  const meetings = [
    {
      id: 'm1',
      title: 'Sprint Planning — Team Alpha',
      date: '2025-10-20T09:00:00Z',
      durationMinutes: 60,
      status: 'completed',
      participants: ['Alice', 'Bob', 'Carol'],
      transcript: `Alice: Welcome everyone. Today we'll plan the next sprint.\nBob: I have two backend tasks and one bug to fix.\nCarol: I can take the UI task and help with testing.\nAlice: Action: Bob to create ticket for API rate-limit.\nBob: I'll create it today.\nCarol: Action: Carol to prototype new dashboard widget by Friday.\nAlice: Great, we will review on next stand-up.`,
      importantMessages: [
        { time: '00:12', speaker: 'Alice', text: 'Action: Bob to create ticket for API rate-limit.' },
        { time: '00:23', speaker: 'Carol', text: 'Action: Carol to prototype new dashboard widget by Friday.' }
      ],
      tasks: [
        { id: 't1', title: 'Create ticket: API rate-limit', assignee: 'Bob', status: 'todo' },
        { id: 't2', title: 'Prototype dashboard widget', assignee: 'Carol', status: 'in-progress' },
        { id: 't3', title: 'Regression test for login', assignee: 'Alice', status: 'done' }
      ],
      actionItems: [
        { id: 'a1', text: 'Bob: create ticket for API rate-limit', assignedTo: 'Bob', due: '2025-10-22' },
        { id: 'a2', text: 'Carol: prototype dashboard widget', assignedTo: 'Carol', due: '2025-10-24' }
      ]
    },
    {
      id: 'm2',
      title: 'Retrospective — Q3',
      date: '2025-10-06T15:00:00Z',
      durationMinutes: 45,
      status: 'completed',
      participants: ['Alice', 'Bob', 'Dan'],
      transcript: `Dan: We had a good quarter but CI flaked a few times.\nAlice: Let's add more stable test infra.\nBob: Action: Bob to draft CI improvements doc.`,
      importantMessages: [
        { time: '00:15', speaker: 'Bob', text: 'Action: Bob to draft CI improvements doc.' }
      ],
      tasks: [
        { id: 't4', title: 'Draft CI improvements doc', assignee: 'Bob', status: 'todo' },
        { id: 't5', title: 'Schedule infra investment', assignee: 'Alice', status: 'done' }
      ],
      actionItems: [
        { id: 'a3', text: 'Bob: draft CI improvements doc', assignedTo: 'Bob', due: '2025-10-15' }
      ]
    }
  ]

  // Upcoming meetings (future dates)
  const upcomingMeetings = [
    {
      id: 'u1',
      title: 'Product Roadmap Review — Q4',
      date: '2025-10-30T14:00:00Z',
      durationMinutes: 90,
      status: 'scheduled',
      participants: ['Alice', 'Bob', 'Carol', 'Dan', 'Eve'],
      location: 'Conference Room A',
      agenda: ['Review Q3 achievements', 'Plan Q4 features', 'Resource allocation', 'Timeline discussion']
    },
    {
      id: 'u2',
      title: 'Client Demo — Feature Showcase',
      date: '2025-11-02T10:00:00Z',
      durationMinutes: 60,
      status: 'scheduled',
      participants: ['Alice', 'Bob', 'Client Team'],
      location: 'Zoom (Virtual)',
      agenda: ['New dashboard features', 'Analytics improvements', 'Q&A session']
    },
    {
      id: 'u3',
      title: 'Team Standup',
      date: '2025-10-29T09:30:00Z',
      durationMinutes: 15,
      status: 'scheduled',
      participants: ['Alice', 'Bob', 'Carol'],
      location: 'Virtual',
      agenda: ['Daily updates', 'Blockers', 'Quick sync']
    },
    {
      id: 'u4',
      title: 'Architecture Design Review',
      date: '2025-11-05T15:00:00Z',
      durationMinutes: 120,
      status: 'scheduled',
      participants: ['Bob', 'Dan', 'Tech Leads'],
      location: 'Engineering Room',
      agenda: ['Microservices migration plan', 'Database scaling strategy', 'API versioning']
    }
  ]

  res.status(200).json({ meetings, upcomingMeetings })
}
