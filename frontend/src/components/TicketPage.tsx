import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tickets as ticketsApi, users as usersApi, onboarding as onboardingApi, ai as aiApi, UPLOADS_URL } from '../services/api';
import RichTextEditor from './RichTextEditor';
import './KanbanBoard.css';

interface TicketPageProps {
  user: any;
}

const TicketPage: React.FC<TicketPageProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showAssignments, setShowAssignments] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [initialUsers, setInitialUsers] = useState<string[]>([]);
  const [initialDepartments, setInitialDepartments] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [assignTab, setAssignTab] = useState<'users' | 'departments'>('users');
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

  // Load ticket
  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      const response = await ticketsApi.getById(id);
      setTicket(response.data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTicket(); }, [loadTicket]);

  // Refresh ticket
  const refreshTicket = async () => {
    if (!id) return;
    try {
      setRefreshing(true);
      const response = await ticketsApi.getById(id);
      setTicket(response.data);
    } catch (error) {
      console.error('Error refreshing ticket:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load users for assignment
  useEffect(() => {
    usersApi.getAll().then(r => setAllUsers(r.data.filter((u: any) => u.department))).catch(() => {});
  }, []);

  // Sync assignments from ticket
  useEffect(() => {
    if (!ticket) return;
    if (ticket.assignments) {
      const ids = ticket.assignments.map((a: any) => a.userId);
      setSelectedUsers(ids);
      setInitialUsers(ids);
    }
    if (ticket.assignedDepartments) {
      setSelectedDepartments(ticket.assignedDepartments);
      setInitialDepartments(ticket.assignedDepartments);
    }
  }, [ticket]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const isHtmlDescription = (desc: string) => /<[a-z][\s\S]*>/i.test(desc);

  const renderDescriptionMarkdown = (text: string): string =>
    text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1" style="max-width:100%;max-height:300px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;display:block;margin:4px 0" /></a>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" download style="color:#4f6ef7">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0" />')
      .replace(/\n/g, '<br/>');

  const hasSubstantialDescription = (desc: string): boolean => {
    if (!desc) return false;
    const text = desc.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
    if (text.length < 30) return false;
    if (/email\s+originale\s+completa\s+in\s+allegato/i.test(text)) return false;
    return true;
  };

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const resize = () => {
          const height = doc.documentElement.scrollHeight || doc.body.scrollHeight;
          iframe.style.height = Math.min(height + 20, 600) + 'px';
        };
        resize();
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

  const buildEmailSrcdoc = (html: string): string => {
    let content = html
      .replace(/\[ONBOARDING_ID:[^\]]+\]/g, '')
      .replace(/🔗\s*\*\*Link Onboarding:\*\*\s*#[a-f0-9-]+/gi, '');
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    if (/<html/i.test(content)) {
      const baseStyle = `<style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 8px; }</style>`;
      content = content.replace(/<head([^>]*)>/i, `<head$1>${baseStyle}`);
      return content;
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 8px; font-size: 14px; line-height: 1.6; color: #1f2937; }
      img { max-width: 100%; height: auto; } table { border-collapse: collapse; } a { color: #4f6ef7; }
    </style></head><body>${content}</body></html>`;
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();

  const allDepartments = Array.from(new Set(allUsers.map((u: any) => u.department).filter(Boolean)));

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) return prev.filter(i => i !== userId);
      setSelectedDepartments([]);
      return [...prev, userId];
    });
  };

  const handleDepartmentSelection = (department: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(department)) return prev.filter(d => d !== department);
      setSelectedUsers([]);
      return [...prev, department];
    });
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleMoveTicket = async (status: string) => {
    try {
      await ticketsApi.update(ticket.id, { status });
      setTicket((t: any) => ({ ...t, status }));
    } catch (err) {
      console.error('Errore spostamento:', err);
    }
  };

  const handleEquipmentSubmit = async () => {
    const onboardingId = ticket.description?.match(/\[ONBOARDING_ID:([^\]]+)\]/)?.[1];
    if (!onboardingId) return;
    try {
      await onboardingApi.updateEquipment(onboardingId, equipmentData);
      alert('Dotazioni salvate con successo! Il ticket IT è stato creato automaticamente.');
      await refreshTicket();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore durante il salvataggio delle dotazioni');
    }
  };

  const handleSubmit = async () => {
    const hasComment = comment.replace(/<[^>]*>/g, '').trim();
    const hasFiles = files.length > 0;
    const usersChanged = JSON.stringify([...selectedUsers].sort()) !== JSON.stringify([...initialUsers].sort());
    const deptsChanged = JSON.stringify([...selectedDepartments].sort()) !== JSON.stringify([...initialDepartments].sort());
    const hasAssignments = usersChanged || deptsChanged;
    if (!hasComment && !hasFiles && !hasAssignments) return;

    try {
      let createdCommentId = null;
      if (hasComment) {
        const res = await ticketsApi.addComment(ticket.id, comment, hasFiles);
        createdCommentId = res.data.id;
      }
      if (hasFiles) {
        for (let i = 0; i < files.length; i++) {
          await ticketsApi.uploadFile(ticket.id, files[i], createdCommentId || undefined, i === files.length - 1);
        }
      }
      if (hasAssignments) {
        if (selectedUsers.length > 0) {
          await ticketsApi.assignUsers(ticket.id, selectedUsers);
        } else if (selectedDepartments.length > 0) {
          await ticketsApi.assignDepartments(ticket.id, selectedDepartments);
        }
        setShowAssignments(false);
      }
      setComment('');
      setFiles([]);
      await refreshTicket();
    } catch (error) {
      alert('Errore durante l\'invio. Riprova.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Eliminare questo commento?')) return;
    try {
      await ticketsApi.deleteComment(ticket.id, commentId);
      await refreshTicket();
    } catch { alert('Errore durante l\'eliminazione del commento'); }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Eliminare questo file?')) return;
    try {
      await ticketsApi.deleteAttachment(ticket.id, attachmentId);
      await refreshTicket();
    } catch { alert('Errore durante l\'eliminazione del file'); }
  };

  const handleDeleteTicket = async () => {
    if (!window.confirm('Eliminare questo ticket? L\'operazione è irreversibile.')) return;
    try {
      await ticketsApi.delete(ticket.id);
      alert('Ticket eliminato con successo');
      navigate('/board');
    } catch { alert('Errore durante l\'eliminazione del ticket'); }
  };

  const cleanEmailReplyContent = (content: string, fromEmail?: string): string => {
    let cleaned = content;
    cleaned = cleaned.replace(/^📧\s*\*{0,2}Risposta da\s+[^:*]+:?\*{0,2}\s*/i, '');
    const notifCutPatterns = [
      /Ticket #[a-f0-9].*(?:Nuovo commento|Nuovo allegato)[\s\S]*/i,
      /Rispondi a questa email per aggiungere[\s\S]*/i,
      /Europoligrafico.*Sistema Kanban[\s\S]*/i,
    ];
    for (const pattern of notifCutPatterns) cleaned = cleaned.replace(pattern, '');
    const lines = cleaned.trim().split('\n');
    const jobTitlePattern = /^(IT|HR|Sales|Marketing|Account|Project|Product|Business|Chief|Senior|Junior|Lead|Head|Director|Manager|Specialist|Consultant|Engineer|Developer|Analyst|Coordinator|Assistant|Administrator|Responsabile|Direttore|Tecnico|Commerciale|Amministratore|Addetto)\b/i;
    for (let i = lines.length - 1; i >= 1; i--) {
      const line = lines[i].trim();
      if (jobTitlePattern.test(line) && line.length < 50) {
        const prevLine = lines[i - 1].trim();
        if (prevLine.length > 0 && prevLine.length < 50 && /^[A-Z][a-zà-ú]+(\s+[A-Z][a-zà-ú]+){0,3}$/.test(prevLine)) {
          lines.splice(i - 1, 2); break;
        }
        lines.splice(i, 1); break;
      }
    }
    while (lines.length > 0) {
      const lastLine = lines[lines.length - 1].trim();
      if (!lastLine) { lines.pop(); continue; }
      if (/^[A-Z][a-zà-ú]+(\s+[A-Z][a-zà-ú]+){1,3}$/.test(lastLine) && lastLine.length < 40) {
        if (fromEmail) {
          const nameParts = lastLine.toLowerCase().split(/\s+/);
          const emailLocal = fromEmail.split('@')[0].toLowerCase().replace(/[._-]/g, ' ');
          if (nameParts.some(p => emailLocal.includes(p))) { lines.pop(); continue; }
        }
        if (lines.filter(l => l.trim().length > 0).length === 1) lines.pop();
        break;
      }
      break;
    }
    return lines.join('\n').trim();
  };

  const getTimeline = () => {
    if (!ticket) return [];
    const items: any[] = [];
    if (ticket.comments) {
      ticket.comments.forEach((c: any) => {
        items.push({
          type: 'comment', id: c.id, date: new Date(c.createdAt),
          user: c.user, content: c.content,
          isEmailReply: c.isEmailReply || false,
          isOutgoingEmail: c.isOutgoingEmail || false,
          fromEmail: c.fromEmail || null,
          toEmails: c.toEmails || [],
          attachments: c.attachments || [],
        });
      });
    }
    if (ticket.attachments) {
      const standaloneFiles = ticket.attachments.filter((att: any) => !att.commentId);
      if (standaloneFiles.length > 0) {
        const earliest = standaloneFiles.reduce((min: any, att: any) =>
          new Date(att.createdAt || 0) < new Date(min.createdAt || 0) ? att : min, standaloneFiles[0]);
        items.push({ type: 'file-group', id: 'standalone-files', date: new Date(earliest.createdAt || Date.now()), user: earliest.uploadedBy, files: standaloneFiles });
      }
    }
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p>Caricamento ticket...</p>
      </div>
    </div>
  );

  if (notFound || !ticket) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <p>Ticket non trovato.</p>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/board')}>
          ← Torna alla Board
        </button>
      </div>
    </div>
  );

  const isEmailTicket = !!(ticket.emailThreadId || (ticket.externalContacts && ticket.externalContacts.length > 0));
  const emailSender = ticket.externalContacts?.[0] || null;
  const onboardingIdMatch = ticket.description?.match(/\[ONBOARDING_ID:([^\]]+)\]/);
  const onboardingId = onboardingIdMatch ? onboardingIdMatch[1] : null;
  const isOnboardingTicket = ticket.category === 'Onboarding - Dotazioni' && onboardingId;
  const timeline = getTimeline();

  return (
    <div className="page ticket-page-full">
      {/* ── Breadcrumb / Back bar ── */}
      <div className="ticket-page-topbar">
        <button className="btn btn-secondary ticket-back-btn" onClick={() => navigate(-1)}>
          ← Torna alla Board
        </button>
        <span className="ticket-page-id">#{ticket.id.slice(-8).toUpperCase()}</span>
        {refreshing && <span style={{ fontSize: 12, color: '#94a3b8' }}>Aggiornamento...</span>}
      </div>

      {/* ── Page card ── */}
      <div className="ticket-page-card">

        {/* Header */}
        <div className="modal-header" style={{ borderRadius: '12px 12px 0 0' }}>
          <div>
            <h2 style={{ margin: 0 }}>{ticket.title}</h2>
            <select
              className={`badge badge-${ticket.priority.toLowerCase()}`}
              value={ticket.priority}
              onChange={async (e) => {
                const newPriority = e.target.value;
                try {
                  await ticketsApi.update(ticket.id, { priority: newPriority });
                  setTicket((t: any) => ({ ...t, priority: newPriority }));
                } catch (err) {
                  console.error('Errore aggiornamento priorità:', err);
                }
              }}
              style={{ cursor: 'pointer', border: '1px solid transparent', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: '600', appearance: 'auto' as any, marginTop: 6 }}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          {user.role === 'ADMIN' && (
            <button
              className="btn btn-secondary"
              onClick={handleDeleteTicket}
              style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '12px', padding: '5px 10px' }}
              title="Elimina ticket (solo ADMIN)"
            >
              🗑️ Elimina
            </button>
          )}
        </div>

        {/* Body */}
        <div className="ticket-modal-content">
          <div className="ticket-info">
            {isEmailTicket ? (
              <div className="email-description-container">
                <div className="email-description-header">
                  <div className="email-description-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <div className="email-description-meta">
                    <span className="email-description-label">Ricevuto via email</span>
                    {emailSender && <span className="email-description-sender">Da: {emailSender}</span>}
                  </div>
                </div>
                {hasSubstantialDescription(ticket.description || '') && (
                  isHtmlDescription(ticket.description || '') ? (
                    <iframe
                      className="email-description-iframe"
                      srcDoc={buildEmailSrcdoc(ticket.description || '')}
                      sandbox="allow-same-origin"
                      onLoad={handleIframeLoad}
                      title="Contenuto email"
                    />
                  ) : (
                    <div
                      className="email-description-text"
                      dangerouslySetInnerHTML={{ __html: renderDescriptionMarkdown((ticket.description || '').replace(/\[ONBOARDING_ID:[^\]]+\]/g, '').trim()) }}
                    />
                  )
                )}
              </div>
            ) : (
              <>
                <p><strong>Descrizione:</strong></p>
                <div
                  className="ticket-description-body"
                  dangerouslySetInnerHTML={{ __html: renderDescriptionMarkdown((ticket.description || '').replace(/\[ONBOARDING_ID:[^\]]+\]/g, '').replace(/🔗\s*\*\*Link Onboarding:\*\*\s*#[a-f0-9-]+/gi, '').trim()) }}
                />
              </>
            )}

            <div className="ticket-details">
              <div><strong>Creato da:</strong> {ticket.createdBy.firstName} {ticket.createdBy.lastName}</div>
              <div><strong>Assegnato a:</strong> {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Non assegnato'}</div>
              <div><strong>Scadenza SLA:</strong> {new Date(ticket.dueDate).toLocaleString('it-IT')}</div>
              <div><strong>SLA:</strong> {ticket.slaHours} ore</div>
            </div>
          </div>

          {/* Form Dotazioni Onboarding */}
          {isOnboardingTicket && ticket.status !== 'RESOLVED' && (
            <div style={{ margin: '15px 0', padding: '15px', backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '8px' }}>
              {!showEquipmentForm ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: '10px', fontWeight: '600' }}>Questo ticket richiede la compilazione delle dotazioni per il nuovo dipendente.</p>
                  <button className="btn btn-primary" onClick={() => setShowEquipmentForm(true)} style={{ fontSize: '15px', padding: '10px 25px' }}>Compila Dotazioni</button>
                </div>
              ) : (
                <div>
                  <h3 style={{ marginBottom: '15px', borderBottom: '2px solid #f59e0b', paddingBottom: '8px' }}>Dotazioni per il Nuovo Dipendente</h3>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#1a202c', borderBottom: '2px solid #10b981', paddingBottom: '4px' }}>Dotazioni Hardware</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div className="form-group">
                      <label className="label">Computer</label>
                      <select className="input" value={equipmentData.computerType} onChange={(e) => setEquipmentData({ ...equipmentData, computerType: e.target.value })}>
                        <option value="">Seleziona...</option><option value="Portatile">Portatile</option><option value="Desktop">Desktop</option><option value="Non necessario">Non necessario</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Telefono Aziendale</label>
                      <select className="input" value={equipmentData.phoneType} onChange={(e) => setEquipmentData({ ...equipmentData, phoneType: e.target.value })}>
                        <option value="">Seleziona...</option><option value="Fisso">Telefono Fisso</option><option value="Android">Smartphone Android</option><option value="Non necessario">Non necessario</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    {[['needsHeadset', 'Cuffie'], ['needsWebcam', 'Webcam'], ['additionalMonitor', 'Schermo aggiuntivo']].map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: (equipmentData as any)[key] ? '#dbeafe' : 'transparent' }}>
                        <input type="checkbox" checked={(equipmentData as any)[key]} onChange={(e) => setEquipmentData({ ...equipmentData, [key]: e.target.checked })} style={{ marginRight: '8px' }} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#1a202c', borderBottom: '2px solid #f59e0b', paddingBottom: '4px' }}>Software e Accessi</h4>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: equipmentData.needsMicrosoft365 ? '#dbeafe' : 'transparent', marginBottom: '10px' }}>
                    <input type="checkbox" checked={equipmentData.needsMicrosoft365} onChange={(e) => setEquipmentData({ ...equipmentData, needsMicrosoft365: e.target.checked })} style={{ marginRight: '10px' }} />
                    <span style={{ fontWeight: '500' }}>Pacchetto Microsoft 365</span>
                  </label>
                  <div className="form-group">
                    <label className="label">Software Specifici</label>
                    <textarea className="input" placeholder="es. PackWay, HubSpot..." value={equipmentData.softwareNeeded} onChange={(e) => setEquipmentData({ ...equipmentData, softwareNeeded: e.target.value })} rows={2} />
                  </div>
                  <div className="form-group">
                    <label className="label">Accessi Sistemi</label>
                    <textarea className="input" placeholder="es. VPN, cartelle condivise..." value={equipmentData.systemAccess} onChange={(e) => setEquipmentData({ ...equipmentData, systemAccess: e.target.value })} rows={2} />
                  </div>
                  <div className="form-group">
                    <label className="label">Note Aggiuntive</label>
                    <textarea className="input" value={equipmentData.additionalNotes} onChange={(e) => setEquipmentData({ ...equipmentData, additionalNotes: e.target.value })} rows={2} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowEquipmentForm(false)}>Annulla</button>
                    <button className="btn btn-primary" onClick={handleEquipmentSubmit}>Salva Dotazioni e Crea Ticket IT</button>
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
                  onClick={() => handleMoveTicket(status)}
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
              <div className="assignments-header-left"><span className="icon">👥</span> Assegnazioni</div>
              <button className="assignments-toggle" onClick={() => setShowAssignments(!showAssignments)}>
                {showAssignments ? '▲ Chiudi' : '⚙ Gestisci'}
              </button>
            </div>
            <div className="assignments-body">
              {ticket.assignments && ticket.assignments.length > 0 && (
                <div className="assignments-chips">
                  {ticket.assignments.map((assignment: any) => (
                    <div className="assignment-chip" key={assignment.id}>
                      <span className="avatar user-avatar">{getInitials(assignment.user.firstName, assignment.user.lastName)}</span>
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
                      <span className="chip-info"><span className="chip-name">{dept}</span><span className="chip-dept">Reparto</span></span>
                    </div>
                  ))}
                </div>
              )}
              {(!ticket.assignments || ticket.assignments.length === 0) && (!ticket.assignedDepartments || ticket.assignedDepartments.length === 0) && (
                <div className="assignments-empty"><span>⚠️</span> Nessuna assegnazione — Visibile a tutti</div>
              )}
            </div>
            {showAssignments && (
              <div className="assignment-panel">
                <div className="assignment-panel-note">
                  <span>ℹ️</span>
                  <span>Puoi assegnare a <strong>utenti</strong> o <strong>reparti</strong>, non entrambi. Le modifiche saranno salvate con "Invia".</span>
                </div>
                <div className="assignment-panel-tabs">
                  <button className={`assignment-tab ${assignTab === 'users' ? 'active' : ''} ${selectedDepartments.length > 0 ? 'disabled' : ''}`} onClick={() => !selectedDepartments.length && setAssignTab('users')}>👤 Utenti</button>
                  <button className={`assignment-tab ${assignTab === 'departments' ? 'active' : ''} ${selectedUsers.length > 0 ? 'disabled' : ''}`} onClick={() => !selectedUsers.length && setAssignTab('departments')}>🏢 Reparti</button>
                </div>
                {assignTab === 'users' && (
                  <div>
                    <div className="assignment-search-wrapper">
                      <span className="assignment-search-icon">🔍</span>
                      <input type="text" className="assignment-search" placeholder="Cerca utente..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} disabled={selectedDepartments.length > 0} />
                    </div>
                    <div className="assignment-list">
                      {allUsers.filter((u: any) => {
                        const s = userSearchTerm.toLowerCase();
                        return `${u.firstName} ${u.lastName}`.toLowerCase().includes(s) || (u.department || '').toLowerCase().includes(s);
                      }).map((u: any) => {
                        const isSelected = selectedUsers.includes(u.id);
                        const isDisabled = selectedDepartments.length > 0;
                        return (
                          <div key={u.id} className={`assignment-list-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`} onClick={() => !isDisabled && handleUserSelection(u.id)}>
                            <div className="avatar-sm" style={{ background: isSelected ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#cbd5e1' }}>{getInitials(u.firstName, u.lastName)}</div>
                            <div className="item-info"><div className="item-name">{u.firstName} {u.lastName}</div>{u.department && <div className="item-dept">{u.department}</div>}</div>
                            <div className="check-icon">{isSelected ? '✓' : ''}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="assignment-count">{selectedDepartments.length > 0 ? '⚠️ Deseleziona i reparti per assegnare a utenti' : `${selectedUsers.length} utente/i selezionato/i`}</div>
                  </div>
                )}
                {assignTab === 'departments' && (
                  <div>
                    <div className="assignment-search-wrapper">
                      <span className="assignment-search-icon">🔍</span>
                      <input type="text" className="assignment-search" placeholder="Cerca reparto..." value={deptSearchTerm} onChange={(e) => setDeptSearchTerm(e.target.value)} disabled={selectedUsers.length > 0} />
                    </div>
                    <div className="assignment-list">
                      {allDepartments.filter((dept: string) => dept.toLowerCase().includes(deptSearchTerm.toLowerCase())).map((dept: string) => {
                        const isSelected = selectedDepartments.includes(dept);
                        const isDisabled = selectedUsers.length > 0;
                        return (
                          <div key={dept} className={`assignment-list-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`} onClick={() => !isDisabled && handleDepartmentSelection(dept)}>
                            <div className="avatar-sm" style={{ background: isSelected ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : '#cbd5e1' }}>{dept[0]}</div>
                            <div className="item-info"><div className="item-name">{dept}</div></div>
                            <div className="check-icon">{isSelected ? '✓' : ''}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="assignment-count">{selectedUsers.length > 0 ? '⚠️ Deseleziona gli utenti per assegnare a reparti' : `${selectedDepartments.length} reparto/i selezionato/i`}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="timeline-section">
            <strong>{isEmailTicket ? 'Conversazione:' : 'Storico attività:'}</strong>
            <div className="timeline-list">
              {timeline.length > 0 ? timeline.map((item) => (
                <div key={`${item.type}-${item.id}`} className={`timeline-item ${item.type}${item.isEmailReply ? ' email-reply' : ''}${item.isOutgoingEmail ? ' email-outgoing' : ''}`}>
                  {item.type === 'comment' ? (
                    <>
                      <div className="timeline-icon">{item.isOutgoingEmail ? '📤' : item.isEmailReply ? '📧' : '💬'}</div>
                      <div className="timeline-content" style={{ position: 'relative', flex: 1 }}>
                        <div className="timeline-header">
                          {item.isOutgoingEmail ? (
                            <><strong>{item.user?.firstName} {item.user?.lastName}</strong><span className="email-outgoing-badge">Email inviata</span><span style={{ fontSize: '12px', color: '#6b7280' }}>A: {item.toEmails?.join(', ')}</span></>
                          ) : item.isEmailReply ? (
                            <><strong>{item.fromEmail}</strong><span className="email-reply-badge">Risposta email</span></>
                          ) : (
                            <><strong>{item.user.firstName} {item.user.lastName}</strong>{item.user.department && <span className="user-department">({item.user.department})</span>}</>
                          )}
                          <span className="timeline-date">{item.date.toLocaleString('it-IT')}</span>
                          {user.role === 'ADMIN' && (
                            <button onClick={() => handleDeleteComment(item.id)} style={{ marginLeft: '10px', padding: '2px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }} title="Elimina commento">🗑️</button>
                          )}
                        </div>
                        <div className="timeline-text" dangerouslySetInnerHTML={{ __html: item.isEmailReply ? cleanEmailReplyContent(item.content, item.fromEmail) : item.content }} />
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="comment-attachments">
                            {item.attachments.filter((att: any) => att.mimeType?.startsWith('image/')).map((att: any) => (
                              <div key={att.id} style={{ marginBottom: '8px', position: 'relative' }}>
                                <a href={`${UPLOADS_URL}/${att.filePath}`} target="_blank" rel="noopener noreferrer">
                                  <img src={`${UPLOADS_URL}/${att.filePath}`} alt={att.fileName} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer' }} />
                                </a>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{att.fileName} ({(att.fileSize / 1024).toFixed(1)} KB)</span>
                                  {user.role === 'ADMIN' && <button onClick={() => handleDeleteAttachment(att.id)} style={{ padding: '2px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>}
                                </div>
                              </div>
                            ))}
                            {item.attachments.filter((att: any) => !att.mimeType?.startsWith('image/')).map((att: any) => (
                              <div key={att.id} className="timeline-file" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div><a href={`${UPLOADS_URL}/${att.filePath}`} target="_blank" rel="noopener noreferrer" download>📎 {att.fileName}</a><span className="file-size">({(att.fileSize / 1024).toFixed(1)} KB)</span></div>
                                {user.role === 'ADMIN' && <button onClick={() => handleDeleteAttachment(att.id)} style={{ padding: '2px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : item.type === 'file-group' ? (
                    <>
                      <div className="timeline-icon">📎</div>
                      <div className="timeline-content" style={{ position: 'relative', flex: 1 }}>
                        <div className="timeline-header">
                          <strong>Allegati{isEmailTicket ? ' email' : ''}</strong>
                          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '6px' }}>({item.files.length} file)</span>
                          <span className="timeline-date">{item.date.toLocaleString('it-IT')}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                          {item.files.map((f: any) => (
                            <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                {f.mimeType?.startsWith('image/') ? (
                                  <a href={`${UPLOADS_URL}/${f.filePath}`} target="_blank" rel="noopener noreferrer">
                                    <img src={`${UPLOADS_URL}/${f.filePath}`} alt={f.fileName} style={{ maxWidth: '120px', maxHeight: '80px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'pointer' }} />
                                  </a>
                                ) : null}
                                <a href={`${UPLOADS_URL}/${f.filePath}`} target="_blank" rel="noopener noreferrer" download style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</a>
                                <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>({(f.fileSize / 1024).toFixed(1)} KB)</span>
                              </div>
                              {user.role === 'ADMIN' && <button onClick={() => handleDeleteAttachment(f.id)} style={{ padding: '2px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}>🗑️</button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              )) : <p className="no-activity">Nessuna attività</p>}
            </div>

            {/* Form commento */}
            <div className="unified-form">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Aggiungi Commento e/o File:</strong>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await aiApi.suggestResponse(ticket.id);
                      if (res.data.response) setComment(res.data.response);
                      else alert('AI non disponibile o non configurata');
                    } catch { alert('Errore AI'); }
                  }}
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: '#166534' }}
                  title="Genera risposta suggerita con AI"
                >
                  🤖 Suggerisci risposta
                </button>
              </div>
              <RichTextEditor value={comment} onChange={setComment} placeholder="Scrivi un commento... Puoi incollare screenshot con Ctrl+V" minHeight={80} onPasteFiles={(pastedFiles) => setFiles(prev => [...prev, ...pastedFiles])} />
              <div className="file-input-wrapper">
                <input type="file" id="file-upload-page" multiple onChange={(e) => { const selected = e.target.files ? Array.from(e.target.files) : []; setFiles(prev => [...prev, ...selected]); e.target.value = ''; }} />
                <label htmlFor="file-upload-page" className="file-label">{files.length > 0 ? `📎 ${files.length} file selezionati` : '📎 Allega file (opzionale)'}</label>
                {files.length > 0 && (
                  <div className="selected-files-list">
                    {files.map((f, i) => (
                      <span key={i} className="selected-file-tag">{f.name}<button className="clear-file-btn" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} type="button">✕</button></span>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!comment.replace(/<[^>]*>/g, '').trim() && files.length === 0 && selectedUsers.length === 0 && selectedDepartments.length === 0}
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

export default TicketPage;
