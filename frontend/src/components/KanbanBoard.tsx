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
                              <span className="ticket-id">#{ticket.id.substring(0, 8)}</span>
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
                                  .replace(/🔗\s*\*\*Link Onboarding:\*\*\s*#[a-f0-9-]+/gi, '')
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
  const [files, setFiles] = useState<File[]>([]);
  const [ticket, setTicket] = useState(initialTicket);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [initialUsers, setInitialUsers] = useState<string[]>([]);
  const [initialDepartments, setInitialDepartments] = useState<string[]>([]);
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

  // Detect if ticket was created from email
  const isEmailTicket = !!(ticket.emailThreadId || (ticket.externalContacts && ticket.externalContacts.length > 0));
  const emailSender = ticket.externalContacts?.[0] || null;

  // Check if description contains HTML (email body)
  const isHtmlDescription = (desc: string) => /<[a-z][\s\S]*>/i.test(desc);

  // Auto-resize iframe to fit content
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        // Wait for images to load then resize
        const resize = () => {
          const height = doc.documentElement.scrollHeight || doc.body.scrollHeight;
          iframe.style.height = Math.min(height + 20, 600) + 'px';
        };
        resize();
        // Resize again after images load
        const images = doc.querySelectorAll('img');
        if (images.length > 0) {
          let loaded = 0;
          images.forEach(img => {
            if (img.complete) { loaded++; }
            else { img.onload = img.onerror = () => { loaded++; if (loaded >= images.length) resize(); }; }
          });
          if (loaded >= images.length) resize();
        }
      }
    } catch {}
  };

  // Build srcdoc for iframe - preserves original email HTML fully
  const buildEmailSrcdoc = (html: string): string => {
    // If it's already a full HTML document, use it as-is with minor safety cleanup
    let content = html
      .replace(/\[ONBOARDING_ID:[^\]]+\]/g, '')
      .replace(/🔗\s*\*\*Link Onboarding:\*\*\s*#[a-f0-9-]+/gi, '');
    // Remove scripts for safety
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');

    // If it's a full HTML doc, inject base styles
    if (/<html/i.test(content)) {
      // Inject a base style for readability
      const baseStyle = `<style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 8px; }</style>`;
      content = content.replace(/<head([^>]*)>/i, `<head$1>${baseStyle}`);
      return content;
    }

    // If it's a fragment, wrap it
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 8px; font-size: 14px; line-height: 1.6; color: #1f2937; }
      img { max-width: 100%; height: auto; }
      table { border-collapse: collapse; }
      a { color: #4f6ef7; }
    </style></head><body>${content}</body></html>`;
  };

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

  // Load all users for assignment (only users with a department = operators)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await usersApi.getAll();
        const operators = response.data.filter((u: any) => u.department);
        setAllUsers(operators);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  // Initialize selected assignments from ticket
  useEffect(() => {
    if (ticket.assignments) {
      const userIds = ticket.assignments.map((a: any) => a.userId);
      setSelectedUsers(userIds);
      setInitialUsers(userIds);
    }
    if (ticket.assignedDepartments) {
      setSelectedDepartments(ticket.assignedDepartments);
      setInitialDepartments(ticket.assignedDepartments);
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

  // Helper: get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  };

  // Assignment panel tab state
  const [assignTab, setAssignTab] = useState<'users' | 'departments'>('users');

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
    const hasFiles = files.length > 0;
    const usersChanged = JSON.stringify([...selectedUsers].sort()) !== JSON.stringify([...initialUsers].sort());
    const deptsChanged = JSON.stringify([...selectedDepartments].sort()) !== JSON.stringify([...initialDepartments].sort());
    const hasAssignments = usersChanged || deptsChanged;

    if (!hasComment && !hasFiles && !hasAssignments) {
      return; // Nothing to submit
    }

    try {
      let createdCommentId = null;

      // If both comment and files are present, create comment first (defer email notification)
      if (hasComment) {
        const commentResponse = await ticketsApi.addComment(ticket.id, comment, hasFiles);
        createdCommentId = commentResponse.data.id;
        console.log('✅ Comment created:', createdCommentId);
      }

      // Upload files, linking them to the comment if both were provided
      if (hasFiles) {
        for (let i = 0; i < files.length; i++) {
          const isLast = i === files.length - 1;
          await ticketsApi.uploadFile(ticket.id, files[i], createdCommentId || undefined, isLast);
          console.log(`✅ File ${i + 1}/${files.length} uploaded` + (createdCommentId ? ' and linked to comment' : ''));
        }
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
      setFiles([]);
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

  // Pulisci contenuto email per la visualizzazione (gestisce anche dati legacy in DB)
  const cleanEmailReplyContent = (content: string, fromEmail?: string): string => {
    let cleaned = content;
    // Rimuovi prefisso legacy "📧 **Risposta da email@...:**"
    cleaned = cleaned.replace(/^📧\s*\*{0,2}Risposta da\s+[^:*]+:?\*{0,2}\s*/i, '');
    // Rimuovi testo template notifica sistema (pattern specifici)
    const notifCutPatterns = [
      /Ticket #[a-f0-9].*(?:Nuovo commento|Nuovo allegato)[\s\S]*/i,
      /Rispondi a questa email per aggiungere[\s\S]*/i,
      /Europoligrafico.*Sistema Kanban[\s\S]*/i,
    ];
    for (const pattern of notifCutPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    // Rimuovi firme nome + titolo (es. "Sandro Sellaro\nIT Specialist")
    const lines = cleaned.trim().split('\n');
    const jobTitlePattern = /^(IT|HR|Sales|Marketing|Account|Project|Product|Business|Chief|Senior|Junior|Lead|Head|Director|Manager|Specialist|Consultant|Engineer|Developer|Analyst|Coordinator|Assistant|Administrator|Responsabile|Direttore|Tecnico|Commerciale|Amministratore|Addetto)\b/i;
    for (let i = lines.length - 1; i >= 1; i--) {
      const line = lines[i].trim();
      if (jobTitlePattern.test(line) && line.length < 50) {
        const prevLine = lines[i - 1].trim();
        if (prevLine.length > 0 && prevLine.length < 50 && /^[A-Z][a-zà-ú]+(\s+[A-Z][a-zà-ú]+){0,3}$/.test(prevLine)) {
          lines.splice(i - 1, 2);
          break;
        }
        lines.splice(i, 1);
        break;
      }
    }

    // Rimuovi nome standalone alla fine (firma senza titolo)
    // Controlla se le ultime righe sono solo un nome proprio (es. "Sandro Sellaro")
    while (lines.length > 0) {
      const lastLine = lines[lines.length - 1].trim();
      if (!lastLine) {
        lines.pop(); // rimuovi righe vuote finali
        continue;
      }
      // Se l'ultima riga sembra un nome (2-3 parole con maiuscola iniziale, corta, senza punteggiatura)
      if (/^[A-Z][a-zà-ú]+(\s+[A-Z][a-zà-ú]+){1,3}$/.test(lastLine) && lastLine.length < 40) {
        // Se abbiamo l'email, verifica che corrisponda
        if (fromEmail) {
          const nameParts = lastLine.toLowerCase().split(/\s+/);
          const emailLocal = fromEmail.split('@')[0].toLowerCase().replace(/[._-]/g, ' ');
          const matchesEmail = nameParts.some(p => emailLocal.includes(p));
          if (matchesEmail) {
            lines.pop();
            continue;
          }
        }
        // Anche senza email, se è l'unico contenuto rimasto, è sicuramente una firma
        const contentLines = lines.filter(l => l.trim().length > 0);
        if (contentLines.length === 1) {
          lines.pop();
        }
        break;
      }
      break;
    }

    return lines.join('\n').trim();
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
          isEmailReply: c.isEmailReply || false,
          fromEmail: c.fromEmail || null,
          attachments: c.attachments || [],
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
            mimeType: att.mimeType,
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
                appearance: 'auto' as any
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
            {isEmailTicket && isHtmlDescription(ticket.description || '') ? (
              <div className="email-description-container">
                <div className="email-description-header">
                  <div className="email-description-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <div className="email-description-meta">
                    <span className="email-description-label">Ricevuto via email</span>
                    {emailSender && (
                      <span className="email-description-sender">Da: {emailSender}</span>
                    )}
                  </div>
                </div>
                <iframe
                  className="email-description-iframe"
                  srcDoc={buildEmailSrcdoc(ticket.description || '')}
                  sandbox="allow-same-origin"
                  onLoad={handleIframeLoad}
                  title="Contenuto email"
                />
              </div>
            ) : (
              <>
                <p><strong>Descrizione:</strong></p>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                  dangerouslySetInnerHTML={{
                    __html: (ticket.description || '')
                      .replace(/\[ONBOARDING_ID:[^\]]+\]/g, '')
                      .replace(/🔗\s*\*\*Link Onboarding:\*\*\s*#[a-f0-9-]+/gi, '')
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0" />')
                      .trim()
                  }}
                />
              </>
            )}

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
            <div className="assignments-header">
              <div className="assignments-header-left">
                <span className="icon">👥</span>
                Assegnazioni
              </div>
              <button
                className="assignments-toggle"
                onClick={() => setShowAssignments(!showAssignments)}
              >
                {showAssignments ? '▲ Chiudi' : '⚙ Gestisci'}
              </button>
            </div>

            {/* Current assignments display */}
            <div className="assignments-body">
              {ticket.assignments && ticket.assignments.length > 0 && (
                <div className="assignments-chips">
                  {ticket.assignments.map((assignment: any) => (
                    <div className="assignment-chip" key={assignment.id}>
                      <span className="avatar user-avatar">
                        {getInitials(assignment.user.firstName, assignment.user.lastName)}
                      </span>
                      <span className="chip-info">
                        <span className="chip-name">{assignment.user.firstName} {assignment.user.lastName}</span>
                        {assignment.user.department && <span className="chip-dept">{assignment.user.department}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {ticket.assignedDepartments && ticket.assignedDepartments.length > 0 && (
                <div className="assignments-chips">
                  {ticket.assignedDepartments.map((dept: string) => (
                    <div className="assignment-chip" key={dept}>
                      <span className="avatar dept-avatar">{dept[0]}</span>
                      <span className="chip-info">
                        <span className="chip-name">{dept}</span>
                        <span className="chip-dept">Reparto</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {(!ticket.assignments || ticket.assignments.length === 0) &&
               (!ticket.assignedDepartments || ticket.assignedDepartments.length === 0) && (
                <div className="assignments-empty">
                  <span>⚠️</span>
                  Nessuna assegnazione — Visibile a tutti
                </div>
              )}
            </div>

            {/* Assignment management panel */}
            {showAssignments && (
              <div className="assignment-panel">
                <div className="assignment-panel-note">
                  <span>ℹ️</span>
                  <span>Puoi assegnare a <strong>utenti</strong> o <strong>reparti</strong>, non entrambi. Le modifiche saranno salvate con "Invia".</span>
                </div>

                {/* Tabs */}
                <div className="assignment-panel-tabs">
                  <button
                    className={`assignment-tab ${assignTab === 'users' ? 'active' : ''} ${selectedDepartments.length > 0 ? 'disabled' : ''}`}
                    onClick={() => !selectedDepartments.length && setAssignTab('users')}
                  >
                    👤 Utenti
                  </button>
                  <button
                    className={`assignment-tab ${assignTab === 'departments' ? 'active' : ''} ${selectedUsers.length > 0 ? 'disabled' : ''}`}
                    onClick={() => !selectedUsers.length && setAssignTab('departments')}
                  >
                    🏢 Reparti
                  </button>
                </div>

                {/* Users tab */}
                {assignTab === 'users' && (
                  <div>
                    <div className="assignment-search-wrapper">
                      <span className="assignment-search-icon">🔍</span>
                      <input
                        type="text"
                        className="assignment-search"
                        placeholder="Cerca utente..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        disabled={selectedDepartments.length > 0}
                      />
                    </div>
                    <div className="assignment-list">
                      {allUsers
                        .filter((u: any) => {
                          const searchLower = userSearchTerm.toLowerCase();
                          const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                          const dept = (u.department || '').toLowerCase();
                          return fullName.includes(searchLower) || dept.includes(searchLower);
                        })
                        .map((u: any) => {
                          const isSelected = selectedUsers.includes(u.id);
                          const isDisabled = selectedDepartments.length > 0;
                          return (
                            <div
                              key={u.id}
                              className={`assignment-list-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                              onClick={() => !isDisabled && handleUserSelection(u.id)}
                            >
                              <div className="avatar-sm" style={{ background: isSelected ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#cbd5e1' }}>
                                {getInitials(u.firstName, u.lastName)}
                              </div>
                              <div className="item-info">
                                <div className="item-name">{u.firstName} {u.lastName}</div>
                                {u.department && <div className="item-dept">{u.department}</div>}
                              </div>
                              <div className="check-icon">{isSelected ? '✓' : ''}</div>
                            </div>
                          );
                        })}
                    </div>
                    <div className="assignment-count">
                      {selectedDepartments.length > 0
                        ? '⚠️ Deseleziona i reparti per assegnare a utenti'
                        : `${selectedUsers.length} utente/i selezionato/i`}
                    </div>
                  </div>
                )}

                {/* Departments tab */}
                {assignTab === 'departments' && (
                  <div>
                    <div className="assignment-search-wrapper">
                      <span className="assignment-search-icon">🔍</span>
                      <input
                        type="text"
                        className="assignment-search"
                        placeholder="Cerca reparto..."
                        value={deptSearchTerm}
                        onChange={(e) => setDeptSearchTerm(e.target.value)}
                        disabled={selectedUsers.length > 0}
                      />
                    </div>
                    <div className="assignment-list">
                      {allDepartments
                        .filter((dept: string) => dept.toLowerCase().includes(deptSearchTerm.toLowerCase()))
                        .map((dept: string) => {
                          const isSelected = selectedDepartments.includes(dept);
                          const isDisabled = selectedUsers.length > 0;
                          return (
                            <div
                              key={dept}
                              className={`assignment-list-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                              onClick={() => !isDisabled && handleDepartmentSelection(dept)}
                            >
                              <div className="avatar-sm" style={{ background: isSelected ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : '#cbd5e1' }}>
                                {dept[0]}
                              </div>
                              <div className="item-info">
                                <div className="item-name">{dept}</div>
                              </div>
                              <div className="check-icon">{isSelected ? '✓' : ''}</div>
                            </div>
                          );
                        })}
                    </div>
                    <div className="assignment-count">
                      {selectedUsers.length > 0
                        ? '⚠️ Deseleziona gli utenti per assegnare a reparti'
                        : `${selectedDepartments.length} reparto/i selezionato/i`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline unificata - Commenti e File */}
          <div className="timeline-section">
            <strong>{isEmailTicket ? 'Conversazione:' : 'Storico attività:'}</strong>
            <div className="timeline-list">
              {timeline.length > 0 ? (
                timeline.map((item) => (
                  <div key={`${item.type}-${item.id}`} className={`timeline-item ${item.type}${item.isEmailReply ? ' email-reply' : ''}`}>
                    {item.type === 'comment' ? (
                      <>
                        <div className="timeline-icon">{item.isEmailReply ? '📧' : '💬'}</div>
                        <div className="timeline-content" style={{ position: 'relative', flex: 1 }}>
                          <div className="timeline-header">
                            {item.isEmailReply ? (
                              <>
                                <strong>{item.fromEmail}</strong>
                                <span className="email-reply-badge">Risposta email</span>
                              </>
                            ) : (
                              <>
                                <strong>
                                  {item.user.firstName} {item.user.lastName}
                                </strong>
                                {item.user.department && (
                                  <span className="user-department">({item.user.department})</span>
                                )}
                              </>
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
                          <p className="timeline-text">
                            {item.isEmailReply
                              ? cleanEmailReplyContent(item.content, item.fromEmail)
                              : item.content}
                          </p>
                          {/* Show attachments linked to this comment */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="comment-attachments">
                              {/* Mostra immagini inline (screenshot, foto) */}
                              {item.attachments
                                .filter((att: any) => att.mimeType && att.mimeType.startsWith('image/'))
                                .map((att: any) => (
                                  <div key={att.id} style={{ marginBottom: '8px', position: 'relative' }}>
                                    <a
                                      href={`http://localhost:5000/uploads/${att.filePath}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <img
                                        src={`http://localhost:5000/uploads/${att.filePath}`}
                                        alt={att.fileName}
                                        style={{
                                          maxWidth: '100%',
                                          maxHeight: '400px',
                                          borderRadius: '6px',
                                          border: '1px solid #e2e8f0',
                                          cursor: 'pointer',
                                        }}
                                      />
                                    </a>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        {att.fileName} ({(att.fileSize / 1024).toFixed(1)} KB)
                                      </span>
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
                                  </div>
                                ))}
                              {/* Mostra altri allegati come link download */}
                              {item.attachments
                                .filter((att: any) => !att.mimeType || !att.mimeType.startsWith('image/'))
                                .map((att: any) => (
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
                          {item.mimeType && item.mimeType.startsWith('image/') ? (
                            <div>
                              <a
                                href={`http://localhost:5000/uploads/${item.filePath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={`http://localhost:5000/uploads/${item.filePath}`}
                                  alt={item.fileName}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '400px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                  }}
                                />
                              </a>
                              <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                                {item.fileName} ({(item.fileSize / 1024).toFixed(1)} KB)
                              </div>
                            </div>
                          ) : (
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
                          )}
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
                  multiple
                  onChange={(e) => {
                    const selected = e.target.files ? Array.from(e.target.files) : [];
                    setFiles(prev => [...prev, ...selected]);
                  }}
                />
                <label htmlFor="file-upload" className="file-label">
                  {files.length > 0
                    ? `📎 ${files.length} file selezionati`
                    : '📎 Allega file (opzionale)'}
                </label>
                {files.length > 0 && (
                  <div className="selected-files-list">
                    {files.map((f, i) => (
                      <span key={i} className="selected-file-tag">
                        {f.name}
                        <button
                          className="clear-file-btn"
                          onClick={() => {
                            setFiles(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          type="button"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!comment.trim() && files.length === 0 && selectedUsers.length === 0 && selectedDepartments.length === 0}
                style={{
                  opacity: (!comment.trim() && files.length === 0 && selectedUsers.length === 0 && selectedDepartments.length === 0) ? 0.5 : 1
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

  // Load all users for assignment (only users with a department = operators)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await usersApi.getAll();
        const operators = response.data.filter((u: any) => u.department);
        setAllUsers(operators);
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
