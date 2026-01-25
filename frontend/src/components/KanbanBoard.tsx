import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { tickets as ticketsApi } from '../services/api';
import './KanbanBoard.css';

interface KanbanBoardProps {
  user: any;
}

// Define columns outside component for react-beautiful-dnd stability
const COLUMNS = [
  { id: 'OPEN', name: 'To Do', status: 'OPEN' },
  { id: 'IN_PROGRESS', name: 'In Progress', status: 'IN_PROGRESS' },
  { id: 'WAITING', name: 'Waiting', status: 'WAITING' },
  { id: 'RESOLVED', name: 'Resolved', status: 'RESOLVED' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ user }) => {
  const [tickets, setTickets] = useState<any[]>([]);
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

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) {
      return;
    }

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Move ticket to new column
    const newStatus = destination.droppableId;
    await handleMoveTicket(draggableId, newStatus);
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {COLUMNS.map((column) => (
            <div key={column.id} className="kanban-column">
              <div className="column-header">
                <h3>{column.name}</h3>
                <span className="ticket-count">
                  {getTicketsForColumn(column.status).length}
                </span>
              </div>

              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div
                    className={`column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {getTicketsForColumn(column.status).map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`ticket-card ${isOverdue(ticket) ? 'overdue' : ''} ${
                              snapshot.isDragging ? 'dragging' : ''
                            }`}
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
                              {ticket.description.substring(0, 100)}
                              {ticket.description.length > 100 ? '...' : ''}
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {getTicketsForColumn(column.status).length === 0 && (
                      <div className="empty-column">Nessun ticket</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

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

  // Unified handler for both comment and file
  const handleSubmit = async () => {
    if (!comment.trim() && !file) return;

    try {
      // Upload file if present
      if (file) {
        await ticketsApi.uploadFile(ticket.id, file);
      }

      // Add comment if present
      if (comment.trim()) {
        await ticketsApi.addComment(ticket.id, comment);
      }

      // Reset form
      setComment('');
      setFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      onUpdate();
    } catch (error) {
      console.error('Errore invio:', error);
      alert('Errore durante l\'invio. Riprova.');
    }
  };

  // Create unified timeline with both comments and files
  const getTimeline = () => {
    const items: any[] = [];

    // Add comments
    if (ticket.comments) {
      ticket.comments.forEach((c: any) => {
        items.push({
          type: 'comment',
          id: c.id,
          date: new Date(c.createdAt),
          user: c.user,
          content: c.content,
        });
      });
    }

    // Add files
    if (ticket.attachments) {
      ticket.attachments.forEach((att: any) => {
        items.push({
          type: 'file',
          id: att.id,
          date: new Date(att.createdAt || Date.now()),
          user: att.uploadedBy,
          fileName: att.fileName,
          filePath: att.filePath,
          fileSize: att.fileSize,
        });
      });
    }

    // Sort by date descending (newest first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const timeline = getTimeline();

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
            <p>{ticket.description}</p>

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

          {/* Timeline unificata - Commenti e File */}
          <div className="timeline-section">
            <strong>Attività (IMMUTABILI):</strong>
            <div className="timeline-list">
              {timeline.length > 0 ? (
                timeline.map((item) => (
                  <div key={`${item.type}-${item.id}`} className={`timeline-item ${item.type}`}>
                    {item.type === 'comment' ? (
                      <>
                        <div className="timeline-icon">💬</div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <strong>
                              {item.user.firstName} {item.user.lastName}
                            </strong>
                            {item.user.department && (
                              <span className="user-department">({item.user.department})</span>
                            )}
                            <span className="timeline-date">
                              {item.date.toLocaleString('it-IT')}
                            </span>
                          </div>
                          <p className="timeline-text">{item.content}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="timeline-icon">📎</div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <strong>
                              {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Utente'}
                            </strong>
                            {item.user?.department && (
                              <span className="user-department">({item.user.department})</span>
                            )}
                            <span className="timeline-date">
                              {item.date.toLocaleString('it-IT')}
                            </span>
                          </div>
                          <div className="timeline-file">
                            <a
                              href={`http://localhost:3001/uploads/${item.filePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                            >
                              📎 {item.fileName}
                            </a>
                            <span className="file-size">
                              ({(item.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-activity">Nessuna attività</p>
              )}
            </div>

            {/* Form unificato per commento e file */}
            <div className="unified-form">
              <strong>Aggiungi Commento e/o File (non eliminabile dopo invio):</strong>
              <textarea
                className="input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Scrivi un commento (opzionale)..."
                rows={3}
              />
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="file-upload"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="file-upload" className="file-label">
                  {file ? `📎 ${file.name}` : '📎 Allega file (opzionale)'}
                </label>
                {file && (
                  <button
                    className="clear-file-btn"
                    onClick={() => {
                      setFile(null);
                      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!comment.trim() && !file}
              >
                Invia
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
