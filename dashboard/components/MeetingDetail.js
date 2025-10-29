export default function MeetingDetail({ meeting }) {
  if (!meeting) return null;
  return (
    <div className="detail-container">
      <div className="header-section">
        <h2 className="meeting-title">{meeting.title}</h2>
        <div className="meta-info">
          <span className="meta-item">
            🗓️ {new Date(meeting.date).toLocaleDateString('en-US', { 
              weekday: 'short',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          <span className="meta-item">
            ⏱️ {meeting.durationMinutes} minutes
          </span>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">
          <span className="icon">📝</span> Transcript
        </h3>
        <pre className="transcript">{meeting.transcript}</pre>
      </div>

      <div className="section">
        <h3 className="section-title">
          <span className="icon">⭐</span> Important Messages
        </h3>
        <ul className="messages-list">
          {meeting.importantMessages.map((m, i) => (
            <li key={i} className="message-item">
              <div className="message-header">
                <strong className="speaker">{m.speaker}</strong>
                <span className="timestamp">{m.time}</span>
              </div>
              <div className="message-text">{m.text}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h3 className="section-title">
          <span className="icon">✅</span> Action Items
        </h3>
        <ul className="action-list">
          {meeting.actionItems.map((a) => (
            <li key={a.id} className="action-item">
              <div className="action-text">{a.text}</div>
              <div className="action-due">Due: {a.due}</div>
            </li>
          ))}
        </ul>
      </div>

      <style jsx>{`
        .detail-container {
          animation: fadeInUp 0.5s ease-out;
        }
        
        .header-section {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }
        
        .meeting-title {
          margin: 0 0 16px 0;
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-pink) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .meta-info {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        
        .meta-item {
          font-size: 0.95rem;
          color: var(--text-light);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .section {
          margin-bottom: 32px;
        }
        
        .section-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-dark);
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .icon {
          font-size: 1.2rem;
        }
        
        .transcript {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(240, 147, 251, 0.05) 100%);
          padding: 20px;
          border-radius: 12px;
          white-space: pre-wrap;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 0.9rem;
          line-height: 1.7;
          color: var(--text-dark);
          border: 1px solid rgba(102, 126, 234, 0.15);
          overflow-x: auto;
        }
        
        .messages-list, .action-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .message-item {
          background: rgba(255, 255, 255, 0.5);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          border-left: 4px solid var(--accent-purple);
          transition: all 0.3s ease;
        }
        
        .message-item:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }
        
        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .speaker {
          color: var(--accent-purple);
          font-weight: 700;
          font-size: 0.95rem;
        }
        
        .timestamp {
          font-size: 0.85rem;
          color: var(--text-light);
          font-weight: 600;
          background: rgba(102, 126, 234, 0.1);
          padding: 2px 8px;
          border-radius: 6px;
        }
        
        .message-text {
          color: var(--text-dark);
          line-height: 1.6;
        }
        
        .action-item {
          background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          border-left: 4px solid #4facfe;
          transition: all 0.3s ease;
        }
        
        .action-item:hover {
          background: linear-gradient(135deg, rgba(79, 172, 254, 0.2) 0%, rgba(0, 242, 254, 0.2) 100%);
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(79, 172, 254, 0.2);
        }
        
        .action-text {
          color: var(--text-dark);
          font-weight: 600;
          margin-bottom: 8px;
          line-height: 1.5;
        }
        
        .action-due {
          font-size: 0.85rem;
          color: #4facfe;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
