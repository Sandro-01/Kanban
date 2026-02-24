import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { tickets as ticketsApi, users as usersApi, onboarding as onboardingApi, ai as aiApi, UPLOADS_URL } from '../services/api';
import RichTextEditor, { RichTextEditorHandle } from './RichTextEditor';
import UserAvatar, { getAvatarColor } from './UserAvatar';
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
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDragging = useRef(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Auto-naviga al ticket se arriva dalla notifica (?ticketId=...)
  useEffect(() => {
    const ticketId = searchParams.get('ticketId');
    if (ticketId) {
      navigate(`/tickets/${ticketId}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const loadTickets = useCallback(async () => {
    try {
      const response = await ticketsApi.getAll();
      setTickets(response.data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount then every 30 seconds; skip refresh during drag
  useEffect(() => {
    loadTickets();
    const interval = setInterval(() => {
      if (!isDragging.current) loadTickets();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  const handleMoveTicket = async (ticketId: string, newStatus: string) => {
    try {
      await ticketsApi.update(ticketId, { status: newStatus });
      loadTickets();
    } catch (error) {
      console.error('Error moving ticket:', error);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    isDragging.current = false;
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;
    await handleMoveTicket(draggableId, newStatus);
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      CRITICAL: '#000000',
      HIGH: '#333333',
      MEDIUM: '#FFE600',
      LOW: '#D0C8BF',
    };
    return colors[priority] || '#888888';
  };

  const getTicketsForColumn = (status: string) => {
    return tickets.filter((t) => t.status === status);
  };

  const isOverdue = (ticket: any) => {
    return new Date(ticket.dueDate) < new Date() && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="page kanban-page">
      <div className="page-header">
        <h1>Kanban Board</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewTicket(true)}
          >
            + New Ticket
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowSendEmail(true)}
          >
            Send Email
          </button>
        </div>
      </div>

      <DragDropContext onDragStart={() => { isDragging.current = true; }} onDragEnd={handleDragEnd}>
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
                            onClick={() => { if (!isDragging.current) navigate(`/tickets/${ticket.id}`); }}
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
                                  .replace(/<[^>]*>/g, '')          // strip HTML tags
                                  .replace(/&nbsp;/gi, ' ')         // decode entities
                                  .replace(/&amp;/gi, '&')
                                  .replace(/&lt;/gi, '<')
                                  .replace(/&gt;/gi, '>')
                                  .replace(/&quot;/gi, '"')
                                  .replace(/&#\d+;/g, '')
                                  .replace(/\[ONBOARDING_ID:[^\]]+\]/g, '')
                                  .replace(/🔗\s*\*\*Link Onboarding:\*\*\s*#[a-f0-9-]+/gi, '')
                                  .replace(/\*\*/g, '')
                                  .replace(/^---$/gm, '')
                                  .replace(/\s+/g, ' ')             // collapse whitespace
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
                                  ⏱️ {new Date(ticket.dueDate).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                              {ticket.slaViolated && (
                                <span className="sla-badge sla-violated">SLA Violated</span>
                              )}
                            </div>

                            {ticket.attachments?.length > 0 && (
                              <div className="attachments-indicator">
                                📎 {ticket.attachments.length} file
                              </div>
                            )}

                            {/* Email source badge */}
                            {!!(ticket.emailThreadId || ticket.externalContacts?.length > 0) && (
                              <div className="card-email-source">
                                <span className="card-email-icon">✉</span>
                                <span className="card-email-addr">
                                  {ticket.externalContacts?.[0]?.email || 'via email'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {getTicketsForColumn(column.status).length === 0 && (
                      <div className="empty-column">No tickets</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showNewTicket && (
        <NewTicketModal
          user={user}
          onClose={() => setShowNewTicket(false)}
          onCreate={loadTickets}
        />
      )}

      {showSendEmail && (
        <SendExternalEmailModal
          user={user}
          onClose={() => setShowSendEmail(false)}
          onCreate={loadTickets}
        />
      )}
    </div>
  );
};

const EMOJI_LIST = [
  '😀','😂','😊','😍','🤔','😅','😢','😡','🥳','👏',
  '👍','👎','👋','🙏','🎉','🔥','❤️','✅','❌','⚠️',
  '💡','📎','🔗','📧','📱','💻','⚙️','🔧','📝','📊',
  '🗓️','🚀','⏰','🔍','💬','📌','🏷️','🗂️','✏️','🖊️',
];

// ── Conversation helpers ───────────────────────────────────────────────────


/** Rileva immagini firma email (Outlook inline CID, ATT*, image001…) */
function isSignatureImage(att: any): boolean {
  const name: string = att.fileName || '';
  // CID inline images auto-named by email clients (image001.png, Outlook-abc.jpg, ATT00001.gif)
  if (/^(image\d+|Outlook-[A-Za-z0-9]+|ATT\d+)\.(png|jpg|jpeg|gif|bmp)$/i.test(name)) return true;
  // Common signature asset names
  if (/^(logo|signature|sign|firma)\.(png|jpg|jpeg|gif)$/i.test(name)) return true;
  // NOTE: size-based filter removed — it was incorrectly dropping real user attachments
  return false;
}

/** Chip compatta per allegati nelle card conversation */
const ConvFileChip: React.FC<{ att: any; onDelete?: () => void }> = ({ att, onDelete }) => {
  const url  = `${UPLOADS_URL}/${att.filePath}`;
  const name: string = att.fileName || '';
  const mime: string = att.mimeType || '';
  const sizeKB = att.fileSize ? (att.fileSize / 1024).toFixed(1) : null;
  const icon = mime.startsWith('image/') ? '🖼' : mime.includes('pdf') ? '📄'
    : mime.includes('word') ? '📝' : mime.includes('excel') || mime.includes('spreadsheet') ? '📊' : '📎';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      <a href={url} target="_blank" rel="noopener noreferrer" className="conv-file-chip">
        <span>{icon}</span>
        <span>{name}{sizeKB ? ` · ${sizeKB} KB` : ''}</span>
      </a>
      {onDelete && (
        <button onClick={onDelete} className="conv-file-chip-del" title="Elimina">✕</button>
      )}
    </div>
  );
};

// Ticket modal component
const TicketModal: React.FC<any> = ({ ticket: initialTicket, user, onClose, onUpdate, onMove }) => {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [ticket, setTicket] = useState(initialTicket);
  const [showEmoji, setShowEmoji] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const convEndRef = useRef<HTMLDivElement>(null);
  const [, setRefreshing] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
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

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-scroll conversation to the latest message whenever the ticket opens
  // or a new comment/attachment is added (after send/refresh)
  useEffect(() => {
    convEndRef.current?.scrollIntoView();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, (ticket.comments || []).length, (ticket.attachments || []).length]);

  // Close @mention dropdown on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMentionQuery(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Detect if ticket was created from email
  const isEmailTicket = !!(ticket.emailThreadId || (ticket.externalContacts && ticket.externalContacts.length > 0));
  const emailSender = ticket.externalContacts?.[0] || null;

  // Check if description contains HTML (email body)
  const isHtmlDescription = (desc: string) => /<[a-z][\s\S]*>/i.test(desc);

  // Convert markdown-style description to HTML for rendering
  const renderDescriptionMarkdown = (text: string): string => {
    return text
      // Images: ![alt](url) → <img>
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1" style="max-width:100%;max-height:300px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;display:block;margin:4px 0" /></a>')
      // Links: [text](url) → <a>
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" download style="color:#4f6ef7">$1</a>')
      // Bold: **text** → <strong>
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Horizontal rule: --- → <hr>
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0" />')
      // Newlines → <br>
      .replace(/\n/g, '<br/>');
  };

  // Check if email description has meaningful content worth showing
  const hasSubstantialDescription = (desc: string): boolean => {
    if (!desc) return false;
    // Strip HTML tags to get plain text
    const text = desc.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
    // Too short = not useful
    if (text.length < 30) return false;
    // Known placeholder patterns
    if (/email\s+originale\s+completa\s+in\s+allegato/i.test(text)) return false;
    return true;
  };

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
      alert('Equipment saved successfully! The IT ticket has been created automatically.');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      alert(error.response?.data?.error || 'Error saving equipment');
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

  // Remove a single user assignment (available to all users)
  const handleRemoveUser = async (userId: string) => {
    try {
      await ticketsApi.unassignUser(ticket.id, userId);
      await refreshTicket();
      onUpdate();
    } catch (err) {
      console.error('Error removing user assignment:', err);
    }
  };

  // Remove a department assignment (available to all users)
  const handleRemoveDepartment = async (dept: string) => {
    try {
      const remaining = (ticket.assignedDepartments || []).filter((d: string) => d !== dept);
      await ticketsApi.assignDepartments(ticket.id, remaining);
      await refreshTicket();
      onUpdate();
    } catch (err) {
      console.error('Error removing department assignment:', err);
    }
  };

  // Remove an external contact (available to all users)
  const handleRemoveExternalContact = async (email: string) => {
    try {
      await ticketsApi.removeExternalContact(ticket.id, email);
      await refreshTicket();
      onUpdate();
    } catch (err) {
      console.error('Error removing external contact:', err);
    }
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
    // Check if there's anything to submit (strip HTML tags to detect empty editor)
    // ── Parse @mentions from the comment HTML ─────────────────────────────
    const parseMentions = (html: string) => {
      const div = document.createElement('div');
      div.innerHTML = html;
      const userIds: string[] = [];
      const emails: string[] = [];
      div.querySelectorAll<HTMLElement>('.mention[data-user-id]').forEach(el => {
        const id = el.dataset.userId;
        if (id) userIds.push(id);
      });
      div.querySelectorAll<HTMLElement>('.mention[data-email]').forEach(el => {
        const email = el.dataset.email;
        if (email) emails.push(email);
      });
      return { userIds, emails };
    };

    const { userIds: mentionedUserIds, emails: rawMentionedEmails } = parseMentions(comment);

    // If a mentioned email belongs to an internal user, treat it as a user assignment
    const resolvedFromEmail = rawMentionedEmails
      .map(email => allUsers.find(u => (u.email || '').toLowerCase() === email.toLowerCase()))
      .filter(Boolean)
      .map((u: any) => u.id as string);
    const mentionedEmails = rawMentionedEmails.filter(
      email => !allUsers.some(u => (u.email || '').toLowerCase() === email.toLowerCase())
    );

    const hasComment = comment.replace(/<[^>]*>/g, '').trim();
    const hasFiles = files.length > 0;
    const allAssignedUsers = Array.from(new Set([...selectedUsers, ...mentionedUserIds, ...resolvedFromEmail]));
    const usersChanged = JSON.stringify([...allAssignedUsers].sort()) !== JSON.stringify([...initialUsers].sort());
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

      // Handle assignments — include users from @mentions
      if (hasAssignments) {
        if (allAssignedUsers.length > 0) {
          await ticketsApi.assignUsers(ticket.id, allAssignedUsers);
          console.log('✅ Users assigned (incl. @mentions):', allAssignedUsers);
        } else if (selectedDepartments.length > 0) {
          await ticketsApi.assignDepartments(ticket.id, selectedDepartments);
          console.log('✅ Departments assigned:', selectedDepartments);
        }
        setShowAssignments(false);
      }

      // Handle @mentioned external emails: add to contacts + send email
      if (mentionedEmails.length > 0) {
        await ticketsApi.addExternalContacts(ticket.id, mentionedEmails);
        console.log('✅ External contacts added from @mentions:', mentionedEmails);
        if (hasComment) {
          await ticketsApi.sendEmail(ticket.id, {
            subject: `Re: ${ticket.title}`,
            body: comment,
            toEmails: mentionedEmails,
          });
          console.log('✅ Email sent to @mentioned addresses:', mentionedEmails);
        }
      }

      // Reset form
      setComment('');
      setFiles([]);
      setMentionQuery(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh ticket data to show new comment/file
      await refreshTicket();

      // Also update the main ticket list
      onUpdate();
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error submitting. Please try again.');
    }
  };

  // Delete comment (admin only)
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action is irreversible.')) {
      return;
    }
    try {
      await ticketsApi.deleteComment(ticket.id, commentId);
      await refreshTicket();
      onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment');
    }
  };

  // Delete attachment (admin only)
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this file? This action is irreversible.')) {
      return;
    }
    try {
      await ticketsApi.deleteAttachment(ticket.id, attachmentId);
      await refreshTicket();
      onUpdate();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Error deleting file');
    }
  };

  // Delete ticket (admin only)
  const handleDeleteTicket = async () => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action is irreversible and will also delete all associated comments and files.')) {
      return;
    }
    try {
      await ticketsApi.delete(ticket.id);
      alert('Ticket deleted successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error deleting ticket');
    }
  };

  // Returns true if content looks like an NDR / bounce message
  const isNdrContent = (content: string) =>
    /couldn'?t be delivered|Recipient Unknown|550 5\.\d+\.\d+|Undeliverable:|non è stato possibile recapitare/i.test(content);

  // Clean email content for display (also handles legacy data in DB)
  const cleanEmailReplyContent = (content: string, fromEmail?: string): string => {
    let cleaned = content;

    // ── If content is already HTML (stored from new backend), render directly ─
    // Detect by presence of block-level or structural HTML tags
    if (/^\s*<(html|div|p|table|span|img|h[1-6]|ul|ol|li|br)/i.test(cleaned)) {
      // Only strip XSS vectors; DOMPurify handles the rest at render time
      return cleaned
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
    }

    // ── NDR / bounce detection (Microsoft Exchange, Office 365, Gmail) ──────
    if (isNdrContent(cleaned)) {
      const recipientMatch =
        cleaned.match(/message to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
        cleaned.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+wasn'?t found/i);
      const recipient = recipientMatch ? recipientMatch[1] : '';
      const codeMatch = cleaned.match(/(5\d{2}\s+5\.\d+\.\d+)/);
      const code = codeMatch ? codeMatch[1] : '550 5.1.10';
      return [
        `<strong style="font-size:13px;">&#9888;&ensp;Email non consegnata</strong>`,
        recipient
          ? `<span style="font-size:12px;color:#555;">Destinatario non trovato:&ensp;<strong>${recipient}</strong></span>`
          : '',
        `<span style="font-size:11px;color:#888;display:block;margin-top:4px;">Codice errore: ${code} — l'indirizzo potrebbe essere errato o inesistente.</span>`,
      ].filter(Boolean).join('<br>');
    }
    // ────────────────────────────────────────────────────────────────────────

    // Remove legacy prefix "📧 **Risposta da email@...:**"
    cleaned = cleaned.replace(/^📧\s*\*{0,2}Risposta da\s+[^:*]+:?\*{0,2}\s*/i, '');
    // Remove system notification template text (specific patterns)
    const notifCutPatterns = [
      /Ticket #[a-f0-9].*(?:Nuovo commento|Nuovo allegato)[\s\S]*/i,
      /Rispondi a questa email per aggiungere[\s\S]*/i,
      /Europoligrafico.*Sistema Kanban[\s\S]*/i,
    ];
    for (const pattern of notifCutPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    // ── Strip backend-generated email artifacts ────────────────────────────
    // 1. "Name 🖇/📎 Email originale completa in allegato (PDF)" system notice
    cleaned = cleaned.replace(/[^\n]*Email originale completa in allegato[^\n]*/gi, '');
    // 2. "**Allegati:** ![img](url) …" section — shown separately as chips
    cleaned = cleaned.replace(/\*{0,2}Allegati:?\*{0,2}[\s\S]*$/im, '');
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, ''); // stray markdown images
    // 3. Lone markdown separators
    cleaned = cleaned.replace(/^[-─*]{3,}$/gm, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    // ──────────────────────────────────────────────────────────────────────
    // Remove name + title signatures (e.g. "Sandro Sellaro\nIT Specialist")
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

    // Remove standalone name at the end (signature without title)
    // Controlla se le ultime righe sono solo un nome proprio (es. "Sandro Sellaro")
    while (lines.length > 0) {
      const lastLine = lines[lines.length - 1].trim();
      if (!lastLine) {
        lines.pop(); // remove trailing empty lines
        continue;
      }
      // If the last line looks like a name (2-3 words with initial capital, short, no punctuation)
      if (/^[A-Z][a-zà-ú]+(\s+[A-Z][a-zà-ú]+){1,3}$/.test(lastLine) && lastLine.length < 40) {
        // If we have the email, check that it matches
        if (fromEmail) {
          const nameParts = lastLine.toLowerCase().split(/\s+/);
          const emailLocal = fromEmail.split('@')[0].toLowerCase().replace(/[._-]/g, ' ');
          const matchesEmail = nameParts.some(p => emailLocal.includes(p));
          if (matchesEmail) {
            lines.pop();
            continue;
          }
        }
        // Even without email, if it's the only remaining content, it's definitely a signature
        const contentLines = lines.filter(l => l.trim().length > 0);
        if (contentLines.length === 1) {
          lines.pop();
        }
        break;
      }
      break;
    }

    let result = lines.join('\n').trim();

    // ── Markdown → HTML (only when content is plain text, not already HTML) ─
    if (!/<[a-z][^>]*>/i.test(result)) {
      result = result
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')  // bold
        .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')               // italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')                // [text](url) → text
        .replace(/\n/g, '<br>');                                 // line breaks
    }

    // ── Collapse quoted reply blocks ──────────────────────────────────────
    // 1. HTML <blockquote> (Gmail, Apple Mail, Thunderbird, standard)
    //    Wrap each top-level blockquote in a <details> toggle.
    //    We replace iteratively to avoid greedy regex issues with nesting.
    result = result.replace(
      /(<blockquote\b[^>]*>[\s\S]*?<\/blockquote>)/gi,
      '<details class="email-quote"><summary class="email-quote-sum">▶ Messaggio precedente</summary>$1</details>'
    );
    // 2. Gmail wrapper div (contains "On date, person wrote:" + blockquote inside)
    result = result.replace(
      /(<div\b[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>)/gi,
      (m) => `<details class="email-quote"><summary class="email-quote-sum">▶ Messaggio precedente</summary>${m}</details>`
    );
    // 3. "On … wrote:" / "Il … ha scritto:" orphan line preceding a details block
    result = result.replace(
      /(<p[^>]*>(?:On|Il)\s.{10,200}?(?:wrote:|ha scritto:)\s*<\/p>\s*)(<details class="email-quote")/gi,
      '$2'
    );
    // 4. Outlook-style text separator  ─────────────
    result = result.replace(
      /((?:_{8,}|-{8,})\s*(?:<br\s*\/?>)?\s*(?:Da:|From:|De:).+)/i,
      '<details class="email-quote"><summary class="email-quote-sum">▶ Messaggio precedente</summary>$1</details>'
    );

    return result;
  };

  // Create unified timeline with both comments and files
  const getTimeline = () => {
    const items: any[] = [];

    // ── For email tickets: insert original email as first conversation item ──
    // Zendesk model: the email that opened the ticket is always the first
    // message in the thread. Our backend stores the body in ticket.description
    // instead of creating a comment, so we synthesise the entry here.
    if (isEmailTicket && ticket.description) {
      const ticketCreatedMs = new Date(ticket.createdAt).getTime();
      const hasInitialEmailComment = (ticket.comments || []).some((c: any) =>
        c.isEmailReply && !c.isOutgoingEmail &&
        Math.abs(new Date(c.createdAt).getTime() - ticketCreatedMs) < 120_000
      );
      if (!hasInitialEmailComment) {
        items.push({
          type: 'comment',
          id: 'email-origin',
          date: new Date(ticket.createdAt),
          user: null,
          content: ticket.description,
          isEmailReply: true,
          isOutgoingEmail: false,
          fromEmail: ticket.externalContacts?.[0]?.email || '',
          toEmails: [],
          attachments: [],
        });
      }
    }

    // Add comments with a mutable attachments array (we may push email-linked files into it)
    if (ticket.comments) {
      ticket.comments.forEach((c: any) => {
        items.push({
          type: 'comment',
          id: c.id,
          date: new Date(c.createdAt),
          user: c.user,
          content: c.content,
          isEmailReply: c.isEmailReply || false,
          isOutgoingEmail: c.isOutgoingEmail || false,
          fromEmail: c.fromEmail || null,
          toEmails: c.toEmails || [],
          attachments: [...(c.attachments || [])],   // mutable copy
        });
      });
    }

    if (ticket.attachments) {
      const standaloneFiles = ticket.attachments.filter((att: any) => !att.commentId);

      standaloneFiles.forEach((att: any) => {
        const name: string = att.fileName || '';

        // ── Drop email artifacts ─────────────────────────────────────────
        // 1. Signature / inline images (logo, image001, Outlook-xxx, ATT00…)
        if (isSignatureImage(att)) return;
        // 2. Auto-generated "Email-originale" PDFs saved by the mailer
        if (/email.?originale|original.?email|email_originale/i.test(name)) return;

        // ── For email tickets: associate with the nearest email comment ───
        // Zendesk / Freshdesk model: attachments from the same email live
        // inside the email message card, not as separate cards.
        if (isEmailTicket) {
          const attTime = new Date(att.createdAt || 0).getTime();
          const emailItems = items.filter(i => i.isEmailReply || i.isOutgoingEmail);
          let nearest: any = null;
          let nearestDiff = Infinity;
          emailItems.forEach(i => {
            const diff = Math.abs(i.date.getTime() - attTime);
            if (diff < nearestDiff) { nearest = i; nearestDiff = diff; }
          });
          // Within 60 s → treat as part of that email message
          if (nearest && nearestDiff < 60_000) {
            nearest.attachments.push(att);
            return;
          }
        }

        // ── Truly standalone (manually uploaded) → own card ─────────────
        items.push({
          type: 'file',
          id: att.id,
          date: new Date(att.createdAt || Date.now()),
          user: att.uploadedBy,
          file: att,
        });
      });
    }

    // Sort chronologically oldest → newest
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const timeline = getTimeline();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{ticket.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
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
                    console.error('Error updating priority:', err);
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
              <select
                value={ticket.status}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  if (newStatus !== ticket.status) {
                    onMove(ticket.id, newStatus);
                    onClose();
                  }
                }}
                style={{
                  cursor: 'pointer',
                  border: '2px solid #000000',
                  borderRadius: '0',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: '#F5F0EB',
                  color: '#0A0A0A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  appearance: 'auto' as any
                }}
              >
                <option value="OPEN">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING">Waiting</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
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
                title="Delete ticket (ADMIN only)"
              >
                🗑️ Delete
              </button>
            )}
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="ticket-modal-content">
          <div className="ticket-info">
            {isEmailTicket && !isHtmlDescription(ticket.description || '') ? (
              <div className="email-description-container">
                <div className="email-description-header">
                  <div className="email-description-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <div className="email-description-meta">
                    <span className="email-description-label">Received via email</span>
                    {emailSender && (
                      <span className="email-description-sender">Da: {emailSender}</span>
                    )}
                  </div>
                </div>
                {hasSubstantialDescription(ticket.description || '') && (
                  isHtmlDescription(ticket.description || '') ? (
                    <iframe
                      className="email-description-iframe"
                      srcDoc={buildEmailSrcdoc(ticket.description || '')}
                      sandbox="allow-same-origin"
                      onLoad={handleIframeLoad}
                      title="Email content"
                    />
                  ) : (
                    <div
                      className="email-description-text"
                      dangerouslySetInnerHTML={{
                        __html: renderDescriptionMarkdown(
                          (ticket.description || '').replace(/\[ONBOARDING_ID:[^\]]+\]/g, '').trim()
                        )
                      }}
                    />
                  )
                )}
              </div>
            ) : !isEmailTicket ? (
              <>
                <p><strong>Description:</strong></p>
                <div
                  className="ticket-description-body"
                  dangerouslySetInnerHTML={{
                    __html: renderDescriptionMarkdown(
                      (ticket.description || '')
                        .replace(/\[ONBOARDING_ID:[^\]]+\]/g, '')
                        .replace(/🔗\s*\*\*Link Onboarding:\*\*\s*#[a-f0-9-]+/gi, '')
                        .trim()
                    )
                  }}
                />
              </>
            ) : null /* HTML email ticket: body shown as first item in conversation */}

            <div className="ticket-details">
              <div>
                <strong>Created by:</strong> {ticket.createdBy.firstName} {ticket.createdBy.lastName}
              </div>
              <div>
                <strong>Assigned to:</strong>{' '}
                {ticket.assignedTo
                  ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                  : 'Unassigned'}
              </div>
              <div>
                <strong>SLA Deadline:</strong>{' '}
                {new Date(ticket.dueDate).toLocaleString('en-GB')}
              </div>
              <div>
                <strong>SLA:</strong> {ticket.slaHours} hours
              </div>
            </div>
          </div>

          {/* Onboarding Equipment Form - visible only for onboarding tickets */}
          {isOnboardingTicket && ticket.status !== 'RESOLVED' && (
            <div style={{ margin: '15px 0', padding: '15px', backgroundColor: '#FFE600', border: '2px solid #000000', borderRadius: '0' }}>
              {!showEquipmentForm ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: '10px', fontWeight: '600' }}>
                    This ticket requires filling in the equipment for the new employee.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowEquipmentForm(true)}
                    style={{ fontSize: '15px', padding: '10px 25px' }}
                  >
                    Fill in Equipment
                  </button>
                </div>
              ) : (
                <div>
                  <h3 style={{ marginBottom: '15px', borderBottom: '3px solid #000000', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 900 }}>
                    Equipment for New Employee
                  </h3>

                  {/* Hardware */}
                  <h4 style={{ fontSize: '11px', fontWeight: '900', marginBottom: '10px', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Hardware Equipment
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div className="form-group">
                      <label className="label">Computer</label>
                      <select className="input" value={equipmentData.computerType} onChange={(e) => setEquipmentData({ ...equipmentData, computerType: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="Portatile">Laptop</option>
                        <option value="Desktop">Desktop</option>
                        <option value="Non necessario">Not needed</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Company Phone</label>
                      <select className="input" value={equipmentData.phoneType} onChange={(e) => setEquipmentData({ ...equipmentData, phoneType: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="Fisso">Landline Phone</option>
                        <option value="Android">Smartphone Android</option>
                        <option value="Non necessario">Not needed</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '2px solid #000000', borderRadius: '0', backgroundColor: equipmentData.needsHeadset ? '#FFE600' : 'transparent' }}>
                      <input type="checkbox" checked={equipmentData.needsHeadset} onChange={(e) => setEquipmentData({ ...equipmentData, needsHeadset: e.target.checked })} style={{ marginRight: '8px' }} />
                      Headphones
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '2px solid #000000', borderRadius: '0', backgroundColor: equipmentData.needsWebcam ? '#FFE600' : 'transparent' }}>
                      <input type="checkbox" checked={equipmentData.needsWebcam} onChange={(e) => setEquipmentData({ ...equipmentData, needsWebcam: e.target.checked })} style={{ marginRight: '8px' }} />
                      Webcam
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '2px solid #000000', borderRadius: '0', backgroundColor: equipmentData.additionalMonitor ? '#FFE600' : 'transparent' }}>
                      <input type="checkbox" checked={equipmentData.additionalMonitor} onChange={(e) => setEquipmentData({ ...equipmentData, additionalMonitor: e.target.checked })} style={{ marginRight: '8px' }} />
                      Additional monitor
                    </label>
                  </div>

                  {/* Software and Access */}
                  <h4 style={{ fontSize: '11px', fontWeight: '900', marginBottom: '10px', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Software and Access
                  </h4>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', border: '2px solid #000000', borderRadius: '0', backgroundColor: equipmentData.needsMicrosoft365 ? '#FFE600' : 'transparent', marginBottom: '10px' }}>
                    <input type="checkbox" checked={equipmentData.needsMicrosoft365} onChange={(e) => setEquipmentData({ ...equipmentData, needsMicrosoft365: e.target.checked })} style={{ marginRight: '10px' }} />
                    <span style={{ fontWeight: '500' }}>Microsoft 365 Package</span>
                  </label>
                  <div className="form-group">
                    <label className="label">Specific Software</label>
                    <textarea className="input" placeholder="es. PackWay, HubSpot, ArtiosCAD..." value={equipmentData.softwareNeeded} onChange={(e) => setEquipmentData({ ...equipmentData, softwareNeeded: e.target.value })} rows={2} />
                  </div>
                  <div className="form-group">
                    <label className="label">System Access</label>
                    <textarea className="input" placeholder="es. VPN, cartelle condivise, ERP, CRM..." value={equipmentData.systemAccess} onChange={(e) => setEquipmentData({ ...equipmentData, systemAccess: e.target.value })} rows={2} />
                  </div>

                  {/* Notes */}
                  <div className="form-group">
                    <label className="label">Additional Notes</label>
                    <textarea className="input" placeholder="Other requests..." value={equipmentData.additionalNotes} onChange={(e) => setEquipmentData({ ...equipmentData, additionalNotes: e.target.value })} rows={2} />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowEquipmentForm(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleEquipmentSubmit}>
                      Save Equipment and Create IT Ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assignments */}
          <div className="assignments-section">
            <div className="assignments-header">
              <div className="assignments-header-left">
                <span className="icon" style={{ fontSize: '10px', fontWeight: '900' }}>+</span>
                Assignments
              </div>
              <button
                className="assignments-toggle"
                onClick={() => setShowAssignments(!showAssignments)}
              >
                {showAssignments ? '▲ Close' : '⚙ Manage'}
              </button>
            </div>

            {/* Current assignments display */}
            <div className="assignments-body">
              {ticket.assignments && ticket.assignments.length > 0 && (
                <div className="assignments-chips">
                  {ticket.assignments.map((assignment: any) => (
                    <div className="assignment-chip" key={assignment.id}>
                      <UserAvatar user={assignment.user} className="avatar" />
                      <span className="chip-info">
                        <span className="chip-name">{assignment.user.firstName} {assignment.user.lastName}</span>
                        {assignment.user.department && <span className="chip-dept">{assignment.user.department}</span>}
                      </span>
                      <button
                        className="chip-remove"
                        title="Rimuovi"
                        onClick={() => handleRemoveUser(assignment.userId)}
                      >×</button>
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
                        <span className="chip-dept">Department</span>
                      </span>
                      <button
                        className="chip-remove"
                        title="Rimuovi"
                        onClick={() => handleRemoveDepartment(dept)}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              {ticket.externalContacts && ticket.externalContacts.length > 0 && (
                <div className="assignments-chips">
                  {ticket.externalContacts.map((email: string) => (
                    <div className="assignment-chip" key={email}>
                      <span className="avatar" style={{ background: '#dcfce7', color: '#15803d', fontSize: 14 }}>✉</span>
                      <span className="chip-info">
                        <span className="chip-name" style={{ fontSize: 12 }}>{email}</span>
                        <span className="chip-dept">Esterno</span>
                      </span>
                      <button
                        className="chip-remove"
                        title="Rimuovi"
                        onClick={() => handleRemoveExternalContact(email)}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              {(!ticket.assignments || ticket.assignments.length === 0) &&
               (!ticket.assignedDepartments || ticket.assignedDepartments.length === 0) &&
               (!ticket.externalContacts || ticket.externalContacts.length === 0) && (
                <div className="assignments-empty">
                  <span>⚠️</span>
                  No assignments — Visible to all
                </div>
              )}
            </div>

            {/* Assignment management panel */}
            {showAssignments && (
              <div className="assignment-panel">
                <div className="assignment-panel-note">
                  <span>ℹ️</span>
                  <span>You can assign to <strong>users</strong> or <strong>departments</strong>, not both. Changes will be saved with "Send".</span>
                </div>

                {/* Tabs */}
                <div className="assignment-panel-tabs">
                  <button
                    className={`assignment-tab ${assignTab === 'users' ? 'active' : ''} ${selectedDepartments.length > 0 ? 'disabled' : ''}`}
                    onClick={() => !selectedDepartments.length && setAssignTab('users')}
                  >
                    👤 Users
                  </button>
                  <button
                    className={`assignment-tab ${assignTab === 'departments' ? 'active' : ''} ${selectedUsers.length > 0 ? 'disabled' : ''}`}
                    onClick={() => !selectedUsers.length && setAssignTab('departments')}
                  >
                    🏢 Departments
                  </button>
                </div>

                {/* Users tab */}
                {assignTab === 'users' && (
                  <div>
                    <div className="assignment-search-wrapper">
                      <span className="assignment-search-icon" style={{ fontWeight: '700', fontSize: '11px' }}>○</span>
                      <input
                        type="text"
                        className="assignment-search"
                        placeholder="Search user..."
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
                              <UserAvatar user={u} className="avatar-sm" />
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
                        ? '! Deselect departments to assign to users'
                        : `${selectedUsers.length} user(s) selected`}
                    </div>
                  </div>
                )}

                {/* Departments tab */}
                {assignTab === 'departments' && (
                  <div>
                    <div className="assignment-search-wrapper">
                      <span className="assignment-search-icon" style={{ fontWeight: '700', fontSize: '11px' }}>○</span>
                      <input
                        type="text"
                        className="assignment-search"
                        placeholder="Search department..."
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
                              <div className="avatar-sm" style={{ background: isSelected ? '#FFE600' : '#D0C8BF', color: isSelected ? '#000000' : '#FFFFFF' }}>
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
                        ? '! Deselect users to assign to departments'
                        : `${selectedDepartments.length} department(s) selected`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Conversation / Activity ── */}
          <div className="conv-section">
            <div className="conv-header">
              <span className="conv-header-title">{isEmailTicket ? 'Conversation' : 'Activity'}</span>
              <span className="conv-header-count">{timeline.length} {timeline.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div className="conv-list">
              {timeline.length > 0 ? timeline.map((item) => {
                const isNdr    = item.isEmailReply && isNdrContent(item.content);
                const cardType: string = item.type === 'file' ? 'files'
                  : item.isOutgoingEmail ? 'email-out'
                  : isNdr              ? 'email-ndr'
                  : item.isEmailReply  ? 'email-in'
                  : 'internal';

                const authorName = item.user
                  ? `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim()
                  : '';

                // File type helper (for standalone file cards)
                const getFileTypeInfo = (file: any) => {
                  const mime: string = file?.mimeType || '';
                  const name: string = file?.fileName || '';
                  if (mime.startsWith('image/'))                              return { label: 'IMG', bg: '#0ea5e9' };
                  if (mime.includes('pdf')  || /\.pdf$/i.test(name))          return { label: 'PDF', bg: '#ef4444' };
                  if (mime.includes('word') || /\.(doc|docx)$/i.test(name))   return { label: 'DOC', bg: '#2b579a' };
                  if (mime.includes('excel') || mime.includes('spreadsheet') || /\.(xls|xlsx)$/i.test(name))
                                                                               return { label: 'XLS', bg: '#217346' };
                  if (mime.includes('presentation') || /\.(ppt|pptx)$/i.test(name)) return { label: 'PPT', bg: '#c43e1c' };
                  const ext = name.split('.').pop()?.toUpperCase()?.slice(0, 3) || 'FILE';
                  return { label: ext, bg: '#8b5cf6' };
                };

                // Primary label: for incoming/NDR emails show the from address;
                // for files show who uploaded it; for internal notes/outgoing show author
                const fileAuthor = cardType === 'files'
                  ? (authorName || item.file?.uploadedBy?.email || item.fromEmail || 'Sistema')
                  : null;
                const primaryLabel = (cardType === 'email-in' || cardType === 'email-ndr')
                  ? (item.fromEmail || 'Email')
                  : cardType === 'files'
                  ? fileAuthor!
                  : authorName || 'Sistema';

                // Sub-line: recipient for emails, "filename · size" for files, department for internal notes
                const fileSizeLabel = item.file?.fileSize ? `${(item.file.fileSize / 1024).toFixed(1)} KB` : '';
                const fileNameLabel = item.file?.fileName || '';
                const subLabel = cardType === 'email-in'
                  ? `A: ${ticket.externalContacts?.[0]?.email || 'support'}`
                  : cardType === 'email-out'
                  ? `A: ${(item.toEmails || []).join(', ')}`
                  : cardType === 'email-ndr'
                  ? 'Delivery failure notice'
                  : cardType === 'files'
                  ? [fileNameLabel, fileSizeLabel].filter(Boolean).join(' · ')
                  : item.user?.department || '';

                // Initials / avatar
                const computeInitials = (label: string) => {
                  if (label.includes('@')) {
                    const local = label.split('@')[0];
                    const parts = local.split(/[._-]/);
                    return parts.slice(0, 2).map((p: string) => (p[0] || '').toUpperCase()).join('') || '?';
                  }
                  return label.split(' ').map((n: string) => n[0] || '').join('').slice(0, 2).toUpperCase() || '?';
                };
                const fileTypeInfo = cardType === 'files' ? getFileTypeInfo(item.file) : null;
                // For file cards: show author initials in the avatar (file type shown in subLabel),
                // but keep the file-type colour for quick visual identification
                const initials = fileTypeInfo
                  ? computeInitials(primaryLabel)   // author initials, e.g. "SS" for Sandro Sellaro
                  : computeInitials(primaryLabel);
                const avatarBg  = fileTypeInfo
                  ? fileTypeInfo.bg
                  : (item.user?.avatarColor || getAvatarColor(primaryLabel));

                // Separate real images from inline/signature images (only filter for emails)
                const atts: any[] = item.attachments || [];
                const isEmailItem = item.isEmailReply || item.isOutgoingEmail;
                // Hide inline images (embedded in HTML body) and CID signature images
                const realImages = atts.filter((a: any) =>
                  a.mimeType?.startsWith('image/') &&
                  !(isEmailItem && (a.isInline || isSignatureImage(a)))
                );
                // Hide inline non-image files too (rare but possible)
                const otherFiles = atts.filter((a: any) =>
                  !a.mimeType?.startsWith('image/') && !(isEmailItem && a.isInline)
                );

                const fmtDate = (d: Date) => d.toLocaleString('it-IT', {
                  day: '2-digit', month: 'short', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                });

                const processedContent = item.isEmailReply
                  ? cleanEmailReplyContent(item.content, item.fromEmail)
                  : item.content;

                return (
                  <div key={`${item.type}-${item.id}`} className={`conv-msg conv-msg--${cardType}`}>

                    {/* ── Avatar ── */}
                    {item.user?.avatarUrl ? (
                      <div className="conv-msg-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                        <img src={`${UPLOADS_URL}/${item.user.avatarUrl}`} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ) : (
                      <div className="conv-msg-avatar" style={{ background: avatarBg }}>
                        {initials}
                      </div>
                    )}

                    {/* ── Card ── */}
                    <div className="conv-msg-card">

                      {/* Header */}
                      <div className="conv-msg-head">
                        <div className="conv-msg-sender-col">
                          <span className="conv-msg-primary">{primaryLabel}</span>
                          {subLabel && <span className="conv-msg-sub">{subLabel}</span>}
                        </div>
                        <div className="conv-msg-right-col">
                          {cardType === 'email-in'  && <span className="conv-dir conv-dir--in">↓ Ricevuta</span>}
                          {cardType === 'email-out' && <span className="conv-dir conv-dir--out">↑ Inviata</span>}
                          {cardType === 'email-ndr' && <span className="conv-dir conv-dir--ndr">⚠ Bounce</span>}
                          {cardType === 'internal'  && <span className="conv-dir conv-dir--note">Nota interna</span>}
                          <span className="conv-msg-time" title={item.date.toLocaleString('it-IT')}>
                            {fmtDate(item.date)}
                          </span>
                          {user.role === 'ADMIN' && item.type === 'comment' && (
                            <button
                              className="conv-msg-del"
                              onClick={() => handleDeleteComment(item.id)}
                              title="Elimina"
                            >✕</button>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      {item.type === 'comment' && (
                        <div
                          className="conv-msg-body"
                          dangerouslySetInnerHTML={{ __html: processedContent }}
                        />
                      )}

                      {/* Single file body */}
                      {item.type === 'file' && (
                        item.file?.mimeType?.startsWith('image/') ? (
                          <div className="conv-msg-file-preview">
                            <div className="conv-att-img-wrap">
                              <a href={`${UPLOADS_URL}/${item.file.filePath}`} target="_blank" rel="noopener noreferrer">
                                <img src={`${UPLOADS_URL}/${item.file.filePath}`} alt={item.file.fileName} className="conv-img-thumb" />
                              </a>
                              {user.role === 'ADMIN' && (
                                <button className="conv-img-del" onClick={() => handleDeleteAttachment(item.file.id)} title="Elimina">✕</button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="conv-msg-file-preview">
                            <ConvFileChip att={item.file} onDelete={user.role === 'ADMIN' ? () => handleDeleteAttachment(item.file.id) : undefined} />
                          </div>
                        )
                      )}

                      {/* Comment attachments */}
                      {item.type === 'comment' && (realImages.length > 0 || otherFiles.length > 0) && (
                        <div className="conv-msg-atts">
                          {realImages.map((a: any) => (
                            <div key={a.id} className="conv-att-img-wrap">
                              <a href={`${UPLOADS_URL}/${a.filePath}`} target="_blank" rel="noopener noreferrer">
                                <img src={`${UPLOADS_URL}/${a.filePath}`} alt={a.fileName} className="conv-img-thumb" />
                              </a>
                              {user.role === 'ADMIN' && (
                                <button className="conv-img-del" onClick={() => handleDeleteAttachment(a.id)} title="Elimina">✕</button>
                              )}
                            </div>
                          ))}
                          {otherFiles.map((a: any) => (
                            <ConvFileChip key={a.id} att={a} onDelete={user.role === 'ADMIN' ? () => handleDeleteAttachment(a.id) : undefined} />
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                );
              }) : (
                <div className="conv-no-activity">Nessuna attività</div>
              )}
              {/* Scroll anchor — always kept at the bottom of the list */}
              <div ref={convEndRef} />
            </div>

            {/* Unified form for comment and file */}
            <div className="unified-form" style={{ position: 'relative' }}>

              {/* @mention autocomplete dropdown */}
              {mentionQuery !== null && (() => {
                const q = mentionQuery.toLowerCase();
                const isEmailQ = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(mentionQuery);
                const matchedUsers = allUsers
                  .filter(u => {
                    const full = `${u.firstName}${u.lastName}`.toLowerCase();
                    const spaced = `${u.firstName} ${u.lastName}`.toLowerCase();
                    return full.includes(q) || spaced.includes(q) || (u.email || '').toLowerCase().includes(q);
                  })
                  .slice(0, 8);
                // Show "add external" only if the typed email doesn't match any internal user
                const emailMatchesInternalUser = isEmailQ && allUsers.some(u => (u.email || '').toLowerCase() === q);
                const showEmail = isEmailQ && !emailMatchesInternalUser;
                if (!matchedUsers.length && !showEmail) return null;
                return (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 300,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                    boxShadow: '0 -4px 16px rgba(0,0,0,0.12)', marginBottom: '4px', overflow: 'hidden',
                  }}>
                    {matchedUsers.map(u => (
                      <div
                        key={u.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8f5ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onMouseDown={e => {
                          e.preventDefault(); // keep editor focus
                          const name = `${u.firstName} ${u.lastName}`;
                          const html = `<span class="mention mention--user" data-user-id="${u.id}" contenteditable="false">@${name}</span>&nbsp;`;
                          editorRef.current?.replaceMentionQuery(mentionQuery, html);
                          setMentionQuery(null);
                        }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                          {(u.firstName[0] || '') + (u.lastName[0] || '')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.firstName} {u.lastName}</div>
                          {u.department && <div style={{ fontSize: 11, color: '#6b7280' }}>{u.department}</div>}
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>assegna</div>
                      </div>
                    ))}
                    {showEmail && (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', cursor: 'pointer', borderTop: matchedUsers.length ? '1px solid #f0f0f0' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onMouseDown={e => {
                          e.preventDefault();
                          const html = `<span class="mention mention--email" data-email="${mentionQuery}" contenteditable="false">@${mentionQuery}</span>&nbsp;`;
                          editorRef.current?.replaceMentionQuery(mentionQuery, html);
                          setMentionQuery(null);
                        }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✉</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{mentionQuery}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>Aggiungi contatto esterno · riceverà l'email</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <RichTextEditor
                ref={editorRef}
                value={comment}
                onChange={setComment}
                placeholder="Write a comment... (@nome per colleghi, @email@ext.com per esterni)"
                minHeight={80}
                borderless
                onPasteFiles={(pastedFiles) => setFiles(prev => [...prev, ...pastedFiles])}
                onMentionQuery={setMentionQuery}
              />
              <div className="composer-bottom-bar">
                <div className="composer-left">
                  {/* Attach file */}
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const selected = e.target.files ? Array.from(e.target.files) : [];
                      setFiles(prev => [...prev, ...selected]);
                      e.target.value = '';
                    }}
                  />
                  <label htmlFor="file-upload" className="composer-icon-btn" title="Attach file">
                    📎
                  </label>

                  {/* Emoji picker */}
                  <div ref={emojiPickerRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="composer-icon-btn"
                      title="Insert emoji"
                      onClick={() => setShowEmoji(p => !p)}
                    >
                      😊
                    </button>
                    {showEmoji && (
                      <div className="emoji-picker">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="emoji-btn"
                            onClick={() => {
                              editorRef.current?.insertText(emoji);
                              setShowEmoji(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected file tags */}
                  {files.length > 0 && (
                    <div className="selected-files-list">
                      {files.map((f, i) => (
                        <span key={i} className="selected-file-tag">
                          {f.name}
                          <button
                            className="clear-file-btn"
                            onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                            type="button"
                          >✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="composer-right">
                  <button
                    type="button"
                    className="composer-ai-btn"
                    onClick={async () => {
                      try {
                        const res = await aiApi.suggestResponse(ticket.id);
                        if (res.data.response) setComment(res.data.response);
                        else alert('AI not available or not configured');
                      } catch { alert('AI error'); }
                    }}
                    title="Generate AI-suggested response"
                  >
                    AI Suggest
                  </button>
                  <button
                    className="composer-send-btn"
                    onClick={handleSubmit}
                    disabled={!comment.replace(/<[^>]*>/g, '').trim() && files.length === 0 && selectedUsers.length === 0 && selectedDepartments.length === 0}
                  >
                    {(selectedUsers.length > 0 || selectedDepartments.length > 0) ? 'Send ↗ (with assignment)' : 'Send ↗'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// New ticket component
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
  const [files, setFiles] = useState<File[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDuplicates, setAiDuplicates] = useState<any[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);

  // Check if AI is available
  useEffect(() => {
    aiApi.status().then(res => setAiEnabled(res.data.configured)).catch(() => {});
  }, []);

  // AI suggestion when title is long enough (debounced)
  useEffect(() => {
    if (!aiEnabled || formData.title.length < 10) {
      setAiSuggestion(null);
      setAiDuplicates([]);
      return;
    }
    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const [catRes, dupRes] = await Promise.all([
          aiApi.suggestCategory(formData.title, formData.description),
          aiApi.findDuplicates(formData.title, formData.description),
        ]);
        if (catRes.data.suggestion) setAiSuggestion(catRes.data.suggestion);
        if (dupRes.data.duplicates?.length > 0) setAiDuplicates(dupRes.data.duplicates);
      } catch {}
      setAiLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [aiEnabled, formData.title, formData.description]);

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

  const handlePasteFiles = useCallback((pastedFiles: File[]) => {
    setFiles(prev => [...prev, ...pastedFiles]);
  }, []);

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

      // Upload files if any
      for (let i = 0; i < files.length; i++) {
        const isLast = i === files.length - 1;
        await ticketsApi.uploadFile(ticketId, files[i], undefined, isLast);
      }

      // Then assign to user or department if selected
      if (assignToUser) {
        await ticketsApi.assignUsers(ticketId, [assignToUser]);
      } else if (assignToDepartment) {
        await ticketsApi.assignDepartments(ticketId, [assignToDepartment]);
      }

      onCreate();
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error creating ticket');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Ticket</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Title</label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Description</label>
            <RichTextEditor
              value={formData.description}
              onChange={(html) => setFormData({ ...formData, description: html })}
              placeholder="Describe the issue or request... (you can paste screenshots)"
              minHeight={100}
              onPasteFiles={handlePasteFiles}
            />
          </div>

          <div className="form-group">
            <label className="label">Attachments (optional)</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="new-ticket-file-upload"
                multiple
                onChange={(e) => {
                  const selected = e.target.files ? Array.from(e.target.files) : [];
                  setFiles(prev => [...prev, ...selected]);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <label htmlFor="new-ticket-file-upload" className="file-label" style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: '#f3f4f6',
                border: '1px dashed #9ca3af',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#4b5563',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box',
              }}>
                {files.length > 0
                  ? `📎 ${files.length} file(s) selected — click to add more`
                  : '📎 Click to attach files or paste screenshots in the editor'}
              </label>
              {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {files.map((f, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', background: '#dbeafe', borderRadius: '12px',
                      fontSize: '12px', color: '#1e40af',
                    }}>
                      {f.name}
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontWeight: 'bold', padding: '0 2px' }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Priority</label>
            <select
              className="input"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Category</label>
            <select
              className="input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Assign to User (optional)</label>
            <select
              className="input"
              value={assignToUser}
              onChange={(e) => {
                setAssignToUser(e.target.value);
                if (e.target.value) setAssignToDepartment(''); // Clear department
              }}
              disabled={!!assignToDepartment}
            >
              <option value="">No user</option>
              {allUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} {u.department && `(${u.department})`}
                </option>
              ))}
            </select>
            {assignToDepartment && (
              <small style={{ color: '#f59e0b', display: 'block', marginTop: '5px' }}>
                ⚠️ Deselect the department to assign to a user
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="label">Assign to Department (optional)</label>
            <select
              className="input"
              value={assignToDepartment}
              onChange={(e) => {
                setAssignToDepartment(e.target.value);
                if (e.target.value) setAssignToUser(''); // Clear user
              }}
              disabled={!!assignToUser}
            >
              <option value="">No department</option>
              {allDepartments.map((dept: string) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {assignToUser && (
              <small style={{ color: '#f59e0b', display: 'block', marginTop: '5px' }}>
                ⚠️ Deselect the user to assign to a department
              </small>
            )}
          </div>

          <div style={{ padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '5px', marginBottom: '15px', fontSize: '13px' }}>
            ℹ️ <strong>Note:</strong> If you don't assign the ticket, it will be visible to everyone in "To Do"
          </div>

          {/* AI Suggestions */}
          {aiEnabled && (aiSuggestion || aiDuplicates.length > 0 || aiLoading) && (
            <div style={{ marginBottom: '15px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#166534' }}>
                {aiLoading ? '⏳ AI is analyzing...' : '🤖 AI Suggestions'}
              </div>
              {aiSuggestion && !aiLoading && (
                <div style={{ fontSize: '13px', color: '#15803d', marginBottom: '6px' }}>
                  <span>Suggested category: <strong>{aiSuggestion.category}</strong></span>
                  {' | '}
                  <span>Priority: <strong>{aiSuggestion.priority}</strong></span>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: aiSuggestion.category, priority: aiSuggestion.priority }))}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                </div>
              )}
              {aiDuplicates.length > 0 && !aiLoading && (
                <div style={{ fontSize: '12px', color: '#b45309', marginTop: '6px', padding: '8px', background: '#fefce8', borderRadius: '4px', border: '1px solid #fde68a' }}>
                  <strong>⚠️ Possible duplicates:</strong>
                  {aiDuplicates.map((d: any) => (
                    <div key={d.id} style={{ marginTop: '4px' }}>
                      #{d.id.substring(0, 8)} — {d.title} <span style={{ color: '#92400e' }}>({d.similarity})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal to send external email (creates ticket + sends email)
const SendExternalEmailModal: React.FC<any> = ({ user, onClose, onCreate }) => {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handlePasteFiles = useCallback((pastedFiles: File[]) => {
    setFiles(prev => [...prev, ...pastedFiles]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim() || !subject.trim() || !body.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // 1. Create ticket
      const ticketResponse = await ticketsApi.create({
        title: subject,
        description: body,
        priority,
        category: 'Comunicazione Esterna',
        boardId: 'default-board',
        columnId: 'col-todo',
      });
      const ticketId = ticketResponse.data.id;

      // 2. Upload attachments to ticket
      const uploadedAttachmentIds: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await ticketsApi.uploadFile(ticketId, files[i]);
        if (res.data?.id) uploadedAttachmentIds.push(res.data.id);
      }

      // 3. Add external contact to ticket
      await ticketsApi.addExternalContacts(ticketId, [toEmail.trim()]);

      // 4. Send email with attachments
      await ticketsApi.sendEmail(ticketId, {
        subject,
        body,
        toEmails: [toEmail.trim()],
        attachmentIds: uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined,
      });

      alert('Email sent and ticket created successfully!');
      onCreate();
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(error.response?.data?.error || 'Error sending');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Send External Email</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Recipient *</label>
            <input
              type="email"
              className="input"
              placeholder="e.g. supplier@company.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Subject *</label>
            <input
              type="text"
              className="input"
              placeholder="Subject of the communication"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              The ticket reference will be added automatically to the subject
            </small>
          </div>

          <div className="form-group">
            <label className="label">Message *</label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Write your message... (you can paste screenshots)"
              minHeight={150}
              onPasteFiles={handlePasteFiles}
            />
          </div>

          <div className="form-group">
            <label className="label">Attachments (optional)</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="send-email-file-upload"
                multiple
                onChange={(e) => {
                  const selected = e.target.files ? Array.from(e.target.files) : [];
                  setFiles(prev => [...prev, ...selected]);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <label htmlFor="send-email-file-upload" style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: '#f3f4f6',
                border: '1px dashed #9ca3af',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#4b5563',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box',
              }}>
                {files.length > 0
                  ? `📎 ${files.length} file(s) selected — click to add more`
                  : '📎 Click to attach files'}
              </label>
              {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {files.map((f, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', background: '#dbeafe', borderRadius: '12px',
                      fontSize: '12px', color: '#1e40af',
                    }}>
                      {f.name}
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontWeight: 'bold', padding: '0 2px' }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Priority</label>
            <select
              className="input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div style={{ padding: '10px', backgroundColor: '#eef2ff', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', border: '1px solid #c7d2fe' }}>
            ℹ️ A ticket will be created with this email. Replies from the recipient will be automatically linked to the ticket.
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : '📤 Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KanbanBoard;
