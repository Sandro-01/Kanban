import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  user: any;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="logo">Kanban ISO</h1>
          <nav className="nav">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/board" className="nav-link">Board</Link>
            <Link to="/sla" className="nav-link">SLA</Link>

            {/* Onboarding - visible to ADMIN, HR, IT, Amministrazione */}
            {(user.role === 'ADMIN' ||
              user.department === 'HR' ||
              user.department === 'IT' ||
              user.department === 'Amministrazione') && (
              <Link to="/onboarding" className="nav-link">Onboarding</Link>
            )}

            {/* Offboarding - visible to ADMIN, HR, IT, Amministrazione */}
            {(user.role === 'ADMIN' ||
              user.department === 'HR' ||
              user.department === 'IT' ||
              user.department === 'Amministrazione') && (
              <Link to="/offboarding" className="nav-link">Offboarding</Link>
            )}

            {/* Audit - only ADMIN */}
            {user.role === 'ADMIN' && (
              <Link to="/audit" className="nav-link">Audit</Link>
            )}

            {/* User Management - only ADMIN */}
            {user.role === 'ADMIN' && (
              <Link to="/users" className="nav-link">Utenti</Link>
            )}
          </nav>
        </div>
        <div className="header-right">
          <span className="user-badge">
            {user.firstName} {user.lastName}
            <span className="role-badge">
              {user.role === 'ADMIN' ? '👑 Admin' : user.department || 'User'}
            </span>
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
