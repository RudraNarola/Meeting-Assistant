export default function UpcomingMeetings({ meetings = [] }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'scheduled': return '#4facfe';
      case 'in-progress': return '#f093fb';
      case 'completed': return '#00f2fe';
      default: return '#ccc';
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Sort by date (earliest first)
  const sortedMeetings = [...meetings].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  )

  return (
    <div className="upcoming-container">
      <h3 className="section-title">
        <span className="icon">🗓️</span> Upcoming Meetings
      </h3>

      {sortedMeetings.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>No upcoming meetings scheduled</p>
        </div>
      ) : (
        <div className="meetings-grid">
          {sortedMeetings.map((meeting, index) => (
            <div 
              key={meeting.id} 
              className="meeting-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="card-header">
                <div className="meeting-icon">📊</div>
                <span 
                  className="status-badge"
                  style={{ background: getStatusColor(meeting.status) }}
                >
                  {meeting.status}
                </span>
              </div>

              <h4 className="meeting-title">{meeting.title}</h4>

              <div className="meeting-info">
                <div className="info-row">
                  <span className="info-icon">📅</span>
                  <span className="info-text">{formatDate(meeting.date)}</span>
                </div>
                
                <div className="info-row">
                  <span className="info-icon">⏰</span>
                  <span className="info-text">{formatTime(meeting.date)}</span>
                </div>

                <div className="info-row">
                  <span className="info-icon">⏱️</span>
                  <span className="info-text">{meeting.durationMinutes} min</span>
                </div>

                {meeting.location && (
                  <div className="info-row">
                    <span className="info-icon">📍</span>
                    <span className="info-text">{meeting.location}</span>
                  </div>
                )}
              </div>

              <div className="participants">
                <span className="participants-label">👥 Participants:</span>
                <div className="participants-list">
                  {meeting.participants.map((p, i) => (
                    <span key={i} className="participant-badge">{p}</span>
                  ))}
                </div>
              </div>

              {meeting.agenda && meeting.agenda.length > 0 && (
                <div className="agenda">
                  <span className="agenda-label">📋 Agenda:</span>
                  <ul className="agenda-list">
                    {meeting.agenda.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="join-btn">
                🎯 Join Meeting
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .upcoming-container {
          animation: fadeInUp 0.6s ease-out;
        }

        .section-title {
          margin: 0 0 24px 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-dark);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon {
          font-size: 1.5rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px;
          color: var(--text-light);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .meetings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .meeting-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.5s ease-out both;
        }

        .meeting-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-hover);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .meeting-icon {
          font-size: 2rem;
        }

        .status-badge {
          font-size: 0.7rem;
          color: white;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .meeting-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-dark);
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .meeting-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }

        .info-icon {
          font-size: 1rem;
        }

        .info-text {
          color: var(--text-light);
          font-weight: 500;
        }

        .participants {
          margin-bottom: 16px;
        }

        .participants-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-light);
          display: block;
          margin-bottom: 8px;
        }

        .participants-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .participant-badge {
          background: rgba(102, 126, 234, 0.15);
          color: var(--accent-purple);
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .agenda {
          margin-bottom: 16px;
        }

        .agenda-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-light);
          display: block;
          margin-bottom: 8px;
        }

        .agenda-list {
          margin: 0;
          padding-left: 20px;
          color: var(--text-dark);
          font-size: 0.85rem;
        }

        .agenda-list li {
          margin-bottom: 4px;
        }

        .join-btn {
          width: 100%;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-pink) 100%);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .join-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .join-btn:active {
          transform: scale(0.98);
        }

        @media (max-width: 768px) {
          .meetings-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
