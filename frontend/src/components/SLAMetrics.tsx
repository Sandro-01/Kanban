import React, { useEffect, useState } from 'react';
import { sla } from '../services/api';
import './SLAMetrics.css';

interface SLAMetricsProps {
  user: any;
}

const SLAMetrics: React.FC<SLAMetricsProps> = ({ user }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [metricsRes, violationsRes, configsRes] = await Promise.all([
        sla.getMetrics(),
        sla.getViolations(),
        sla.getConfig(),
      ]);

      setMetrics(metricsRes.data);
      setViolations(violationsRes.data);
      setConfigs(configsRes.data);
    } catch (error) {
      console.error('Error loading SLA:', error);
      // Set default values in case of error
      setMetrics({
        total: 0,
        withinSLA: 0,
        nearingSLA: 0,
        violated: 0,
        byPriority: {
          CRITICAL: { total: 0, violated: 0 },
          HIGH: { total: 0, violated: 0 },
          MEDIUM: { total: 0, violated: 0 },
          LOW: { total: 0, violated: 0 },
        }
      });
      setViolations([]);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading SLA metrics...</div>;
  }

  if (!metrics) {
    return (
      <div className="page sla-page">
        <div className="page-header">
          <h1>SLA Metrics</h1>
          <p>Real-time monitoring of Service Level Agreements</p>
        </div>
        <div className="card">
          <p>Unable to load SLA metrics. Please ensure the backend is running.</p>
        </div>
      </div>
    );
  }

  const slaCompliance = metrics.total > 0
    ? ((metrics.withinSLA / metrics.total) * 100).toFixed(1)
    : 0;

  return (
    <div className="page sla-page">
      <div className="page-header">
        <h1>SLA Metrics</h1>
        <p>Real-time monitoring of Service Level Agreements</p>
      </div>

      <div className="alert alert-info">
        <strong>ISO 9001 Compliance:</strong> SLA tracking ensures response times
        compliant with defined quality standards.
      </div>

      {/* Overview */}
      <div className="sla-overview-cards">
        <div className="sla-overview-card success">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <div className="card-value">{metrics.withinSLA}</div>
            <div className="card-label">Within SLA</div>
          </div>
        </div>

        <div className="sla-overview-card warning">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <div className="card-value">{metrics.nearingSLA}</div>
            <div className="card-label">Nearing Deadline</div>
          </div>
        </div>

        <div className="sla-overview-card danger">
          <div className="card-icon">🚨</div>
          <div className="card-content">
            <div className="card-value">{metrics.violated}</div>
            <div className="card-label">Violated</div>
          </div>
        </div>

        <div className="sla-overview-card primary">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-value">{slaCompliance}%</div>
            <div className="card-label">Compliance</div>
          </div>
        </div>
      </div>

      {/* By Priority */}
      <div className="card">
        <h2>Distribution by Priority</h2>
        <div className="priority-metrics">
          {Object.entries(metrics.byPriority || {}).map(([priority, data]: any) => {
            const complianceRate = data.total > 0
              ? (((data.total - data.violated) / data.total) * 100).toFixed(1)
              : 100;

            return (
              <div key={priority} className="priority-metric-card">
                <div className="priority-header">
                  <span className={`badge badge-${priority.toLowerCase()}`}>
                    {priority}
                  </span>
                  <span className="compliance-rate">{complianceRate}% OK</span>
                </div>
                <div className="priority-stats-grid">
                  <div className="stat">
                    <span className="stat-label">Total</span>
                    <span className="stat-value">{data.total}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Violated</span>
                    <span className="stat-value stat-danger">{data.violated}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SLA Configurations */}
      <div className="card">
        <h2>SLA Configurations</h2>
        <div className="sla-config-table">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Priority</th>
                <th>SLA (hours)</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.id}>
                  <td>{config.category}</td>
                  <td>
                    <span className={`badge badge-${config.priority.toLowerCase()}`}>
                      {config.priority}
                    </span>
                  </td>
                  <td><strong>{config.hours}h</strong></td>
                  <td>{config.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Violations */}
      {violations.length > 0 && (
        <div className="card violations-card">
          <h2>🚨 Active SLA Violations ({violations.length})</h2>
          <div className="violations-list">
            {violations.map((ticket) => {
              const hoursOverdue = Math.floor(
                (new Date().getTime() - new Date(ticket.dueDate).getTime()) / (1000 * 60 * 60)
              );

              return (
                <div key={ticket.id} className="violation-item">
                  <div className="violation-header">
                    <h4>{ticket.title}</h4>
                    <span className={`badge badge-${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="violation-info">
                    <div className="violation-detail">
                      <span>📅 Expired on:</span>
                      <span>{new Date(ticket.dueDate).toLocaleString('en-GB')}</span>
                    </div>
                    <div className="violation-detail">
                      <span>⏰ Overdue by:</span>
                      <span className="overdue-time">{hoursOverdue}h</span>
                    </div>
                    <div className="violation-detail">
                      <span>👤 Assigned to:</span>
                      <span>
                        {ticket.assignedTo
                          ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                          : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {violations.length === 0 && (
        <div className="card success-message">
          <h2>✅ No SLA Violations</h2>
          <p>All tickets are being handled within the expected timeframes!</p>
        </div>
      )}
    </div>
  );
};

export default SLAMetrics;
