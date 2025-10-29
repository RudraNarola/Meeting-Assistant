export default function AnalyticsPanel({ meetings = [] }) {
  const totalTasks = meetings.reduce((acc, m) => acc + (m.tasks?.length || 0), 0)
  const completed = meetings.reduce((acc, m) => acc + (m.tasks?.filter(t => t.status === 'done').length || 0), 0)
  const completionRate = totalTasks === 0 ? 0 : Math.round((completed / totalTasks) * 100)

  // Productivity: tasks completed per meeting-hour (simple mock metric)
  const totalMinutes = meetings.reduce((acc, m) => acc + (m.durationMinutes || 0), 0)
  const hours = totalMinutes / 60 || 1
  const productivity = Math.round((completed / hours) * 100) / 100

  return (
    <div className="panel">
      <h3 className="panel-title">
        <span className="icon">📊</span> Analytics
      </h3>
      
      <div className="stats-grid">
        <div className="stat-card gradient-1">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{completionRate}%</div>
            <div className="stat-label">Task Completion</div>
          </div>
        </div>

        <div className="stat-card gradient-2">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{productivity}</div>
            <div className="stat-label">Tasks / Hour</div>
          </div>
        </div>

        <div className="stat-card gradient-3">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{meetings.length}</div>
            <div className="stat-label">Total Meetings</div>
          </div>
        </div>

        <div className="stat-card gradient-4">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{completed}/{totalTasks}</div>
            <div className="stat-label">Tasks Done</div>
          </div>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-item">
          <span className="summary-label">Total Meeting Time</span>
          <span className="summary-value">{Math.round(hours * 10) / 10}h</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Avg Meeting Duration</span>
          <span className="summary-value">
            {meetings.length > 0 ? Math.round(totalMinutes / meetings.length) : 0}m
          </span>
        </div>
      </div>

      <style jsx>{`
        .panel {
          animation: fadeInUp 0.7s ease-out;
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
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: inherit;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
        }
        
        .stat-card:hover::before {
          opacity: 1;
        }
        
        .gradient-1 {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
        }
        
        .gradient-2 {
          background: linear-gradient(135deg, rgba(240, 147, 251, 0.2) 0%, rgba(245, 87, 108, 0.2) 100%);
        }
        
        .gradient-3 {
          background: linear-gradient(135deg, rgba(79, 172, 254, 0.2) 0%, rgba(0, 242, 254, 0.2) 100%);
        }
        
        .gradient-4 {
          background: linear-gradient(135deg, rgba(250, 208, 196, 0.3) 0%, rgba(255, 209, 255, 0.3) 100%);
        }
        
        .stat-icon {
          font-size: 2rem;
          z-index: 1;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        
        .stat-content {
          flex: 1;
          z-index: 1;
        }
        
        .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-dark);
          line-height: 1.2;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-light);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
        
        .summary-section {
          background: rgba(255, 255, 255, 0.5);
          padding: 16px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .summary-label {
          font-size: 0.85rem;
          color: var(--text-light);
          font-weight: 600;
        }
        
        .summary-value {
          font-size: 1.1rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-pink) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  )
}
