import React, { useEffect, useState } from 'react';
import { tickets as ticketsApi } from '../services/api';
import './KanbanBoard.css';

// Strip HTML tags to get plain text (for card preview)
const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

interface KanbanBoardProps {
  user: any;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ user }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [columns] = useState([
    { id: 'OPEN', name: 'To Do', status: 'OPEN' },
    { id: 'IN_PROGRESS', name: 'In Progress', status: 'IN_PROGRESS' },
    { id: 'WAITING', name: 'Waiting', status: 'WAITING' },
    { id: 'RESOLVED', name: 'Resolved', status: 'RESOLVED' },
  ]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await ticketsApi.getAll();
      setTickets(response.data);
    } catch (error) {
      console.error('Errore caricamento ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveTicket = async (ticketId: string, newStatus: string) => {
    try {
      await ticketsApi.update(ticketId, { status: newStatus });
      loadTickets();
    } catch (error) {
      console.error('Errore spostamento ticket:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      CRITICAL: '#ef4444',
      HIGH: '#f59e0b',
      MEDIUM: '#3b82f6',
      LOW: '#10b981',
    };
    return colors[priority] || '#64748b';
  };

  const getTicketsForColumn = (status: string) => {
    return tickets.filter((t) => t.status === status);
  };

  const isOverdue = (ticket: any) => {
    return new Date(ticket.dueDate) < new Date() && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="page kanban-page">
      <div className="page-header">
        <h1>Kanban Board</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowNewTicket(true)}
        >
          + Nuovo Ticket
        </button>
      </div>

      <div className="kanban-board">
        {columns.map((column) => (
          <div key={column.id} className="kanban-column">
            <div className="column-header">
              <h3>{column.name}</h3>
              <span className="ticket-count">
                {getTicketsForColumn(column.status).length}
              </span>
            </div>

            <div className="column-content">
              {getTicketsForColumn(column.status).map((ticket) => (
                <div
                  key={ticket.id}
                  className={`ticket-card ${isOverdue(ticket) ? 'overdue' : ''}`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="ticket-header">
                    <span
                      className="priority-indicator"
                      style={{ background: getPriorityColor(ticket.priority) }}
                    />
                    <span className={`badge badge-${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                  </div>

                  <h4 className="ticket-title">{ticket.title}</h4>

                  <p className="ticket-description">
                    {(() => { const t = stripHtml(ticket.description); return t.substring(0, 100) + (t.length > 100 ? '...' : ''); })()}
                  </p>

                  <div className="ticket-footer">
                    <div className="ticket-meta">
                      {ticket.assignedTo && (
                        <span className="assignee">
                          👤 {ticket.assignedTo.firstName}
                        </span>
                      )}
                      <span className="due-date">
                        ⏱️ {new Date(ticket.dueDate).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    {ticket.slaViolated && (
                      <span className="sla-badge sla-violated">SLA Violato</span>
                    )}
                  </div>

                  {ticket.attachments?.length > 0 && (
                    <div className="attachments-indicator">
                      📎 {ticket.attachments.length} file
                    </div>
                  )}
                </div>
              ))}

              {getTicketsForColumn(column.status).length === 0 && (
                <div className="empty-column">Nessun ticket</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          user={user}
          onClose={() => setSelectedTicket(null)}
          onUpdate={loadTickets}
          onMove={handleMoveTicket}
        />
      )}

      {showNewTicket && (
        <NewTicketModal
          user={user}
          onClose={() => setShowNewTicket(false)}
          onCreate={loadTickets}
        />
      )}
    </div>
  );
};

// Componente modale ticket
const TicketModal: React.FC<any> = ({ ticket, user, onClose, onUpdate, onMove }) => {
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    try {
      await ticketsApi.addComment(ticket.id, comment);
      setComment('');
      onUpdate();
    } catch (error) {
      console.error('Errore aggiunta commento:', error);
    }
  };

  const handleUploadFile = async () => {
    if (!file) return;

    try {
      await ticketsApi.uploadFile(ticket.id, file);
      setFile(null);
      onUpdate();
    } catch (error) {
      console.error('Errore upload file:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{ticket.title}</h2>
            <span className={`badge badge-${ticket.priority.toLowerCase()}`}>
              {ticket.priority}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ticket-modal-content">
          <div className="ticket-info">
            <p><strong>Descrizione:</strong></p>
            <div
              className="ticket-description-html"
              dangerouslySetInnerHTML={{ __html: ticket.description }}
            />

            <div className="ticket-details">
              <div>
                <strong>Creato da:</strong> {ticket.createdBy.firstName} {ticket.createdBy.lastName}
              </div>
              <div>
                <strong>Assegnato a:</strong>{' '}
                {ticket.assignedTo
                  ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                  : 'Non assegnato'}
              </div>
              <div>
                <strong>Scadenza SLA:</strong>{' '}
                {new Date(ticket.dueDate).toLocaleString('it-IT')}
              </div>
              <div>
                <strong>SLA:</strong> {ticket.slaHours} ore
              </div>
            </div>
          </div>

          {/* Sposta ticket */}
          <div className="move-section">
            <strong>Sposta in:</strong>
            <div className="move-buttons">
              {['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED'].map((status) => (
                <button
                  key={status}
                  className={`btn btn-secondary ${ticket.status === status ? 'active' : ''}`}
                  onClick={() => {
                    onMove(ticket.id, status);
                    onClose();
                  }}
                  disabled={ticket.status === status}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* File allegati */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="attachments-section">
              <strong>File Allegati (IMMUTABILI):</strong>
              <div className="attachments-list">
                {ticket.attachments.map((att: any) => (
                  <div key={att.id} className="attachment-item">
                    📎 {att.fileName}
                    <span className="file-size">
                      ({(att.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload file */}
          <div className="upload-section">
            <strong>Carica File (non eliminabile dopo invio):</strong>
            <div className="upload-controls">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button
                className="btn btn-primary"
                onClick={handleUploadFile}
                disabled={!file}
              >
                Carica
              </button>
            </div>
          </div>

          {/* Commenti */}
          <div className="comments-section">
            <strong>Commenti (IMMUTABILI):</strong>
            <div className="comments-list">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((c: any) => (
                  <div key={c.id} className="comment">
                    <div className="comment-header">
                      <strong>
                        {c.user.firstName} {c.user.lastName}
                      </strong>
                      <span className="comment-date">
                        {new Date(c.createdAt).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <p>{c.content}</p>
                  </div>
                ))
              ) : (
                <p className="no-comments">Nessun commento</p>
              )}
            </div>

            <div className="add-comment">
              <textarea
                className="input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Aggiungi un commento (non eliminabile dopo invio)..."
                rows={3}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddComment}
                disabled={!comment.trim()}
              >
                Aggiungi Commento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente nuovo ticket
const NewTicketModal: React.FC<any> = ({ user, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await ticketsApi.create({
        ...formData,
        boardId: 'default-board',
        columnId: 'col-todo',
      });
      onCreate();
      onClose();
    } catch (error) {
      console.error('Errore creazione ticket:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuovo Ticket</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Titolo</label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Descrizione</label>
            <textarea
              className="input"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Priorità</label>
            <select
              className="input"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="LOW">Bassa</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Critica</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Categoria</label>
            <input
              type="text"
              className="input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="es. Bug, Feature, Miglioramento"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary">
              Crea Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KanbanBoard;
