import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications as notifApi } from '../services/api';
import './Header.css';

// Inline SVG icons — thin stroke, Off-White minimal style
const S = 14;
const IconBell = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconComment = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconAssign = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <polyline points="16 11 18 13 22 9"/>
  </svg>
);
const IconRefresh = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const IconAlert = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconMail = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconAI = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

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
      navigate(`/board?ticketId=${n.ticketId}`);
    }
  };

  const handleMarkAllRead = async () => {
    await notifApi.markAllRead();
    setUnreadCount(0);
    setNotifList(prev => prev.map(x => ({ ...x, read: true })));
  };

  const typeIcons: Record<string, React.ReactNode> = {
    COMMENT: <IconComment />,
    ASSIGNMENT: <IconAssign />,
    STATUS_CHANGE: <IconRefresh />,
    SLA_ALERT: <IconAlert />,
    EMAIL: <IconMail />,
    AI_SUGGESTION: <IconAI />,
  };

  const timeSince = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // allowedPages: empty array = all pages allowed (backward compatible)
  const hasPage = (path: string) =>
    user.role === 'ADMIN' ||
    !user.allowedPages ||
    user.allowedPages.length === 0 ||
    user.allowedPages.includes(path);

  const isPersonale = user.role === 'ADMIN' ||
    user.department === 'HR' ||
    user.department === 'IT' ||
    user.department === 'Amministrazione';

  const showPersonnelMenu =
    (hasPage('/onboarding') || hasPage('/offboarding')) && isPersonale;

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="logo">Kanban ISO</h1>
          <nav className="nav" ref={dropdownRef}>
            <Link to="/" className="nav-link">Dashboard</Link>
            {hasPage('/board')    && <Link to="/board"    className="nav-link">Board</Link>}
            {hasPage('/archivio') && <Link to="/archivio" className="nav-link">Archive</Link>}
            {hasPage('/sla')      && <Link to="/sla"      className="nav-link">SLA</Link>}
            {hasPage('/kb')       && <Link to="/kb"       className="nav-link">Knowledge Base</Link>}

            {/* Dropdown Personnel */}
            {showPersonnelMenu && (
              <div className="nav-dropdown">
                <button
                  className="nav-link nav-dropdown-trigger"
                  onClick={() => setOpenDropdown(openDropdown === 'personale' ? null : 'personale')}
                >
                  Personnel <span className="dropdown-arrow">▾</span>
                </button>
                {openDropdown === 'personale' && (
                  <div className="nav-dropdown-menu">
                    {hasPage('/onboarding')  && <Link to="/onboarding"  className="nav-dropdown-item" onClick={() => setOpenDropdown(null)}>Onboarding</Link>}
                    {hasPage('/offboarding') && <Link to="/offboarding" className="nav-dropdown-item" onClick={() => setOpenDropdown(null)}>Offboarding</Link>}
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
              <IconBell size={18} />
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
                      <span className="notif-icon">{typeIcons[n.type] || <IconBell size={14} />}</span>
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
              {user.role === 'ADMIN' ? 'Admin' : user.department || 'User'}
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
