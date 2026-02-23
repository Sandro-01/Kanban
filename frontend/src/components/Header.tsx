import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications as notifApi } from '../services/api';
import './Header.css';

interface HeaderProps {
  user: any;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifList, setNotifList] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadCount = useCallback(async () => {
    try {
      const res = await notifApi.getCount();
      setUnreadCount(res.data.unreadCount);
    } catch (err) { console.error('Notifications count error:', err); }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await notifApi.getAll({ limit: 20 });
      setNotifList(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount);
    } catch (err) { console.error('Notifications load error:', err); }
  }, []);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 15000);
    return () => clearInterval(interval);
  }, [loadCount]);

  useEffect(() => {
    if (showPanel) loadNotifications();
  }, [showPanel, loadNotifications]);

  // Close notifications panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  const handleNotifClick = async (n: any) => {
    if (!n.read) {
      await notifApi.markRead(n.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifList(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.ticketId) {
      setShowPanel(false);
      navigate('/board');
    }
  };

  const handleMarkAllRead = async () => {
    await notifApi.markAllRead();
    setUnreadCount(0);
    setNotifList(prev => prev.map(x => ({ ...x, read: true })));
  };

  const typeIcons: Record<string, string> = {
    COMMENT: '💬',
    ASSIGNMENT: '👤',
    STATUS_CHANGE: '🔄',
    SLA_ALERT: '⚠️',
    EMAIL: '📧',
    AI_SUGGESTION: '🤖',
  };

  const timeSince = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const isPersonale = user.role === 'ADMIN' ||
    user.department === 'HR' ||
    user.department === 'IT' ||
    user.department === 'Amministrazione';

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="logo">Kanban ISO</h1>
          <nav className="nav" ref={dropdownRef}>
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/board" className="nav-link">Board</Link>
            <Link to="/archivio" className="nav-link">Archive</Link>
            <Link to="/sla" className="nav-link">SLA</Link>
            <Link to="/kb" className="nav-link">Knowledge Base</Link>

            {/* Dropdown Personnel */}
            {isPersonale && (
              <div className="nav-dropdown">
                <button
                  className="nav-link nav-dropdown-trigger"
                  onClick={() => setOpenDropdown(openDropdown === 'personale' ? null : 'personale')}
                >
                  Personnel <span className="dropdown-arrow">▾</span>
                </button>
                {openDropdown === 'personale' && (
                  <div className="nav-dropdown-menu">
                    <Link to="/onboarding" className="nav-dropdown-item" onClick={() => setOpenDropdown(null)}>Onboarding</Link>
                    <Link to="/offboarding" className="nav-dropdown-item" onClick={() => setOpenDropdown(null)}>Offboarding</Link>
                  </div>
                )}
              </div>
            )}

            {/* Dropdown Admin */}
            {user.role === 'ADMIN' && (
              <div className="nav-dropdown">
                <button
                  className="nav-link nav-dropdown-trigger"
                  onClick={() => setOpenDropdown(openDropdown === 'admin' ? null : 'admin')}
                >
                  Admin <span className="dropdown-arrow">▾</span>
                </button>
                {openDropdown === 'admin' && (
                  <div className="nav-dropdown-menu">
                    <Link to="/audit" className="nav-dropdown-item" onClick={() => setOpenDropdown(null)}>Audit</Link>
                    <Link to="/users" className="nav-dropdown-item" onClick={() => setOpenDropdown(null)}>Users</Link>
                    <Link to="/settings/email" className="nav-dropdown-item" onClick={() => setOpenDropdown(null)}>Email</Link>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="header-right">
          {/* Notification Bell */}
          <div ref={panelRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="notif-bell"
              title="Notifications"
            >
              &#128276;
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {showPanel && (
              <div className="notif-panel">
                <div className="notif-panel-header">
                  <span>Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="notif-mark-all">
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifList.length === 0 ? (
                  <div className="notif-empty">No notifications</div>
                ) : (
                  notifList.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`notif-item ${n.read ? '' : 'notif-item--unread'}`}
                    >
                      <span className="notif-icon">{typeIcons[n.type] || '🔔'}</span>
                      <div className="notif-body">
                        <div className={`notif-title ${n.read ? '' : 'notif-title--bold'}`}>{n.title}</div>
                        <div className="notif-message">{n.message}</div>
                      </div>
                      <span className="notif-time">{timeSince(n.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

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
