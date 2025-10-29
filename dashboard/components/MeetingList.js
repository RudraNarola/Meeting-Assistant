export default function MeetingList({ meetings = [], onSelect, selectedId }) {
  return (
    <div>
      {meetings.length === 0 && (
        <p className="empty">No meetings yet</p>
      )}
      <ul className="mlist">
        {meetings.map((m, index) => (
          <li
            key={m.id}
            className={m.id === selectedId ? "sel" : ""}
            onClick={() => onSelect(m)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="meeting-card">
              <div className="meeting-icon">📊</div>
              <div className="meeting-content">
                <div className="title">{m.title}</div>
                <div className="meta">
                  {new Date(m.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="duration">{m.durationMinutes} min</div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .empty {
          text-align: center;
          color: var(--text-light);
          padding: 20px;
          font-style: italic;
        }
        
        .mlist {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        li {
          margin-bottom: 12px;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.5s ease-out both;
        }
        
        .meeting-card {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        li:hover .meeting-card {
          background: rgba(255, 255, 255, 0.9);
          transform: translateX(4px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
        }
        
        .sel .meeting-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
          border: 1px solid rgba(102, 126, 234, 0.3);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.25);
        }
        
        .meeting-icon {
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .meeting-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .title {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-dark);
          line-height: 1.4;
        }
        
        .meta {
          font-size: 0.85rem;
          color: var(--text-light);
          font-weight: 500;
        }
        
        .duration {
          font-size: 0.75rem;
          color: var(--accent-purple);
          font-weight: 600;
          display: inline-block;
          padding: 2px 8px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          width: fit-content;
        }
      `}</style>
    </div>
  );
}
