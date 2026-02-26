import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tickets as ticketsApi, users as usersApi, onboarding as onboardingApi, ai as aiApi, UPLOADS_URL } from '../services/api';
import RichTextEditor, { RichTextEditorHandle } from './RichTextEditor';
import UserAvatar from './UserAvatar';
import './KanbanBoard.css';

const EMOJI_LIST = [
  '😀','😂','😊','😍','🤔','😅','😢','😡','🥳','👏',
  '👍','👎','👋','🙏','🎉','🔥','❤️','✅','❌','⚠️',
  '💡','📎','🔗','📧','📱','💻','⚙️','🔧','📝','📊',
  '🗓️','🚀','⏰','🔍','💬','📌','🏷️','🗂️','✏️','🖊️',
];


function isSignatureImage(att: any): boolean {
  const name: string = att.fileName || '';
  if (/^(image\d+|Outlook-[A-Za-z0-9]+|ATT\d+)\.(png|jpg|jpeg|gif|bmp)$/i.test(name)) return true;
  if (/^(logo|signature|sign|firma)\.(png|jpg|jpeg|gif)$/i.test(name)) return true;
  return false;
}

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
        <button onClick={onDelete} className="conv-file-chip-del" title="Delete">✕</button>
      )}
    </div>
  );
};

const TicketDetail: React.FC<{ user: any }> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
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

  // Load ticket by ID
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await ticketsApi.getById(id!);
        setTicket(response.data);
      } catch (error) {
        console.error('Error loading ticket:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

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

  // Auto-scroll conversation to the latest message
  useEffect(() => {
    if (!ticket) return;
    convEndRef.current?.scrollIntoView();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, (ticket?.comments || []).length, (ticket?.attachments || []).length]);

  // Close @mention dropdown on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMentionQuery(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Load all users for assignment
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
    if (!ticket) return;
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

  const refreshTicket = async () => {
    try {
      setRefreshing(true);
      const response = await ticketsApi.getById(id!);
      setTicket(response.data);
    } catch (error) {
      console.error('Error refreshing ticket:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(i => i !== userId);
      } else {
        setSelectedDepartments([]);
        return [...prev, userId];
      }
    });
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await ticketsApi.unassignUser(ticket.id, userId);
      await refreshTicket();
    } catch (err) {
      console.error('Error removing user assignment:', err);
    }
  };

  const handleRemoveDepartment = async (dept: string) => {
    try {
      const remaining = (ticket.assignedDepartments || []).filter((d: string) => d !== dept);
      await ticketsApi.assignDepartments(ticket.id, remaining);
      await refreshTicket();
    } catch (err) {
      console.error('Error removing department assignment:', err);
    }
  };

  const handleRemoveExternalContact = async (email: string) => {
    try {
      await ticketsApi.removeExternalContact(ticket.id, email);
      await refreshTicket();
    } catch (err) {
      console.error('Error removing external contact:', err);
    }
  };

  const [assignTab, setAssignTab] = useState<'users' | 'departments'>('users');

  const handleDepartmentSelection = (department: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(department)) {
        return prev.filter(d => d !== department);
      } else {
        setSelectedUsers([]);
        return [...prev, department];
      }
    });
  };

  const allDepartments = Array.from(new Set(allUsers.map((u: any) => u.department).filter(Boolean)));

  const handleSubmit = async () => {
    const parseMentions = (html: string) => {
      const div = document.createElement('div');
      div.innerHTML = html;
      const userIds: string[] = [];
      const emails: string[] = [];
      div.querySelectorAll<HTMLElement>('.mention[data-user-id]').forEach(el => {
        const uid = el.dataset.userId;
        if (uid) userIds.push(uid);
      });
      div.querySelectorAll<HTMLElement>('.mention[data-email]').forEach(el => {
        const email = el.dataset.email;
        if (email) emails.push(email);
      });
      return { userIds, emails };
    };

    const { userIds: mentionedUserIds, emails: rawMentionedEmails } = parseMentions(comment);

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

    if (!hasComment && !hasFiles && !hasAssignments) return;

    try {
      let createdCommentId = null;

      if (hasComment) {
        const commentResponse = await ticketsApi.addComment(ticket.id, comment, hasFiles);
        createdCommentId = commentResponse.data.id;
      }

      if (hasFiles) {
        for (let i = 0; i < files.length; i++) {
          const isLast = i === files.length - 1;
          await ticketsApi.uploadFile(ticket.id, files[i], createdCommentId || undefined, isLast);
        }
      }

      if (hasAssignments) {
        if (allAssignedUsers.length > 0) {
          await ticketsApi.assignUsers(ticket.id, allAssignedUsers);
        } else if (selectedDepartments.length > 0) {
          await ticketsApi.assignDepartments(ticket.id, selectedDepartments);
        }
        setShowAssignments(false);
      }

      if (mentionedEmails.length > 0) {
        await ticketsApi.addExternalContacts(ticket.id, mentionedEmails);
        if (hasComment) {
          await ticketsApi.sendEmail(ticket.id, {
            subject: `Re: ${ticket.title}`,
            body: comment,
            toEmails: mentionedEmails,
          });
        }
      }

      setComment('');
      setFiles([]);
      setMentionQuery(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await refreshTicket();
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error submitting. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action is irreversible.')) return;
    try {
      await ticketsApi.deleteComment(ticket.id, commentId);
      await refreshTicket();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this file? This action is irreversible.')) return;
    try {
      await ticketsApi.deleteAttachment(ticket.id, attachmentId);
      await refreshTicket();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Error deleting file');
    }
  };

  const handleDeleteTicket = async () => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action is irreversible and will also delete all associated comments and files.')) return;
    try {
      await ticketsApi.delete(ticket.id);
      alert('Ticket deleted successfully');
      navigate('/board');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error deleting ticket');
    }
  };

  const isNdrContent = (content: string) =>
    /couldn'?t be delivered|Recipient Unknown|550 5\.\d+\.\d+|Undeliverable:|non è stato possibile recapitare/i.test(content);

  const cleanEmailReplyContent = (content: string, fromEmail?: string): string => {
    let cleaned = content;

    // Detect HTML emails — also handles DOCTYPE-prefixed Outlook emails (<!DOCTYPE html>...)
    const isHtmlEmail = /^\s*(?:<!|<(?:html|div|p|table|span|img|h[1-6]|ul|ol|li|br))/i.test(cleaned)
      || /<(?:html|body)\b[^>]*>/i.test(cleaned.slice(0, 500));

    if (isHtmlEmail) {
      // 1. Strip <head> section (CSS/meta noise)
      cleaned = cleaned.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
      // 2. Strip quoted/forwarded sections
      cleaned = cleaned.replace(/<div[^>]*id="divRplyFwdMsg"[^>]*>[\s\S]*/gi, '');
      cleaned = cleaned.replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*/gi, '');
      cleaned = cleaned.replace(/<div[^>]*id="[^"]*yahoo_quoted[^"]*"[^>]*>[\s\S]*/gi, '');
      cleaned = cleaned.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');
      cleaned = cleaned.replace(/<div[^>]*style="[^"]*border-top[^"]*"[^>]*>[\s\S]*/gi, '');
      cleaned = cleaned.replace(/<hr[^>]*\/?>[\s\S]*/gi, '');
      // 3. Strip email signature (Outlook signatures are HTML tables with a logo image)
      cleaned = cleaned.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
      cleaned = cleaned.replace(/<img[^>]*\/?>/gi, '');
      // 4. Strip scripts and style blocks
      cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
      cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      // 5. Convert remaining HTML to plain text
      cleaned = cleaned
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      // Fall through to the plain-text cleanup below (strips trailing name/job-title lines)
    }

    if (isNdrContent(cleaned)) {
      const recipientMatch =
        cleaned.match(/message to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
        cleaned.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+wasn'?t found/i);
      const recipient = recipientMatch ? recipientMatch[1] : '';
      const codeMatch = cleaned.match(/(5\d{2}\s+5\.\d+\.\d+)/);
      const code = codeMatch ? codeMatch[1] : '550 5.1.10';
      return [
        `<strong style="font-size:13px;">&#9888;&ensp;Email not delivered</strong>`,
        recipient
          ? `<span style="font-size:12px;color:#555;">Recipient not found:&ensp;<strong>${recipient}</strong></span>`
          : '',
        `<span style="font-size:11px;color:#888;display:block;margin-top:4px;">Error code: ${code} — the address may be incorrect or non-existent.</span>`,
      ].filter(Boolean).join('<br>');
    }

    cleaned = cleaned.replace(/^📧\s*\*{0,2}Risposta da\s+[^:*]+:?\*{0,2}\s*/i, '');
    const notifCutPatterns = [
      /Ticket #[a-f0-9].*(?:Nuovo commento|Nuovo allegato)[\s\S]*/i,
      /Rispondi a questa email per aggiungere[\s\S]*/i,
      /Europoligrafico.*Sistema Kanban[\s\S]*/i,
    ];
    for (const pattern of notifCutPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    cleaned = cleaned.replace(/[^\n]*Email originale completa in allegato[^\n]*/gi, '');
    cleaned = cleaned.replace(/\*{0,2}Allegati:?\*{0,2}[\s\S]*$/im, '');
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/^[-─*]{3,}$/gm, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

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

    while (lines.length > 0) {
      const lastLine = lines[lines.length - 1].trim();
      if (!lastLine) { lines.pop(); continue; }
      if (/^[A-Z][a-zà-ú]+(\s+[A-Z][a-zà-ú]+){1,3}$/.test(lastLine) && lastLine.length < 40) {
        if (fromEmail) {
          const nameParts = lastLine.toLowerCase().split(/\s+/);
          const emailLocal = fromEmail.split('@')[0].toLowerCase().replace(/[._-]/g, ' ');
          const matchesEmail = nameParts.some(p => emailLocal.includes(p));
          if (matchesEmail) { lines.pop(); continue; }
        }
        const contentLines = lines.filter(l => l.trim().length > 0);
        if (contentLines.length === 1) lines.pop();
        break;
      }
      break;
    }

    let result = lines.join('\n').trim();

    if (!/<[a-z][^>]*>/i.test(result)) {
      result = result
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n/g, '<br>');
    }

    result = result.replace(
      /(<blockquote\b[^>]*>[\s\S]*?<\/blockquote>)/gi,
      '<details class="email-quote"><summary class="email-quote-sum">▶ Previous message</summary>$1</details>'
    );
    result = result.replace(
      /(<div\b[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>)/gi,
      (m) => `<details class="email-quote"><summary class="email-quote-sum">▶ Previous message</summary>${m}</details>`
    );
    result = result.replace(
      /(<p[^>]*>(?:On|Il)\s.{10,200}?(?:wrote:|ha scritto:)\s*<\/p>\s*)(<details class="email-quote")/gi,
      '$2'
    );
    result = result.replace(
      /((?:_{8,}|-{8,})\s*(?:<br\s*\/?>)?\s*(?:Da:|From:|De:).+)/i,
      '<details class="email-quote"><summary class="email-quote-sum">▶ Previous message</summary>$1</details>'
    );

    return result;
  };

  const isHtmlDescription = (desc: string) => /<[a-z][\s\S]*>/i.test(desc);

  const renderDescriptionMarkdown = (text: string): string => {
    return text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1" style="max-width:100%;max-height:300px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;display:block;margin:4px 0" /></a>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" download style="color:#4f6ef7">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0" />')
      .replace(/\n/g, '<br/>');
  };

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
      img { max-width: 100%; height: auto; }
      table { border-collapse: collapse; }
      a { color: #4f6ef7; }
    </style></head><body>${content}</body></html>`;
  };

  const handleEquipmentSubmit = async () => {
    if (!onboardingId) return;
    try {
      await onboardingApi.updateEquipment(onboardingId, equipmentData);
      alert('Equipment saved successfully! The IT ticket has been created automatically.');
      navigate('/board');
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      alert(error.response?.data?.error || 'Error saving equipment');
    }
  };

  const getTimeline = () => {
    if (!ticket) return [];
    const items: any[] = [];

    if (isEmailTicket) {
      const ticketCreatedMs = new Date(ticket.createdAt).getTime();
      const hasInitialEmailComment = (ticket.comments || []).some((c: any) =>
        c.isEmailReply && !c.isOutgoingEmail &&
        Math.abs(new Date(c.createdAt).getTime() - ticketCreatedMs) < 120_000
      );
      // Create the origin card even when description is empty so that
      // email attachments are always grouped here instead of appearing
      // as orphan "file upload" items.
      if (!hasInitialEmailComment) {
        items.push({
          type: 'comment',
          id: 'email-origin',
          date: new Date(ticket.createdAt),
          user: null,
          content: ticket.description || '',
          isEmailReply: true,
          isOutgoingEmail: false,
          fromEmail: ticket.externalContacts?.[0]?.email || '',
          toEmails: [],
          attachments: [],
        });
      }
    }

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
          attachments: [...(c.attachments || [])],
        });
      });
    }

    if (ticket.attachments) {
      const standaloneFiles = ticket.attachments.filter((att: any) => !att.commentId);
      standaloneFiles.forEach((att: any) => {
        const name: string = att.fileName || '';
        if (isSignatureImage(att)) return;
        if (/email.?originale|original.?email|email_originale/i.test(name)) return;

        if (isEmailTicket) {
          const attTime = new Date(att.createdAt || 0).getTime();
          const emailItems = items.filter(i => i.isEmailReply || i.isOutgoingEmail);
          let nearest: any = null;
          let nearestDiff = Infinity;
          emailItems.forEach(i => {
            const diff = Math.abs(i.date.getTime() - attTime);
            if (diff < nearestDiff) { nearest = i; nearestDiff = diff; }
          });
          if (nearest && nearestDiff < 60_000) {
            nearest.attachments.push(att);
            return;
          }
        }

        items.push({
          type: 'file',
          id: att.id,
          date: new Date(att.createdAt || Date.now()),
          user: att.uploadedBy,
          file: att,
        });
      });
    }

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  if (loading) {
    return <div className="page"><div className="loading">Loading...</div></div>;
  }

  if (!ticket) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p>Ticket not found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/board')}>← Back to board</button>
        </div>
      </div>
    );
  }

  const isEmailTicket = !!(ticket.emailThreadId || (ticket.externalContacts && ticket.externalContacts.length > 0));
  const emailSender = ticket.externalContacts?.[0] || null;
  const onboardingIdMatch = ticket.description?.match(/\[ONBOARDING_ID:([^\]]+)\]/);
  const onboardingId = onboardingIdMatch ? onboardingIdMatch[1] : null;
  const isOnboardingTicket = ticket.category === 'Onboarding - Dotazioni' && onboardingId;
  const timeline = getTimeline();

  return (
    <div className="page ticket-detail-page">

      {/* ── Header ── */}
      <div className="ticket-detail-header">
        <button
          className="ticket-back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div className="ticket-detail-title-block">
          <h2 className="ticket-detail-title">{ticket.title}</h2>
          <div className="ticket-detail-badges">
            <select
              className={`badge badge-${ticket.priority.toLowerCase()}`}
              value={ticket.priority}
              onChange={async (e) => {
                const newPriority = e.target.value;
                try {
                  await ticketsApi.update(ticket.id, { priority: newPriority });
                  setTicket({ ...ticket, priority: newPriority });
                } catch (err) {
                  console.error('Error updating priority:', err);
                }
              }}
              style={{ cursor: 'pointer', border: '1px solid transparent', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: '600', appearance: 'auto' as any }}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <select
              value={ticket.status}
              onChange={async (e) => {
                const newStatus = e.target.value;
                if (newStatus !== ticket.status) {
                  try {
                    await ticketsApi.update(ticket.id, { status: newStatus });
                    setTicket({ ...ticket, status: newStatus });
                  } catch (err) {
                    console.error('Error updating status:', err);
                  }
                }
              }}
              style={{ cursor: 'pointer', border: '2px solid #000000', borderRadius: '0', padding: '4px 8px', fontSize: '11px', fontWeight: '700', background: '#F5F0EB', color: '#0A0A0A', textTransform: 'uppercase', letterSpacing: '0.06em', appearance: 'auto' as any }}
            >
              <option value="OPEN">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING">Waiting</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {user.role === 'ADMIN' && (
          <button
            className="btn btn-secondary"
            onClick={handleDeleteTicket}
            style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '12px', padding: '5px 10px' }}
            title="Delete ticket (ADMIN only)"
          >
            🗑️ Delete
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="ticket-detail-body">

        {/* ── Left column: info, description, assignments ── */}
        <div className="ticket-col-left">
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
                    <span className="email-description-sender">From: {emailSender}</span>
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
          ) : null}

          <div className="ticket-details">
            <div className="ticket-detail-item">
              <span className="ticket-detail-label">ID</span>
              <span className="ticket-detail-value ticket-id-chip">#{ticket.id.substring(0, 8).toUpperCase()}</span>
            </div>
            {ticket.category && (
              <div className="ticket-detail-item">
                <span className="ticket-detail-label">Category</span>
                <span className="ticket-detail-value">{ticket.category}</span>
              </div>
            )}
            <div className="ticket-detail-item">
              <span className="ticket-detail-label">Created by</span>
              <span className="ticket-detail-value">{ticket.createdBy.firstName} {ticket.createdBy.lastName}</span>
            </div>
            <div className="ticket-detail-item">
              <span className="ticket-detail-label">Assigned to</span>
              <span className="ticket-detail-value">
                {ticket.assignedTo
                  ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                  : <em style={{ color: '#999', fontStyle: 'normal' }}>Unassigned</em>}
              </span>
            </div>
            <div className="ticket-detail-item">
              <span className="ticket-detail-label">SLA Deadline</span>
              <span className="ticket-detail-value">{new Date(ticket.dueDate).toLocaleString('en-GB')}</span>
            </div>
            <div className="ticket-detail-item">
              <span className="ticket-detail-label">SLA</span>
              <span className="ticket-detail-value">{ticket.slaHours}h</span>
            </div>
          </div>
        </div>

        {/* Onboarding Equipment Form */}
        {isOnboardingTicket && ticket.status !== 'RESOLVED' && (
          <div style={{ margin: '15px 0', padding: '15px', backgroundColor: '#FFE600', border: '2px solid #000000', borderRadius: '0' }}>
            {!showEquipmentForm ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '10px', fontWeight: '600' }}>
                  This ticket requires filling in the equipment for the new employee.
                </p>
                <button className="btn btn-primary" onClick={() => setShowEquipmentForm(true)} style={{ fontSize: '15px', padding: '10px 25px' }}>
                  Fill in Equipment
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ marginBottom: '15px', borderBottom: '3px solid #000000', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 900 }}>
                  Equipment for New Employee
                </h3>
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
            <button className="assignments-toggle" onClick={() => setShowAssignments(!showAssignments)}>
              {showAssignments ? '▲ Close' : '⚙ Manage'}
            </button>
          </div>

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
                    <button className="chip-remove" title="Remove" onClick={() => handleRemoveUser(assignment.userId)}>×</button>
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
                    <button className="chip-remove" title="Remove" onClick={() => handleRemoveDepartment(dept)}>×</button>
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
                      <span className="chip-dept">External</span>
                    </span>
                    <button className="chip-remove" title="Remove" onClick={() => handleRemoveExternalContact(email)}>×</button>
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

            {showAssignments && (
              <div className="assignment-panel">
                <div className="assign-tabs">
                  <button className={`assign-tab ${assignTab === 'users' ? 'active' : ''}`} onClick={() => setAssignTab('users')}>Users</button>
                  <button className={`assign-tab ${assignTab === 'departments' ? 'active' : ''}`} onClick={() => setAssignTab('departments')}>Departments</button>
                </div>

                {assignTab === 'users' && (
                  <div>
                    <div className="assignment-search-wrapper">
                      <span className="assignment-search-icon">○</span>
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
        </div>

        </div>{/* /ticket-col-left */}

        {/* ── Right column: conversation + composer ── */}
        <div className="ticket-col-right">
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


              const fileAuthor = cardType === 'files'
                ? (authorName || item.file?.uploadedBy?.email || item.fromEmail || 'Sistema')
                : null;
              const primaryLabel = (cardType === 'email-in' || cardType === 'email-ndr')
                ? (item.fromEmail || 'Email')
                : cardType === 'files'
                ? fileAuthor!
                : authorName || 'Sistema';

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


              const atts: any[] = item.attachments || [];
              const isEmailItem = item.isEmailReply || item.isOutgoingEmail;
              const realImages = atts.filter((a: any) =>
                a.mimeType?.startsWith('image/') &&
                !(isEmailItem && (a.isInline || isSignatureImage(a)))
              );
              const otherFiles = atts.filter((a: any) =>
                !a.mimeType?.startsWith('image/') && !(isEmailItem && a.isInline)
              );

              const fmtDate = (d: Date) => d.toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: '2-digit',
                hour: '2-digit', minute: '2-digit',
              });

              const processedContent = item.isEmailReply
                ? cleanEmailReplyContent(item.content, item.fromEmail)
                : item.content;

              return (
                <div key={`${item.type}-${item.id}`} className={`conv-msg conv-msg--${cardType}`}>
                  <UserAvatar
                    user={item.user || {
                      firstName: item.fromEmail ? item.fromEmail.split('@')[0] : '?',
                      email: item.fromEmail || undefined,
                    }}
                    className="conv-msg-avatar"
                  />
                  <div className="conv-msg-card">
                    <div className="conv-msg-head">
                      <div className="conv-msg-sender-col">
                        <span className="conv-msg-primary">{primaryLabel}</span>
                        {subLabel && <span className="conv-msg-sub">{subLabel}</span>}
                      </div>
                      <div className="conv-msg-right-col">
                        {cardType === 'email-in'  && <span className="conv-dir conv-dir--in">↓ Received</span>}
                        {cardType === 'email-out' && <span className="conv-dir conv-dir--out">↑ Sent</span>}
                        {cardType === 'email-ndr' && <span className="conv-dir conv-dir--ndr">⚠ Bounce</span>}
                        {cardType === 'internal'  && <span className="conv-dir conv-dir--note">Internal note</span>}
                        <span className="conv-msg-time" title={item.date.toLocaleString('en-GB')}>
                          {fmtDate(item.date)}
                        </span>
                        {user.role === 'ADMIN' && item.type === 'comment' && (
                          <button className="conv-msg-del" onClick={() => handleDeleteComment(item.id)} title="Delete">✕</button>
                        )}
                      </div>
                    </div>

                    {item.type === 'comment' && (
                      <div className="conv-msg-body" dangerouslySetInnerHTML={{ __html: processedContent }} />
                    )}

                    {item.type === 'file' && (
                      item.file?.mimeType?.startsWith('image/') ? (
                        <div className="conv-msg-file-preview">
                          <div className="conv-att-img-wrap">
                            <a href={`${UPLOADS_URL}/${item.file.filePath}`} target="_blank" rel="noopener noreferrer">
                              <img src={`${UPLOADS_URL}/${item.file.filePath}`} alt={item.file.fileName} className="conv-img-thumb" />
                            </a>
                            {user.role === 'ADMIN' && (
                              <button className="conv-img-del" onClick={() => handleDeleteAttachment(item.file.id)} title="Delete">✕</button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="conv-msg-file-preview">
                          <ConvFileChip att={item.file} onDelete={user.role === 'ADMIN' ? () => handleDeleteAttachment(item.file.id) : undefined} />
                        </div>
                      )
                    )}

                    {item.type === 'comment' && (realImages.length > 0 || otherFiles.length > 0) && (
                      <div className="conv-msg-atts">
                        {realImages.map((a: any) => (
                          <div key={a.id} className="conv-att-img-wrap">
                            <a href={`${UPLOADS_URL}/${a.filePath}`} target="_blank" rel="noopener noreferrer">
                              <img src={`${UPLOADS_URL}/${a.filePath}`} alt={a.fileName} className="conv-img-thumb" />
                            </a>
                            {user.role === 'ADMIN' && (
                              <button className="conv-img-del" onClick={() => handleDeleteAttachment(a.id)} title="Delete">✕</button>
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
              <div className="conv-no-activity">No activity</div>
            )}
            <div ref={convEndRef} />
          </div>

          {/* Composer */}
          <div className="unified-form" style={{ position: 'relative' }}>
            <span className="unified-form-label">Add comment &amp; files</span>
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
                        e.preventDefault();
                        const name = `${u.firstName} ${u.lastName}`;
                        const html = `<span class="mention mention--user" data-user-id="${u.id}" contenteditable="false">@${name}</span>&nbsp;`;
                        editorRef.current?.replaceMentionQuery(mentionQuery, html);
                        setMentionQuery(null);
                      }}
                    >
                      <UserAvatar user={u} style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.firstName} {u.lastName}</div>
                        {u.department && <div style={{ fontSize: 11, color: '#6b7280' }}>{u.department}</div>}
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>assign</div>
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
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Add external contact · will receive email</div>
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
              placeholder="Write a comment... (@name for colleagues, @email@ext.com for external contacts)"
              minHeight={80}
              borderless
              onPasteFiles={(pastedFiles: File[]) => setFiles(prev => [...prev, ...pastedFiles])}
              onMentionQuery={setMentionQuery}
            />
            <div className="composer-bottom-bar">
              <div className="composer-left">
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
                <label htmlFor="file-upload" className="composer-icon-btn" title="Attach file">📎</label>

                <div ref={emojiPickerRef} style={{ position: 'relative' }}>
                  <button type="button" className="composer-icon-btn" title="Insert emoji" onClick={() => setShowEmoji(p => !p)}>😊</button>
                  {showEmoji && (
                    <div className="emoji-picker">
                      {EMOJI_LIST.map((emoji) => (
                        <button key={emoji} type="button" className="emoji-btn" onClick={() => { editorRef.current?.insertText(emoji); setShowEmoji(false); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {files.length > 0 && (
                  <div className="selected-files-list">
                    {files.map((f, i) => (
                      <span key={i} className="selected-file-tag">
                        {f.name}
                        <button className="clear-file-btn" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} type="button">✕</button>
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
        </div>{/* /ticket-col-right */}
      </div>
    </div>
  );
};

export default TicketDetail;
