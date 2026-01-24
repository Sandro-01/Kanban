import React, { useEffect, useState } from 'react';
import { audit } from '../services/api';
import './AuditLogs.css';

interface AuditLogsProps {
  user: any;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ user }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity: '',
    severity: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logsRes, reportRes] = await Promise.all([
        audit.getLogs(filters),
        audit.getISOReport(),
      ]);

      setLogs(logsRes.data);
      setReport(reportRes.data);
    } catch (error) {
      console.error('Errore caricamento audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    await loadData();
  };

  const handleExport = async () => {
    try {
      const response = await audit.export(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-log-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Errore export:', error);
    }
  };

  if (loading) {
    return <div className="loading">Caricamento audit logs...</div>;
  }

  return (
    <div className="page audit-page">
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>Tracciamento completo delle attività per conformità ISO 9001/27001</p>
      </div>

      <div className="iso-compliance-banner">
        <div className="banner-content">
          <h2>🔒 Sistema Conforme ISO 9001/27001</h2>
          <p>
            Tutti i log di audit sono IMMUTABILI e tracciati per garantire la conformità agli
            standard ISO. Nessun record può essere modificato o eliminato.
          </p>
        </div>
        <div className="iso-badges-audit">
          <span className="iso-badge-audit">ISO 9001</span>
          <span className="iso-badge-audit">ISO 27001</span>
        </div>
      </div>

      {/* Report Statistics */}
      {report && (
        <div className="card audit-stats">
          <h2>Statistiche Audit</h2>
          <div className="stats-grid-audit">
            <div className="stat-card-audit">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-number">{report.statistics.total}</div>
                <div className="stat-label">Eventi Totali</div>
              </div>
            </div>

            <div className="stat-card-audit">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-number">{report.statistics.byIsoStandard.ISO9001}</div>
                <div className="stat-label">ISO 9001</div>
              </div>
            </div>

            <div className="stat-card-audit">
              <div className="stat-icon">🔒</div>
              <div className="stat-info">
                <div className="stat-number">{report.statistics.byIsoStandard.ISO27001}</div>
                <div className="stat-label">ISO 27001</div>
              </div>
            </div>

            <div className="stat-card-audit">
              <div className="stat-icon">🚨</div>
              <div className="stat-info">
                <div className="stat-number">{report.statistics.bySeverity.CRITICAL}</div>
                <div className="stat-label">Eventi Critici</div>
              </div>
            </div>
          </div>

          <div className="severity-breakdown">
            <h3>Per Severità</h3>
            <div className="severity-grid">
              <div className="severity-item">
                <span className="severity-badge info">INFO</span>
                <span className="severity-count">{report.statistics.bySeverity.INFO}</span>
              </div>
              <div className="severity-item">
                <span className="severity-badge warning">WARNING</span>
                <span className="severity-count">{report.statistics.bySeverity.WARNING}</span>
              </div>
              <div className="severity-item">
                <span className="severity-badge critical">CRITICAL</span>
                <span className="severity-count">{report.statistics.bySeverity.CRITICAL}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card filters-card">
        <h3>Filtri</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="label">Entità</label>
            <select
              className="input"
              value={filters.entity}
              onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
            >
              <option value="">Tutte</option>
              <option value="User">Utente</option>
              <option value="Ticket">Ticket</option>
              <option value="Comment">Commento</option>
              <option value="Attachment">Allegato</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Offboarding">Offboarding</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="label">Severità</label>
            <select
              className="input"
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            >
              <option value="">Tutte</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="label">Data Inizio</label>
            <input
              type="date"
              className="input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label className="label">Data Fine</label>
            <input
              type="date"
              className="input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn btn-primary" onClick={handleFilter}>
            Applica Filtri
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            📥 Esporta CSV
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card logs-card">
        <h2>Log Eventi ({logs.length})</h2>
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Utente</th>
                <th>Azione</th>
                <th>Entità</th>
                <th>Severità</th>
                <th>ISO</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="timestamp">
                    {new Date(log.timestamp).toLocaleString('it-IT')}
                  </td>
                  <td>
                    {log.user.firstName} {log.user.lastName}
                    <br />
                    <span className="email">{log.user.email}</span>
                  </td>
                  <td>
                    <span className="action-badge">{log.action}</span>
                  </td>
                  <td>
                    {log.entity}
                    <br />
                    <span className="entity-id">{log.entityId.substring(0, 8)}</span>
                  </td>
                  <td>
                    <span className={`severity-badge ${log.severity.toLowerCase()}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td>
                    <div className="iso-tags">
                      {log.isoStandard.map((iso: string) => (
                        <span key={iso} className="iso-tag">
                          {iso}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="ip-address">{log.ipAddress || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="empty-state">
              <h3>Nessun log trovato</h3>
              <p>Prova a modificare i filtri</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
