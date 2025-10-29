import { useState } from 'react'

export default function TasksPanel({ meeting }) {
  const [status, setStatus] = useState({})

  if (!meeting) return (
    <div className="panel">
      <h3 className="panel-title">
        <span className="icon">📋</span> Tasks
      </h3>
      <p className="empty-msg">Select a meeting to view tasks</p>
      
      <style jsx>{`
        .panel {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 20px;
        }
        .panel-title {
          margin: 0 0 16px 0;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-dark);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .icon { font-size: 1.3rem; }
        .empty-msg {
          text-align: center;
          color: var(--text-light);
          padding: 20px;
          font-style: italic;
        }
      `}</style>
    </div>
  )

  const sendNotification = async (channel, to, text) => {
    setStatus((s) => ({ ...s, [`${channel}-${to}`]: 'sending' }))
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, to, message: text })
      })
      const json = await res.json()
      setStatus((s) => ({ ...s, [`${channel}-${to}`]: json.ok ? 'sent' : 'failed' }))
      setTimeout(() => {
        setStatus((s) => ({ ...s, [`${channel}-${to}`]: '' }))
      }, 2000)
    } catch (err) {
      setStatus((s) => ({ ...s, [`${channel}-${to}`]: 'failed' }))
    }
  }

  const completionRate = (() => {
    const total = meeting.tasks.length
    const done = meeting.tasks.filter(t => t.status === 'done').length
    return total === 0 ? 0 : Math.round((done / total) * 100)
  })()

  const getStatusColor = (status) => {
    switch(status) {
      case 'done': return '#4facfe';
      case 'in-progress': return '#f093fb';
      case 'todo': return '#ffa07a';
      default: return '#ccc';
    }
  }

  return (
    <div className="panel">
      <h3 className="panel-title">
        <span className="icon">📋</span> Tasks
      </h3>

      <div className="completion-bar">
        <div className="bar-label">Completion Rate</div>
        <div className="bar-container">
          <div className="bar-fill" style={{ width: `${completionRate}%` }}></div>
        </div>
        <div className="bar-value">{completionRate}%</div>
      </div>

      <ul className="task-list">
        {meeting.tasks.map((t) => (
          <li key={t.id} className="task-item">
            <div className="task-header">
              <div className="task-info">
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <span className="assignee">👤 {t.assignee}</span>
                  <span 
                    className="status-badge" 
                    style={{ background: getStatusColor(t.status) }}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="task-actions">
              <button 
                className="action-btn email"
                onClick={() => sendNotification('email', t.assignee, `Reminder: ${t.title}`)}
              >
                📧 Email
              </button>
              <button 
                className="action-btn slack"
                onClick={() => sendNotification('slack', t.assignee, `Slack: ${t.title}`)}
              >
                💬 Slack
              </button>
              <button 
                className="action-btn push"
                onClick={() => sendNotification('push', t.assignee, `Push: ${t.title}`)}
              >
                🔔 Push
              </button>
              {status[`email-${t.assignee}`] && (
                <div className="status-msg">{status[`email-${t.assignee}`]}</div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .panel {
          animation: fadeInUp 0.6s ease-out;
        }
        
        .panel-title {
          margin: 0 0 20px 0;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-dark);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .icon { font-size: 1.3rem; }
        
        .completion-bar {
          background: rgba(255, 255, 255, 0.5);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        
        .bar-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-light);
          margin-bottom: 8px;
        }
        
        .bar-container {
          height: 12px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-purple) 0%, var(--accent-pink) 100%);
          border-radius: 20px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .bar-value {
          text-align: right;
          font-weight: 700;
          font-size: 1.1rem;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-pink) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .task-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .task-item {
          background: rgba(255, 255, 255, 0.5);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }
        
        .task-item:hover {
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
          transform: translateY(-2px);
        }
        
        .task-header {
          margin-bottom: 12px;
        }
        
        .task-title {
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 8px;
          font-size: 0.95rem;
        }
        
        .task-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .assignee {
          font-size: 0.85rem;
          color: var(--text-light);
          font-weight: 500;
        }
        
        .status-badge {
          font-size: 0.75rem;
          color: white;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .task-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        
        .action-btn {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 6px 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(102, 126, 234, 0.1);
          color: var(--accent-purple);
        }
        
        .action-btn:hover {
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-pink) 100%);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .action-btn:active {
          transform: scale(0.95);
        }
        
        .status-msg {
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(79, 172, 254, 0.2);
          color: #4facfe;
          font-weight: 600;
          animation: fadeInUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
