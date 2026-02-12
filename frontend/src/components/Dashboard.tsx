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
      // Set default values on error
      setStats({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        myTickets: 0,
      });
      setSlaMetrics({
        withinSLA: 0,
        nearingSLA: 0,
        violated: 0,
        byPriority: {},
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="page dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Benvenuto, {user.firstName}!</p>
      </div>

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

      <div className="stats-grid">
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
          <h3>I Miei Ticket</h3>
          <div className="stat-value stat-primary">{stats.myTickets}</div>
        </div>
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
          {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <>
              <a href="/onboarding" className="quick-link">
                <span className="icon">🚀</span>
                <div>
                  <h3>Onboarding</h3>
                  <p>Gestisci nuovi utenti</p>
                </div>
              </a>
              <a href="/offboarding" className="quick-link">
                <span className="icon">👋</span>
                <div>
                  <h3>Offboarding</h3>
                  <p>Processo uscita</p>
                </div>
              </a>
            </>
          )}
          <a href="/sla" className="quick-link">
            <span className="icon">⏱️</span>
            <div>
              <h3>SLA Metrics</h3>
              <p>Monitoraggio SLA</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
