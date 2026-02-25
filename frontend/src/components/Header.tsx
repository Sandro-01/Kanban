import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  user: any;
  onLogout: () => void;
}

function initials(user: any): string {
  const f = (user?.firstName ?? '')[0] ?? '';
  const l = (user?.lastName ?? '')[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="logo">Kanban ISO</h1>
          <nav className="nav">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/board" className="nav-link">Board</Link>
            {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
              <>
                <Link to="/onboarding" className="nav-link">Onboarding</Link>
                <Link to="/offboarding" className="nav-link">Offboarding</Link>
              </>
            )}
            <Link to="/sla" className="nav-link">SLA</Link>
            {(user.role === 'ADMIN' || user.role === 'AUDITOR') && (
              <Link to="/audit" className="nav-link">Audit</Link>
            )}
          </nav>
        </div>
        <div className="header-right">
          {/* Avatar button — links to profile */}
          <button
            className="header-avatar-btn"
            onClick={() => navigate('/profile')}
            title="Personalizza il tuo profilo"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="avatar"
                className="header-avatar-img"
              />
            ) : (
              <span
                className="header-avatar-initials"
                style={{ background: user.avatarColor ?? '#4F46E5' }}
              >
                {initials(user)}
              </span>
            )}
          </button>

          <span className="user-badge">
            {user.firstName} {user.lastName}
            <span className="role-badge">{user.role}</span>
          </span>
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
