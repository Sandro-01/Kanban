import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { tickets as ticketsApi, users as usersApi, onboarding as onboardingApi } from '../services/api';
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

      <div className="alert alert-info" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>🖱️</span>
        <div>
          <strong>Drag & Drop Attivo!</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
            Trascina i ticket tra le colonne per aggiornare il loro stato.
            Passa il mouse su un ticket per vedere l'indicatore di trascinamento.
          </p>
        </div>
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
                              {(() => {
                                const clean = (ticket.description || '')
                                  .replace(/\[ONBOARDING_ID:[^\]]+\]/g, '')
                                  .replace(/\*\*/g, '')
                                  .replace(/^---$/gm, '')
                                  .trim();
                                return clean.substring(0, 100) + (clean.length > 100 ? '...' : '');
                              })()}
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
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [deptSearchTerm, setDeptSearchTerm] = useState('');

  // Onboarding equipment form state
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [equipmentData, setEquipmentData] = useState({
    computerType: '',
    phoneType: '',
    needsHeadset: false,
    needsWebcam: false,
    additionalMonitor: false,
    needsMicrosoft365: false,
    softwareNeeded: '',
    systemAccess: '',
    additionalNotes: ''
  });

  // Check if this is an onboarding equipment ticket
  const onboardingIdMatch = ticket.description?.match(/\[ONBOARDING_ID:([^\]]+)\]/);
  const onboardingId = onboardingIdMatch ? onboardingIdMatch[1] : null;
  const isOnboardingTicket = ticket.category === 'Onboarding - Dotazioni' && onboardingId;

  const handleEquipmentSubmit = async () => {
    if (!onboardingId) return;
    try {
      await onboardingApi.updateEquipment(onboardingId, equipmentData);
      alert('Dotazioni salvate con successo! Il ticket IT è stato creato automaticamente.');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Errore salvataggio dotazioni:', error);
      alert(error.response?.data?.error || 'Errore durante il salvataggio delle dotazioni');
    }
  };

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


  // Handle user selection - support multiple users, clear departments
  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        // Remove if already selected
        return prev.filter(id => id !== userId);
      } else {
        // Add to selection and clear departments
        setSelectedDepartments([]);
        return [...prev, userId];
      }
    });
  };

  // Handle department selection - support multiple departments, clear users
  const handleDepartmentSelection = (department: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(department)) {
        // Remove if already selected
        return prev.filter(d => d !== department);
      } else {
        // Add to selection and clear users
        setSelectedUsers([]);
        return [...prev, department];
      }
    });
  };

  // Get unique departments from users
  const allDepartments = Array.from(new Set(allUsers.map((u: any) => u.department).filter(Boolean)));

  // Unified handler for comment, file, and assignments
  const handleSubmit = async () => {
    // Check if there's anything to submit
    const hasComment = comment.trim();
    const hasFile = file !== null;
    const hasAssignments = selectedUsers.length > 0 || selectedDepartments.length > 0;

    if (!hasComment && !hasFile && !hasAssignments) {
      return; // Nothing to submit
    }

    try {
      let createdCommentId = null;

      // If both comment and file are present, create comment first
      if (hasComment) {
        const commentResponse = await ticketsApi.addComment(ticket.id, comment);
        createdCommentId = commentResponse.data.id;
        console.log('✅ Comment created:', createdCommentId);
      }

      // Upload file, linking it to the comment if both were provided
      if (hasFile) {
        await ticketsApi.uploadFile(ticket.id, file, createdCommentId || undefined);
        console.log('✅ File uploaded' + (createdCommentId ? ' and linked to comment' : ''));
      }

      // Handle assignments (users have priority)
      if (hasAssignments) {
        if (selectedUsers.length > 0) {
          await ticketsApi.assignUsers(ticket.id, selectedUsers);
          console.log('✅ Users assigned:', selectedUsers);
        } else if (selectedDepartments.length > 0) {
          await ticketsApi.assignDepartments(ticket.id, selectedDepartments);
          console.log('✅ Departments assigned:', selectedDepartments);
        }
        // Close the assignment panel after successful assignment
        setShowAssignments(false);
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

  // Delete comment (admin only)
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo commento? Questa azione è irreversibile.')) {
      return;
    }
    try {
      await ticketsApi.deleteComment(ticket.id, commentId);
      await refreshTicket();
      onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Errore durante l\'eliminazione del commento');
    }
  };

  // Delete attachment (admin only)
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo file? Questa azione è irreversibile.')) {
      return;
    }
    try {
      await ticketsApi.deleteAttachment(ticket.id, attachmentId);
      await refreshTicket();
      onUpdate();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Errore durante l\'eliminazione del file');
    }
  };

  // Delete ticket (admin only)
  const handleDeleteTicket = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo ticket? Questa azione è irreversibile e eliminerà anche tutti i commenti e file associati.')) {
      return;
    }
    try {
      await ticketsApi.delete(ticket.id);
      alert('Ticket eliminato con successo');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Errore durante l\'eliminazione del ticket');
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
            <select
              className={`badge badge-${ticket.priority.toLowerCase()}`}
              value={ticket.priority}
              onChange={async (e) => {
                const newPriority = e.target.value;
                try {
                  await ticketsApi.update(ticket.id, { priority: newPriority });
                  setTicket({ ...ticket, priority: newPriority });
                  onUpdate();
                } catch (err) {
                  console.error('Errore aggiornamento priorità:', err);
                }
              }}
              style={{
                cursor: 'pointer',
                border: '1px solid transparent',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: '600',
                appearance: 'auto',
                WebkitAppearance: 'auto'
              }}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {user.role === 'ADMIN' && (
              <button
                className="btn btn-secondary"
                onClick={handleDeleteTicket}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '12px',
                  padding: '5px 10px'
                }}
                title="Elimina ticket (solo ADMIN)"
              >
                🗑️ Elimina
              </button>
            )}
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="ticket-modal-content">
          <div className="ticket-info">
            <p><strong>Descrizione:</strong></p>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              dangerouslySetInnerHTML={{
                __html: (ticket.description || '')
                  .replace(/\[ONBOARDING_ID:[^\]]+\]/g, '')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0" />')
                  .trim()
              }}
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

          {/* Form Dotazioni Onboarding - visibile solo per ticket onboarding */}
          {isOnboardingTicket && ticket.status !== 'RESOLVED' && (
            <div style={{ margin: '15px 0', padding: '15px', backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '8px' }}>
              {!showEquipmentForm ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: '10px', fontWeight: '600' }}>
                    Questo ticket richiede la compilazione delle dotazioni per il nuovo dipendente.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowEquipmentForm(true)}
                    style={{ fontSize: '15px', padding: '10px 25px' }}
                  >
                    Compila Dotazioni
                  </button>
                </div>
              ) : (
                <div>
                  <h3 style={{ marginBottom: '15px', borderBottom: '2px solid #f59e0b', paddingBottom: '8px' }}>
                    Dotazioni per il Nuovo Dipendente
                  </h3>

                  {/* Hardware */}
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#1a202c', borderBottom: '2px solid #10b981', paddingBottom: '4px' }}>
                    Dotazioni Hardware
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div className="form-group">
                      <label className="label">Computer</label>
                      <select className="input" value={equipmentData.computerType} onChange={(e) => setEquipmentData({ ...equipmentData, computerType: e.target.value })}>
                        <option value="">Seleziona...</option>
                        <option value="Portatile">Portatile</option>
                        <option value="Desktop">Desktop</option>
                        <option value="Non necessario">Non necessario</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Telefono Aziendale</label>
                      <select className="input" value={equipmentData.phoneType} onChange={(e) => setEquipmentData({ ...equipmentData, phoneType: e.target.value })}>
                        <option value="">Seleziona...</option>
                        <option value="Fisso">Telefono Fisso</option>
                        <option value="Android">Smartphone Android</option>
                        <option value="Non necessario">Non necessario</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: equipmentData.needsHeadset ? '#dbeafe' : 'transparent' }}>
                      <input type="checkbox" checked={equipmentData.needsHeadset} onChange={(e) => setEquipmentData({ ...equipmentData, needsHeadset: e.target.checked })} style={{ marginRight: '8px' }} />
                      Cuffie
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: equipmentData.needsWebcam ? '#dbeafe' : 'transparent' }}>
                      <input type="checkbox" checked={equipmentData.needsWebcam} onChange={(e) => setEquipmentData({ ...equipmentData, needsWebcam: e.target.checked })} style={{ marginRight: '8px' }} />
                      Webcam
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: equipmentData.additionalMonitor ? '#dbeafe' : 'transparent' }}>
                      <input type="checkbox" checked={equipmentData.additionalMonitor} onChange={(e) => setEquipmentData({ ...equipmentData, additionalMonitor: e.target.checked })} style={{ marginRight: '8px' }} />
                      Schermo aggiuntivo
                    </label>
                  </div>

                  {/* Software e Accessi */}
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#1a202c', borderBottom: '2px solid #f59e0b', paddingBottom: '4px' }}>
                    Software e Accessi
                  </h4>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: equipmentData.needsMicrosoft365 ? '#dbeafe' : 'transparent', marginBottom: '10px' }}>
                    <input type="checkbox" checked={equipmentData.needsMicrosoft365} onChange={(e) => setEquipmentData({ ...equipmentData, needsMicrosoft365: e.target.checked })} style={{ marginRight: '10px' }} />
                    <span style={{ fontWeight: '500' }}>Pacchetto Microsoft 365</span>
                  </label>
                  <div className="form-group">
                    <label className="label">Software Specifici</label>
                    <textarea className="input" placeholder="es. PackWay, HubSpot, ArtiosCAD..." value={equipmentData.softwareNeeded} onChange={(e) => setEquipmentData({ ...equipmentData, softwareNeeded: e.target.value })} rows={2} />
                  </div>
                  <div className="form-group">
                    <label className="label">Accessi Sistemi</label>
                    <textarea className="input" placeholder="es. VPN, cartelle condivise, ERP, CRM..." value={equipmentData.systemAccess} onChange={(e) => setEquipmentData({ ...equipmentData, systemAccess: e.target.value })} rows={2} />
                  </div>

                  {/* Note */}
                  <div className="form-group">
                    <label className="label">Note Aggiuntive</label>
                    <textarea className="input" placeholder="Altre richieste..." value={equipmentData.additionalNotes} onChange={(e) => setEquipmentData({ ...equipmentData, additionalNotes: e.target.value })} rows={2} />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowEquipmentForm(false)}>Annulla</button>
                    <button className="btn btn-primary" onClick={handleEquipmentSubmit}>
                      Salva Dotazioni e Crea Ticket IT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                  ⚠️ <strong>Nota:</strong> Puoi assegnare il ticket a più utenti O a più reparti, non entrambi.
                  Le assegnazioni verranno salvate quando clicchi "Invia" in fondo alla pagina.
                </div>

                {/* User assignment with search */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Assegna a Utenti:
                  </label>
                  <input
                    type="text"
                    placeholder="🔍 Cerca utente..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    disabled={selectedDepartments.length > 0}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginBottom: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      opacity: selectedDepartments.length > 0 ? 0.5 : 1
                    }}
                  />
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white'
                  }}>
                    {allUsers
                      .filter((u: any) => {
                        const searchLower = userSearchTerm.toLowerCase();
                        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                        const dept = (u.department || '').toLowerCase();
                        return fullName.includes(searchLower) || dept.includes(searchLower);
                      })
                      .map((u: any) => (
                        <div
                          key={u.id}
                          onClick={() => !selectedDepartments.length && handleUserSelection(u.id)}
                          style={{
                            padding: '10px',
                            cursor: selectedDepartments.length > 0 ? 'not-allowed' : 'pointer',
                            backgroundColor: selectedUsers.includes(u.id) ? '#e0f2fe' : 'white',
                            borderBottom: '1px solid #f0f0f0',
                            opacity: selectedDepartments.length > 0 ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={() => {}}
                            disabled={selectedDepartments.length > 0}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>
                            {u.firstName} {u.lastName} {u.department && `(${u.department})`}
                          </span>
                        </div>
                      ))}
                  </div>
                  <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    {selectedDepartments.length > 0
                      ? '⚠️ Deseleziona i reparti per assegnare a utenti'
                      : `${selectedUsers.length} utente/i selezionato/i`}
                  </small>
                </div>

                {/* Department assignment with search */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Assegna a Reparti:
                  </label>
                  <input
                    type="text"
                    placeholder="🔍 Cerca reparto..."
                    value={deptSearchTerm}
                    onChange={(e) => setDeptSearchTerm(e.target.value)}
                    disabled={selectedUsers.length > 0}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginBottom: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      opacity: selectedUsers.length > 0 ? 0.5 : 1
                    }}
                  />
                  <div style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white'
                  }}>
                    {allDepartments
                      .filter((dept: string) => dept.toLowerCase().includes(deptSearchTerm.toLowerCase()))
                      .map((dept: string) => (
                        <div
                          key={dept}
                          onClick={() => !selectedUsers.length && handleDepartmentSelection(dept)}
                          style={{
                            padding: '10px',
                            cursor: selectedUsers.length > 0 ? 'not-allowed' : 'pointer',
                            backgroundColor: selectedDepartments.includes(dept) ? '#fef3c7' : 'white',
                            borderBottom: '1px solid #f0f0f0',
                            opacity: selectedUsers.length > 0 ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDepartments.includes(dept)}
                            onChange={() => {}}
                            disabled={selectedUsers.length > 0}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>{dept}</span>
                        </div>
                      ))}
                  </div>
                  <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    {selectedUsers.length > 0
                      ? '⚠️ Deseleziona gli utenti per assegnare a reparti'
                      : `${selectedDepartments.length} reparto/i selezionato/i`}
                  </small>
                </div>
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
                        <div className="timeline-content" style={{ position: 'relative', flex: 1 }}>
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
                            {user.role === 'ADMIN' && (
                              <button
                                onClick={() => handleDeleteComment(item.id)}
                                style={{
                                  marginLeft: '10px',
                                  padding: '2px 8px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                                title="Elimina commento (solo ADMIN)"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                          <p className="timeline-text">{item.content}</p>
                          {/* Show attachments linked to this comment */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="comment-attachments">
                              {item.attachments.map((att: any) => (
                                <div key={att.id} className="timeline-file" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div>
                                    <a
                                      href={`http://localhost:5000/uploads/${att.filePath}`}
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
                                  {user.role === 'ADMIN' && (
                                    <button
                                      onClick={() => handleDeleteAttachment(att.id)}
                                      style={{
                                        padding: '2px 8px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '11px'
                                      }}
                                      title="Elimina file (solo ADMIN)"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="timeline-icon">📎</div>
                        <div className="timeline-content" style={{ position: 'relative', flex: 1 }}>
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
                            {user.role === 'ADMIN' && (
                              <button
                                onClick={() => handleDeleteAttachment(item.id)}
                                style={{
                                  marginLeft: '10px',
                                  padding: '2px 8px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                                title="Elimina file (solo ADMIN)"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                          <div className="timeline-file">
                            <a
                              href={`http://localhost:5000/uploads/${item.filePath}`}
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
                disabled={!comment.trim() && !file && selectedUsers.length === 0 && selectedDepartments.length === 0}
                style={{
                  opacity: (!comment.trim() && !file && selectedUsers.length === 0 && selectedDepartments.length === 0) ? 0.5 : 1
                }}
              >
                Invia {(selectedUsers.length > 0 || selectedDepartments.length > 0) && '(con assegnazione)'}
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
