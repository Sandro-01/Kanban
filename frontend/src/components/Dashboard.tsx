import React, { useEffect, useState } from 'react';
import { tickets, sla } from '../services/api';
import './Dashboard.css';

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<any>(null);
  const [slaMetrics, setSlaMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ticketsRes, slaRes] = await Promise.all([
        tickets.getAll(),
        sla.getMetrics(),
      ]);

      const allTickets = ticketsRes.data;

      const statistics = {
        total: allTickets.length,
        open: allTickets.filter((t: any) => t.status === 'OPEN').length,
        inProgress: allTickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
        resolved: allTickets.filter((t: any) => t.status === 'RESOLVED').length,
        closed: allTickets.filter((t: any) => t.status === 'CLOSED').length,
        myTickets: allTickets.filter((t: any) => t.assignedToId === user.id).length,
      };

      setStats(statistics);
      setSlaMetrics(slaRes.data);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      // Set default values in case of error
      setStats({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        myTickets: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  if (!stats) {
    return <div className="error">Errore nel caricamento dei dati. Ricarica la pagina.</div>;
  }

  return (
    <div className="page dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Benvenuto, {user.firstName} {user.lastName}!</p>
        {user.role === 'ADMIN' ? (
          <span className="badge" style={{ backgroundColor: '#ef4444', color: 'white', padding: '5px 10px', borderRadius: '5px', fontSize: '14px' }}>
            👑 Amministratore
          </span>
        ) : (
          <span className="badge" style={{ backgroundColor: '#3b82f6', color: 'white', padding: '5px 10px', borderRadius: '5px', fontSize: '14px' }}>
            👤 {user.department || 'Utente'}
          </span>
        )}
      </div>

      {user.role === 'ADMIN' ? (
        // Admin view - show ISO banner
        <div className="iso-banner">
          <h2>Sistema Conforme ISO 9001/27001</h2>
          <div className="iso-features">
            <div className="iso-feature">
              <span className="icon">🔒</span>
              <span>Audit Logging</span>
            </div>
            <div className="iso-feature">
              <span className="icon">📊</span>
              <span>SLA Tracking</span>
            </div>
            <div className="iso-feature">
              <span className="icon">📁</span>
              <span>File Immutabili</span>
            </div>
            <div className="iso-feature">
              <span className="icon">👥</span>
              <span>Onboarding/Offboarding</span>
            </div>
          </div>
        </div>
      ) : (
        // User view - show personalized message
        <div className="card" style={{ padding: '20px', marginBottom: '20px', backgroundColor: '#f0f9ff', border: '1px solid #3b82f6' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>👋 Benvenuto nella tua area personale</h2>
          <p style={{ margin: 0, color: '#1e3a8a' }}>
            Qui puoi visualizzare i tuoi ticket assegnati, monitorare le priorità e gestire le tue attività.
          </p>
        </div>
      )}

      <div className="stats-grid">
        {user.role === 'ADMIN' ? (
          // Admin stats - show all tickets
          <>
            <div className="stat-card">
              <h3>Ticket Totali</h3>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <h3>Aperti</h3>
              <div className="stat-value stat-warning">{stats.open}</div>
            </div>
            <div className="stat-card">
              <h3>In Lavorazione</h3>
              <div className="stat-value stat-info">{stats.inProgress}</div>
            </div>
            <div className="stat-card">
              <h3>Risolti</h3>
              <div className="stat-value stat-success">{stats.resolved}</div>
            </div>
          </>
        ) : (
          // User stats - show only personal tickets
          <>
            <div className="stat-card">
              <h3>I Miei Ticket</h3>
              <div className="stat-value stat-primary">{stats.myTickets}</div>
            </div>
            <div className="stat-card">
              <h3>Da Fare</h3>
              <div className="stat-value stat-warning">{stats.open}</div>
            </div>
            <div className="stat-card">
              <h3>In Lavorazione</h3>
              <div className="stat-value stat-info">{stats.inProgress}</div>
            </div>
            <div className="stat-card">
              <h3>Completati</h3>
              <div className="stat-value stat-success">{stats.resolved}</div>
            </div>
          </>
        )}
      </div>

      {slaMetrics && (
        <div className="sla-overview card">
          <h2>Stato SLA</h2>
          <div className="sla-grid">
            <div className="sla-stat">
              <div className="sla-label">Entro SLA</div>
              <div className="sla-value sla-success">{slaMetrics.withinSLA}</div>
            </div>
            <div className="sla-stat">
              <div className="sla-label">Vicino Scadenza</div>
              <div className="sla-value sla-warning">{slaMetrics.nearingSLA}</div>
            </div>
            <div className="sla-stat">
              <div className="sla-label">Violati</div>
              <div className="sla-value sla-danger">{slaMetrics.violated}</div>
            </div>
          </div>

          <h3 style={{ marginTop: '30px' }}>Per Priorità</h3>
          <div className="priority-grid">
            {Object.entries(slaMetrics.byPriority).map(([priority, data]: any) => (
              <div key={priority} className="priority-card">
                <div className={`badge badge-${priority.toLowerCase()}`}>
                  {priority}
                </div>
                <div className="priority-stats">
                  <span>Totale: {data.total}</span>
                  <span>Violati: {data.violated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="quick-links card">
        <h2>Collegamenti Rapidi</h2>
        <div className="links-grid">
          <a href="/board" className="quick-link">
            <span className="icon">📋</span>
            <div>
              <h3>Kanban Board</h3>
              <p>Gestisci i ticket</p>
            </div>
          </a>
          <a href="/sla" className="quick-link">
            <span className="icon">⏱️</span>
            <div>
              <h3>SLA Metrics</h3>
              <p>Monitoraggio SLA</p>
            </div>
          </a>

          {/* Admin-only links */}
          {user.role === 'ADMIN' && (
            <>
              <a href="/users" className="quick-link">
                <span className="icon">👥</span>
                <div>
                  <h3>Gestione Utenti</h3>
                  <p>Crea, modifica, elimina utenti</p>
                </div>
              </a>
              <a href="/audit" className="quick-link">
                <span className="icon">📝</span>
                <div>
                  <h3>Audit Logs</h3>
                  <p>Tracciamento attività</p>
                </div>
              </a>
            </>
          )}

          {/* Onboarding - visible to ADMIN and HR department */}
          {(user.role === 'ADMIN' || user.department === 'Risorse Umane') && (
            <a href="/onboarding" className="quick-link">
              <span className="icon">🚀</span>
              <div>
                <h3>Onboarding</h3>
                <p>Gestisci nuovi dipendenti</p>
              </div>
            </a>
          )}

          {/* Offboarding - visible to ADMIN, HR and IT departments */}
          {(user.role === 'ADMIN' ||
            user.department === 'Risorse Umane' ||
            user.department === 'IT/Sistemi') && (
            <a href="/offboarding" className="quick-link">
              <span className="icon">👋</span>
              <div>
                <h3>Offboarding</h3>
                <p>Processo uscita dipendenti</p>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
