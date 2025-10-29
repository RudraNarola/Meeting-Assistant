import { useAuth } from '../context/AuthContext'
import Link from 'next/link'

export default function Navbar() {
  const { user, logout } = useAuth()
  const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="logo">
          <span className="logo-icon">✨</span>
          <span className="logo-text">Meeting Assistant</span>
        </Link>

        <div className="nav-links">
          {user ? (
            <>
              <Link href="/" className="nav-link">
                📊 Dashboard
              </Link>
              <Link href="/" className="nav-link">
                📅 Meetings
              </Link>
              <div className="user-menu">
                <div className="user-info">
                  <div className="user-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</div>
                  <span className="user-name">{user.name || user.email}</span>
                </div>
                <button onClick={logout} className="logout-btn">
                  🚪 Logout
                </button>
              </div>
            </>
          ) : (
            <>
              {/* External links to backend-hosted auth pages */}
              <a href={`${backend}/login.html`} className="nav-link">
                🔐 Login
              </a>
              <a href={`${backend}/register.html`} className="register-btn">
                ✍️ Register
              </a>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .navbar {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--glass-border);
          padding: 16px 0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          transition: transform 0.3s ease;
        }

        .logo:hover {
          transform: scale(1.05);
        }

        .logo-icon {
          font-size: 2rem;
          animation: pulse 2s ease-in-out infinite;
        }

        .logo-text {
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-link {
          text-decoration: none;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
          font-size: 1rem;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .register-btn {
          text-decoration: none;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-pink) 100%);
          color: white;
          font-weight: 700;
          padding: 10px 24px;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .register-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 16px;
          border-radius: 12px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-pink) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .user-name {
          color: white;
          font-weight: 600;
        }

        .logout-btn {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .logout-btn:hover {
          background: rgba(255, 87, 108, 0.3);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .nav-container {
            flex-direction: column;
            gap: 16px;
          }

          .nav-links {
            flex-wrap: wrap;
            justify-content: center;
          }

          .user-name {
            display: none;
          }
        }
      `}</style>
    </nav>
  )
}
