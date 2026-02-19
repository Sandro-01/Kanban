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
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadCount = useCallback(async () => {
    try {
      const res = await notifApi.getCount();
      setUnreadCount(res.data.unreadCount);
    } catch { /* silenzioso */ }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await notifApi.getAll({ limit: 20 });
      setNotifList(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount);
    } catch { /* silenzioso */ }
  }, []);

  // Polling conteggio ogni 15 secondi
  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 15000);
    return () => clearInterval(interval);
  }, [loadCount]);

  // Carica lista quando si apre il pannello
  useEffect(() => {
    if (showPanel) loadNotifications();
  }, [showPanel, loadNotifications]);

  // Chiudi pannello cliccando fuori
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

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
    COMMENT: '\uD83D\uDCAC',       // 💬
    ASSIGNMENT: '\uD83D\uDC64',    // 👤
    STATUS_CHANGE: '\uD83D\uDD04', // 🔄
    SLA_ALERT: '\u26A0\uFE0F',     // ⚠️
    EMAIL: '\uD83D\uDCE7',         // 📧
    AI_SUGGESTION: '\uD83E\uDD16', // 🤖
  };

  const timeSince = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'ora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h fa`;
    return `${Math.floor(seconds / 86400)}g fa`;
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="logo">Kanban ISO</h1>
          <nav className="nav">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/board" className="nav-link">Board</Link>
            <Link to="/archivio" className="nav-link">Archivio</Link>
            <Link to="/sla" className="nav-link">SLA</Link>
            <Link to="/kb" className="nav-link">Knowledge Base</Link>

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

            {/* Email Settings - only ADMIN */}
            {user.role === 'ADMIN' && (
              <Link to="/settings/email" className="nav-link">Email</Link>
            )}
          </nav>
        </div>
        <div className="header-right">
          {/* Notification Bell */}
          <div ref={panelRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPanel(!showPanel)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '20px', position: 'relative', padding: '4px 8px',
                color: '#e2e8f0',
              }}
              title="Notifiche"
            >
              &#128276;
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-2px', right: '0',
                  background: '#ef4444', color: 'white', borderRadius: '50%',
                  width: '18px', height: '18px', fontSize: '11px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showPanel && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '8px',
                width: '380px', maxHeight: '480px', overflowY: 'auto',
                background: '#fff', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0', zIndex: 1000,
              }}>
                {/* Panel Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
                }}>
                  <span style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>
                    Notifiche {unreadCount > 0 && `(${unreadCount})`}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#3b82f6', fontSize: '12px', fontWeight: '500',
                      }}
                    >
                      Segna tutte lette
                    </button>
                  )}
                </div>

                {/* Notification List */}
                {notifList.length === 0 ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    Nessuna notifica
                  </div>
                ) : (
                  notifList.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: n.read ? '#fff' : '#eff6ff',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#fff' : '#eff6ff')}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>
                          {typeIcons[n.type] || '\uD83D\uDD14'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px', fontWeight: n.read ? '400' : '600',
                            color: '#0f172a', marginBottom: '2px',
                          }}>
                            {n.title}
                          </div>
                          <div style={{
                            fontSize: '12px', color: '#64748b',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {n.message}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0, marginTop: '2px' }}>
                          {timeSince(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <span className="user-badge">
            {user.firstName} {user.lastName}
            <span className="role-badge">
              {user.role === 'ADMIN' ? '\uD83D\uDC51 Admin' : user.department || 'User'}
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
