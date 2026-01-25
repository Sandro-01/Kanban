import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { tickets as ticketsApi, users as usersApi } from '../services/api';
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
const TicketModal: React.FC<any> = ({ ticket: initialTicket, user, onClose, onUpdate, onMove }) => {
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [ticket, setTicket] = useState(initialTicket);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  // Load all users for assignment
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await usersApi.getAll();
        setAllUsers(response.data);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  // Initialize selected assignments from ticket
  useEffect(() => {
    if (ticket.assignments) {
      setSelectedUsers(ticket.assignments.map((a: any) => a.userId));
    }
    if (ticket.assignedDepartments) {
      setSelectedDepartments(ticket.assignedDepartments);
    }
  }, [ticket]);

  // Refresh ticket data
  const refreshTicket = async () => {
    try {
      setRefreshing(true);
      const response = await ticketsApi.getById(ticket.id);
      setTicket(response.data);
      console.log('✅ Ticket refreshed');
    } catch (error) {
      console.error('Error refreshing ticket:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle assignment changes
  const handleAssignUsers = async () => {
    try {
      await ticketsApi.assignUsers(ticket.id, selectedUsers);
      await refreshTicket();
      onUpdate();
      alert('Utenti assegnati con successo!');
    } catch (error) {
      console.error('Error assigning users:', error);
      alert('Errore durante l\'assegnazione utenti');
    }
  };

  const handleAssignDepartments = async () => {
    try {
      await ticketsApi.assignDepartments(ticket.id, selectedDepartments);
      await refreshTicket();
      onUpdate();
      alert('Reparti assegnati con successo!');
    } catch (error) {
      console.error('Error assigning departments:', error);
      alert('Errore durante l\'assegnazione reparti');
    }
  };

  // Unified assignment handler
  const handleAssign = async () => {
    try {
      // Users have priority - if users are selected, assign users only
      if (selectedUsers.length > 0) {
        await ticketsApi.assignUsers(ticket.id, selectedUsers);
      }
      // If no users, check for departments
      else if (selectedDepartments.length > 0) {
        await ticketsApi.assignDepartments(ticket.id, selectedDepartments);
      }

      await refreshTicket();
      onUpdate();

      // Close the assignment panel after successful assignment
      setShowAssignments(false);
    } catch (error) {
      console.error('Error during assignment:', error);
      alert('Errore durante l\'assegnazione');
    }
  };

  // Handle user selection - clear departments when user is selected
  const handleUserSelection = (userId: string) => {
    if (userId) {
      setSelectedUsers([userId]);
      setSelectedDepartments([]); // Clear departments
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle department selection - clear users when department is selected
  const handleDepartmentSelection = (department: string) => {
    if (department) {
      setSelectedDepartments([department]);
      setSelectedUsers([]); // Clear users
    } else {
      setSelectedDepartments([]);
    }
  };

  // Get unique departments from users
  const allDepartments = Array.from(new Set(allUsers.map((u: any) => u.department).filter(Boolean)));

  // Unified handler for both comment and file
  const handleSubmit = async () => {
    if (!comment.trim() && !file) return;

    try {
      let createdCommentId = null;

      // If both comment and file are present, create comment first
      if (comment.trim()) {
        const commentResponse = await ticketsApi.addComment(ticket.id, comment);
        createdCommentId = commentResponse.data.id;
        console.log('✅ Comment created:', createdCommentId);
      }

      // Upload file, linking it to the comment if both were provided
      if (file) {
        await ticketsApi.uploadFile(ticket.id, file, createdCommentId || undefined);
        console.log('✅ File uploaded' + (createdCommentId ? ' and linked to comment' : ''));
      }

      // Reset form
      setComment('');
      setFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh ticket data to show new comment/file
      await refreshTicket();

      // Also update the main ticket list
      onUpdate();
    } catch (error) {
      console.error('Errore invio:', error);
      alert('Errore durante l\'invio. Riprova.');
    }
  };

  // Create unified timeline with both comments and files
  const getTimeline = () => {
    const items: any[] = [];

    // Add comments with their attachments
    if (ticket.comments) {
      ticket.comments.forEach((c: any) => {
        items.push({
          type: 'comment',
          id: c.id,
          date: new Date(c.createdAt),
          user: c.user,
          content: c.content,
          attachments: c.attachments || [], // Include attachments linked to this comment
        });
      });
    }

    // Add only standalone files (files not linked to any comment)
    if (ticket.attachments) {
      ticket.attachments.forEach((att: any) => {
        // Only add if not linked to a comment
        if (!att.commentId) {
          items.push({
            type: 'file',
            id: att.id,
            date: new Date(att.createdAt || Date.now()),
            user: att.uploadedBy,
            fileName: att.fileName,
            filePath: att.filePath,
            fileSize: att.fileSize,
          });
        }
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

          {/* Assegnazioni */}
          <div className="assignments-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Assegnazioni:</strong>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAssignments(!showAssignments)}
                style={{ fontSize: '12px', padding: '5px 10px' }}
              >
                {showAssignments ? 'Nascondi' : 'Gestisci'}
              </button>
            </div>

            {/* Current assignments display */}
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              {ticket.assignments && ticket.assignments.length > 0 && (
                <div>
                  <strong>👤 Utenti assegnati:</strong>
                  <div style={{ marginLeft: '10px' }}>
                    {ticket.assignments.map((assignment: any) => (
                      <div key={assignment.id}>
                        • {assignment.user.firstName} {assignment.user.lastName}
                        {assignment.user.department && ` (${assignment.user.department})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ticket.assignedDepartments && ticket.assignedDepartments.length > 0 && (
                <div style={{ marginTop: '5px' }}>
                  <strong>🏢 Reparti assegnati:</strong>
                  <div style={{ marginLeft: '10px' }}>
                    {ticket.assignedDepartments.map((dept: string) => (
                      <div key={dept}>• {dept}</div>
                    ))}
                  </div>
                </div>
              )}
              {(!ticket.assignments || ticket.assignments.length === 0) &&
               (!ticket.assignedDepartments || ticket.assignedDepartments.length === 0) && (
                <div style={{ color: '#999', fontStyle: 'italic' }}>
                  Nessuna assegnazione - Visibile a tutti (status OPEN)
                </div>
              )}
            </div>

            {/* Assignment management UI */}
            {showAssignments && (
              <div style={{ marginTop: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#fffbcc', borderRadius: '5px', fontSize: '13px' }}>
                  ⚠️ <strong>Nota:</strong> Puoi assegnare il ticket O a un utente O a un reparto, non entrambi.
                  Selezionando un utente verrà deselezionato il reparto e viceversa.
                </div>

                {/* User assignment */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Assegna a Utente:
                  </label>
                  <select
                    value={selectedUsers[0] || ''}
                    onChange={(e) => handleUserSelection(e.target.value)}
                    disabled={selectedDepartments.length > 0}
                    style={{
                      width: '100%',
                      padding: '8px',
                      opacity: selectedDepartments.length > 0 ? 0.5 : 1,
                      cursor: selectedDepartments.length > 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">Nessun utente</option>
                    {allUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} {u.department && `(${u.department})`}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    {selectedDepartments.length > 0
                      ? '⚠️ Deseleziona i reparti per assegnare a un utente'
                      : 'Seleziona un utente a cui assegnare il ticket'}
                  </small>
                </div>

                {/* Department assignment */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Assegna a Reparto:
                  </label>
                  <select
                    value={selectedDepartments[0] || ''}
                    onChange={(e) => handleDepartmentSelection(e.target.value)}
                    disabled={selectedUsers.length > 0}
                    style={{
                      width: '100%',
                      padding: '8px',
                      opacity: selectedUsers.length > 0 ? 0.5 : 1,
                      cursor: selectedUsers.length > 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">Nessun reparto</option>
                    {allDepartments.map((dept: string) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    {selectedUsers.length > 0
                      ? '⚠️ Deseleziona l\'utente per assegnare a un reparto'
                      : 'Tutti gli utenti del reparto selezionato potranno vedere il ticket'}
                  </small>
                </div>

                {/* Single unified button */}
                <button
                  className="btn btn-primary"
                  onClick={handleAssign}
                  disabled={selectedUsers.length === 0 && selectedDepartments.length === 0}
                  style={{
                    width: '100%',
                    fontSize: '14px',
                    padding: '10px',
                    opacity: (selectedUsers.length === 0 && selectedDepartments.length === 0) ? 0.5 : 1
                  }}
                >
                  Invia Assegnazione
                </button>
              </div>
            )}
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
                          {/* Show attachments linked to this comment */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="comment-attachments">
                              {item.attachments.map((att: any) => (
                                <div key={att.id} className="timeline-file">
                                  <a
                                    href={`http://localhost:3001/uploads/${att.filePath}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                  >
                                    📎 {att.fileName}
                                  </a>
                                  <span className="file-size">
                                    ({(att.fileSize / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
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
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [assignToUser, setAssignToUser] = useState('');
  const [assignToDepartment, setAssignToDepartment] = useState('');

  // Load all users for assignment
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await usersApi.getAll();
        setAllUsers(response.data);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  // Get unique departments from users
  const allDepartments = Array.from(new Set(allUsers.map((u: any) => u.department).filter(Boolean)));

  // Categories for packaging company
  const categories = [
    'Produzione',
    'Qualità',
    'Manutenzione',
    'Logistica',
    'Acquisti',
    'Sicurezza',
    'Ambiente',
    'IT/Sistemi',
    'Amministrazione',
    'Risorse Umane',
    'Commerciale',
    'R&D/Sviluppo Prodotto',
    'Altro'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create ticket first
      const ticketResponse = await ticketsApi.create({
        ...formData,
        boardId: 'default-board',
        columnId: 'col-todo',
      });

      const ticketId = ticketResponse.data.id;

      // Then assign to user or department if selected
      if (assignToUser) {
        await ticketsApi.assignUsers(ticketId, [assignToUser]);
      } else if (assignToDepartment) {
        await ticketsApi.assignDepartments(ticketId, [assignToDepartment]);
      }

      onCreate();
      onClose();
    } catch (error) {
      console.error('Errore creazione ticket:', error);
      alert('Errore durante la creazione del ticket');
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
            <select
              className="input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">Seleziona una categoria...</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Assegna a Utente (opzionale)</label>
            <select
              className="input"
              value={assignToUser}
              onChange={(e) => {
                setAssignToUser(e.target.value);
                if (e.target.value) setAssignToDepartment(''); // Clear department
              }}
              disabled={!!assignToDepartment}
            >
              <option value="">Nessun utente</option>
              {allUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} {u.department && `(${u.department})`}
                </option>
              ))}
            </select>
            {assignToDepartment && (
              <small style={{ color: '#f59e0b', display: 'block', marginTop: '5px' }}>
                ⚠️ Deseleziona il reparto per assegnare a un utente
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="label">Assegna a Reparto (opzionale)</label>
            <select
              className="input"
              value={assignToDepartment}
              onChange={(e) => {
                setAssignToDepartment(e.target.value);
                if (e.target.value) setAssignToUser(''); // Clear user
              }}
              disabled={!!assignToUser}
            >
              <option value="">Nessun reparto</option>
              {allDepartments.map((dept: string) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {assignToUser && (
              <small style={{ color: '#f59e0b', display: 'block', marginTop: '5px' }}>
                ⚠️ Deseleziona l'utente per assegnare a un reparto
              </small>
            )}
          </div>

          <div style={{ padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '5px', marginBottom: '15px', fontSize: '13px' }}>
            ℹ️ <strong>Nota:</strong> Se non assegni il ticket, sarà visibile a tutti in "To Do"
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
