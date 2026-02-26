import React, { useEffect, useState, useCallback } from 'react';
import { tickets as ticketsApi, users as usersApi, UPLOADS_URL } from '../services/api';
import './TicketArchive.css';

interface TicketArchiveProps {
  user: any;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING: 'Waiting',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#000000',
  IN_PROGRESS: '#FFE600',
  WAITING: '#888888',
  RESOLVED: '#333333',
  CLOSED: '#CCCCCC',
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#000000',
  HIGH: '#333333',
  MEDIUM: '#FFE600',
  LOW: '#D0C8BF',
};

const isHtmlDescription = (desc: string) => /<[a-z][\s\S]*>/i.test(desc);

const buildEmailSrcdoc = (html: string): string => {
  let content = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  if (/<html/i.test(content)) {
    const baseStyle = `<style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 8px; font-size: 14px; line-height: 1.6; color: #1f2937; }</style>`;
    content = content.replace(/<head([^>]*)>/i, `<head$1>${baseStyle}`);
    return content;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 8px; font-size: 14px; line-height: 1.6; color: #1f2937; }
    img { max-width: 100%; height: auto; } table { border-collapse: collapse; } a { color: #4f6ef7; }
  </style></head><body>${content}</body></html>`;
};

const TicketArchive: React.FC<TicketArchiveProps> = ({ user }) => {
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [assignedUserFilter, setAssignedUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [operators, setOperators] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load operators for the filter dropdown
  useEffect(() => {
    const loadOperators = async () => {
      try {
        const res = await usersApi.getAll();
        const ops = res.data.filter((u: any) => u.department);
        setOperators(ops);
        const depts = Array.from(new Set(ops.map((u: any) => u.department))) as string[];
        setDepartments(depts);
      } catch (e) {
        console.error('Error loading operators:', e);
      }
    };
    loadOperators();
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { archive: 'true' };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (departmentFilter) params.department = departmentFilter;
      if (assignedUserFilter) params.assignedUserId = assignedUserFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await ticketsApi.getAll(params);
      setAllTickets(res.data);
    } catch (e) {
      console.error('Error loading tickets:', e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, departmentFilter, assignedUserFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadTickets]);

  const openDetail = async (ticket: any) => {
    setSelectedTicket(ticket);
    setLoadingHistory(true);
    try {
      const res = await ticketsApi.getHistory(ticket.id);
      setTicketHistory(res.data);
    } catch (e) {
      console.error('Error loading history:', e);
      setTicketHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setDepartmentFilter('');
    setAssignedUserFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = search || statusFilter || priorityFilter || departmentFilter || assignedUserFilter || dateFrom || dateTo;

  const getAssignees = (ticket: any) => {
    const names: string[] = [];
    if (ticket.assignments?.length > 0) {
      ticket.assignments.forEach((a: any) => {
        names.push(`${a.user.firstName} ${a.user.lastName}`);
      });
    }
    if (ticket.assignedDepartments?.length > 0) {
      ticket.assignedDepartments.forEach((d: string) => names.push(d));
    }
    if (names.length === 0 && ticket.assignedTo) {
      names.push(`${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`);
    }
    return names;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="archive-page">
      <div className="archive-header">
        <div>
          <h2>Ticket Archive</h2>
          <p className="archive-subtitle">Search and view all tickets, current and past</p>
        </div>
        <div className="archive-stats">
          <span className="stat-pill">{allTickets.length} ticket(s) found</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="archive-filters">
        <div className="filter-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by title, description or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="filter-select">
            <option value="">All priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="filter-select">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select value={assignedUserFilter} onChange={(e) => setAssignedUserFilter(e.target.value)} className="filter-select">
            <option value="">All operators</option>
            {operators.map((u: any) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>

          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="filter-date" title="From date" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="filter-date" title="To date" />

          {hasFilters && (
            <button className="filter-clear" onClick={clearFilters}>Clear filters</button>
          )}
        </div>
      </div>

      {/* Results table */}
      <div className="archive-table-wrapper">
        {loading ? (
          <div className="archive-loading">Loading...</div>
        ) : allTickets.length === 0 ? (
          <div className="archive-empty">
            <span className="empty-icon">📭</span>
            <p>No tickets found with the selected filters</p>
          </div>
        ) : (
          <table className="archive-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Priority</th>
                <th>Title</th>
                <th>Created by</th>
                <th>Assigned to</th>
                <th>Date</th>
                <th>SLA</th>
              </tr>
            </thead>
            <tbody>
              {allTickets.map((ticket) => {
                const assignees = getAssignees(ticket);
                return (
                  <tr key={ticket.id} onClick={() => openDetail(ticket)} className="archive-row">
                    <td>
                      <span className="status-badge" style={{ background: STATUS_COLORS[ticket.status], color: ticket.status === 'IN_PROGRESS' ? '#000000' : ticket.status === 'WAITING' || ticket.status === 'CLOSED' ? '#FFFFFF' : '#FFFFFF' }}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td>
                      <span className="priority-dot" style={{ background: PRIORITY_COLORS[ticket.priority] }} />
                      {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                    </td>
                    <td>
                      <div className="cell-title">{ticket.title}</div>
                      <div className="cell-id">{ticket.id.substring(0, 8)}...</div>
                    </td>
                    <td className="cell-user">
                      {ticket.createdBy?.firstName} {ticket.createdBy?.lastName}
                    </td>
                    <td>
                      {assignees.length > 0 ? (
                        <div className="cell-assignees">
                          {assignees.map((name, i) => (
                            <span className="assignee-tag" key={i}>{name}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="no-assignee">Unassigned</span>
                      )}
                    </td>
                    <td className="cell-date">{formatDate(ticket.createdAt)}</td>
                    <td>
                      {ticket.slaViolated ? (
                        <span className="sla-tag violated">Violated</span>
                      ) : ticket.resolvedAt ? (
                        <span className="sla-tag ok">OK</span>
                      ) : (
                        <span className="sla-tag pending">In progress</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Ticket detail side panel */}
      {selectedTicket && (
        <div className="archive-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="archive-detail" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <h3>{selectedTicket.title}</h3>
                <span className="detail-id">{selectedTicket.id}</span>
              </div>
              <button className="detail-close" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="detail-body">
              {/* Info grid */}
              <div className="detail-grid">
                <div className="detail-field">
                  <label>Status</label>
                  <span className="status-badge" style={{ background: STATUS_COLORS[selectedTicket.status], color: selectedTicket.status === 'IN_PROGRESS' ? '#000000' : '#FFFFFF' }}>
                    {STATUS_LABELS[selectedTicket.status]}
                  </span>
                </div>
                <div className="detail-field">
                  <label>Priority</label>
                  <span>
                    <span className="priority-dot" style={{ background: PRIORITY_COLORS[selectedTicket.priority] }} />
                    {PRIORITY_LABELS[selectedTicket.priority]}
                  </span>
                </div>
                <div className="detail-field">
                  <label>Created by</label>
                  <span>{selectedTicket.createdBy?.firstName} {selectedTicket.createdBy?.lastName}</span>
                </div>
                <div className="detail-field">
                  <label>Creation date</label>
                  <span>{formatDateTime(selectedTicket.createdAt)}</span>
                </div>
                {selectedTicket.resolvedAt && (
                  <div className="detail-field">
                    <label>Resolved on</label>
                    <span>{formatDateTime(selectedTicket.resolvedAt)}</span>
                  </div>
                )}
                <div className="detail-field">
                  <label>SLA Deadline</label>
                  <span>{formatDateTime(selectedTicket.dueDate)}</span>
                </div>
              </div>

              {/* Description */}
              <div className="detail-section">
                <label>Description</label>
                {selectedTicket.description ? (
                  isHtmlDescription(selectedTicket.description) ? (
                    <iframe
                      className="detail-description-iframe"
                      srcDoc={buildEmailSrcdoc(selectedTicket.description)}
                      sandbox="allow-same-origin"
                      onLoad={(e) => {
                        const iframe = e.currentTarget;
                        try {
                          const doc = iframe.contentDocument || iframe.contentWindow?.document;
                          if (doc) {
                            const h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
                            iframe.style.height = Math.min(h + 20, 400) + 'px';
                          }
                        } catch {}
                      }}
                      title="Description"
                    />
                  ) : (
                    <p className="detail-description">{selectedTicket.description}</p>
                  )
                ) : null}
              </div>

              {/* Assignees */}
              <div className="detail-section">
                <label>Assigned to</label>
                <div className="detail-assignees">
                  {getAssignees(selectedTicket).length > 0 ? (
                    getAssignees(selectedTicket).map((name, i) => (
                      <span className="assignee-tag" key={i}>{name}</span>
                    ))
                  ) : (
                    <span className="no-assignee">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Comments */}
              {selectedTicket.comments?.length > 0 && (
                <div className="detail-section">
                  <label>Comments ({selectedTicket.comments.length})</label>
                  <div className="detail-comments">
                    {selectedTicket.comments.map((c: any) => {
                      const commentAttachments = (selectedTicket.attachments || []).filter(
                        (a: any) => a.commentId === c.id
                      );
                      return (
                        <div className="detail-comment" key={c.id}>
                          <div className="comment-meta">
                            <strong>{c.user?.firstName} {c.user?.lastName}</strong>
                            <span>{formatDateTime(c.createdAt)}</span>
                          </div>
                          <div
                            className="detail-comment-body"
                            dangerouslySetInnerHTML={{ __html: c.content.replace(/<script[\s\S]*?<\/script>/gi, '') }}
                          />
                          {commentAttachments.length > 0 && (
                            <div className="comment-attachments">
                              {commentAttachments.map((a: any) => (
                                <a
                                  key={a.id}
                                  href={`${UPLOADS_URL}/${a.filePath}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="attachment-link"
                                >
                                  📎 {a.fileName}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standalone attachments (not linked to any comment) */}
              {(() => {
                const standalone = (selectedTicket.attachments || []).filter(
                  (a: any) => !a.commentId
                );
                return standalone.length > 0 ? (
                  <div className="detail-section">
                    <label>Attachments ({standalone.length})</label>
                    <div className="detail-attachments">
                      {standalone.map((a: any) => (
                        <a
                          key={a.id}
                          href={`${UPLOADS_URL}/${a.filePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="attachment-link"
                        >
                          📎 {a.fileName}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* History */}
              <div className="detail-section">
                <label>Change history</label>
                {loadingHistory ? (
                  <p className="loading-text">Loading...</p>
                ) : ticketHistory.length > 0 ? (
                  <div className="detail-history">
                    {ticketHistory.map((h: any, i: number) => (
                      <div className="history-item" key={i}>
                        <div className="history-dot" />
                        <div className="history-content">
                          <span className="history-action">{h.field}: {h.oldValue || '–'} → {h.newValue || '–'}</span>
                          <span className="history-meta">
                            {h.changedBy?.firstName} {h.changedBy?.lastName} — {formatDateTime(h.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-history">No changes recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketArchive;
