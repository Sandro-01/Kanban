import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { getSmtpConfig, getCompanyName, getCompanyLogoUrl } from './config.service';
import {
  buildEmailHtml, infoTable, messageBlock, attachmentsList,
  callToAction, priorityBadge, sanitizeHtmlForEmail,
} from '../utils/emailTemplate';

const prisma = new PrismaClient();

// Crea transporter SMTP dinamicamente dalla config DB (con fallback env)
async function getTransporter() {
  const smtp = await getSmtpConfig();
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
  });
}

/**
 * Invia email (usa Graph API se configurato, altrimenti SMTP)
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  ticketId?: string,
  fileAttachments?: { fileName: string; filePath: string; mimeType: string }[]
) {
  try {
    // Usa Graph API se Azure AD è configurato
    if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
      const { sendEmailViaGraph } = await import('./graphEmail.service');
      // Converti allegati in formato Graph API (base64)
      let graphAttachments: { name: string; contentBytes: string; contentType: string }[] | undefined;
      if (fileAttachments && fileAttachments.length > 0) {
        const uploadDir = path.join(__dirname, '../../../uploads');
        graphAttachments = fileAttachments.map(att => {
          const fullPath = path.join(uploadDir, att.filePath);
          const content = fs.readFileSync(fullPath);
          return {
            name: att.fileName,
            contentBytes: content.toString('base64'),
            contentType: att.mimeType,
          };
        });
      }
      await sendEmailViaGraph([to], subject, html, graphAttachments);
    } else {
      // SMTP con allegati
      const uploadDir = path.join(__dirname, '../../../uploads');
      const nodemailerAttachments = fileAttachments?.map(att => ({
        filename: att.fileName,
        path: path.join(uploadDir, att.filePath),
        contentType: att.mimeType,
      }));
      const smtp = await getSmtpConfig();
      const transport = await getTransporter();
      await transport.sendMail({
        from: smtp.from,
        to,
        subject,
        html,
        attachments: nodemailerAttachments,
      });
    }

    await prisma.emailLog.create({
      data: {
        ticketId,
        to,
        from: process.env.EMAIL_FROM || '',
        subject,
        body: html,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    console.log(`✅ Email inviata a: ${to}`);
  } catch (error: any) {
    console.error(`❌ Errore invio email a ${to}:`, error.message);
    await prisma.emailLog.create({
      data: {
        ticketId,
        to,
        from: process.env.EMAIL_FROM || '',
        subject,
        body: html,
        status: 'FAILED',
        error: error.message
      }
    });

    throw error;
  }
}

/**
 * Replaces cid: references in HTML body with actual file URLs.
 * Returns { html, cidMap } where cidMap maps cid → filePath.
 */
function replaceCidRefs(html: string, cidMap: Map<string, string>): string {
  return html.replace(/src=["']cid:([^"']+)["']/gi, (_match, cid) => {
    // Try exact CID, then the part before @ (some clients include domain)
    const url = cidMap.get(cid) || cidMap.get(cid.split('@')[0]);
    return url ? `src="${url}"` : `src="cid:${cid}"`;
  });
}

/**
 * Lightweight server-side HTML sanitization: removes scripts, event handlers
 * and javascript: hrefs. DOMPurify on the client handles the final pass.
 */
function sanitizeIncomingHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
}

/**
 * Crea ticket da email
 */
export async function createTicketFromEmail(
  from: string,
  subject: string,
  body: string,
  htmlBody: string | null,  // full HTML body from email (may contain cid: refs)
  attachments: any[],
  emailMessageId?: string,
  ccRecipients: string[] = []  // To/CC recipients to include in externalContacts
) {
  // Deduplicazione: controlla se esiste già un ticket per questo messaggio email
  if (emailMessageId) {
    try {
      const existing: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT id FROM "Ticket" WHERE "emailMessageId" = $1 LIMIT 1`,
        emailMessageId
      );
      if (existing.length > 0) {
        console.log(`⚠️ Ticket già esistente per emailMessageId ${emailMessageId}, skip`);
        return existing[0];
      }
    } catch {
      // Campo emailMessageId non ancora presente nel DB
    }
  }

  // Trova o crea utente
  let user = await prisma.user.findUnique({ where: { email: from } });

  if (!user) {
    // Crea utente temporaneo
    user = await prisma.user.create({
      data: {
        email: from,
        password: '', // Richiederà reset password
        firstName: from.split('@')[0],
        lastName: 'Email User',
        role: 'USER'
      }
    });
  }

  // Trova board di default
  let board = await prisma.board.findFirst();
  if (!board) {
    board = await prisma.board.create({
      data: {
        name: 'Main Board',
        description: 'Default board'
      }
    });
  }

  // Trova prima colonna
  let column = await prisma.column.findFirst({
    where: { boardId: board.id },
    orderBy: { order: 'asc' }
  });

  if (!column) {
    column = await prisma.column.create({
      data: {
        boardId: board.id,
        name: 'To Do',
        order: 0
      }
    });
  }

  // Determina SLA basato su parole chiave
  let slaHours = 24;
  let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

  if (subject.toLowerCase().includes('urgent') || subject.toLowerCase().includes('critico')) {
    priority = 'CRITICAL';
    slaHours = 4;
  } else if (subject.toLowerCase().includes('importante') || subject.toLowerCase().includes('high')) {
    priority = 'HIGH';
    slaHours = 24;
  }

  const baseUrl = process.env.APP_URL || 'http://localhost:5000';

  // ── Save attachments first so we can build the cid→URL map ────────────────
  const cidMap = new Map<string, string>(); // cid → full URL
  if (attachments && attachments.length > 0) {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    for (const attachment of attachments) {
      try {
        if (!attachment.content) continue;
        const fileName = attachment.filename || `attachment-${Date.now()}`;
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName}`;
        const filePath = path.join(uploadDir, uniqueFileName);
        fs.writeFileSync(filePath, attachment.content);

        // Build cid map BEFORE ticket creation so HTML can reference the URLs
        if (attachment.cid) {
          const fileUrl = `${baseUrl}/uploads/${uniqueFileName}`;
          cidMap.set(attachment.cid, fileUrl);
          cidMap.set(attachment.cid.split('@')[0], fileUrl); // also map local part
        }

        // Store temporarily; we create DB records after the ticket exists
        (attachment as any)._uniqueFileName = uniqueFileName;
        (attachment as any)._fileName = fileName;
        console.log(`   ✅ Allegato salvato: ${fileName}`);
      } catch (err) {
        console.error(`   ❌ Errore salvataggio allegato ${attachment.filename}:`, err);
      }
    }
  }

  // ── Build description: prefer HTML body (with cid refs replaced) ───────────
  let description: string;
  if (htmlBody && htmlBody.trim()) {
    const processedHtml = sanitizeIncomingHtml(replaceCidRefs(htmlBody, cidMap));
    description = processedHtml;
  } else {
    description = cleanEmailBodyForDescription(body);
  }

  // Crea ticket
  const smtp = await getSmtpConfig();
  const emailDomain = smtp.from.includes('@') ? smtp.from.split('@')[1] : 'kanban.local';
  const emailThreadId = `ticket-${Date.now()}@${emailDomain}`;
  const ticketData: any = {
    title: subject,
    description,
    boardId: board.id,
    columnId: column.id,
    createdById: user.id,
    priority,
    slaHours,
    dueDate: new Date(Date.now() + slaHours * 60 * 60 * 1000),
    emailThreadId,
    externalContacts: Array.from(new Set([from, ...ccRecipients].map(e => e.toLowerCase()))),
  };

  // Aggiungi emailMessageId se presente (richiede migrazione DB)
  if (emailMessageId) {
    ticketData.emailMessageId = emailMessageId;
  }

  const ticket = await prisma.ticket.create({ data: ticketData });

  // ── Create DB attachment records now that we have the ticket ID ───────────
  for (const attachment of (attachments || [])) {
    try {
      const uniqueFileName = (attachment as any)._uniqueFileName;
      const fileName = (attachment as any)._fileName;
      if (!uniqueFileName) continue;

      const isInline = !!attachment.cid;
      await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          uploadedById: user.id,
          fileName,
          filePath: uniqueFileName,
          fileSize: attachment.size || attachment.content.length,
          mimeType: attachment.contentType || 'application/octet-stream',
          isInline,
          contentId: attachment.cid || null,
        } as any,
      });
    } catch (err) {
      console.error(`   ❌ Errore record DB allegato:`, err);
    }
  }

  // Registra nella history
  await prisma.ticketHistory.create({
    data: {
      ticketId: ticket.id,
      field: 'created',
      newValue: `Ticket creato da email di ${from}`,
      changedBy: user.id
    }
  });

  // Invia conferma con [Ticket #ID] per tracciamento risposte (non bloccante)
  try {
    const companyName = await getCompanyName();
    const logoUrl = await getCompanyLogoUrl();

    const confirmBody = [
      `<p style="margin:0 0 24px;font-size:14px;color:#000000;line-height:1.75;">La tua richiesta è stata presa in carico. Di seguito i dettagli:</p>`,
      infoTable([
        { label: 'Ticket', value: `#${ticket.id.substring(0, 8)}` },
        { label: 'Oggetto', value: subject },
        { label: 'Priorità', value: priority, highlight: true },
        { label: 'SLA', value: `${slaHours} ore` },
        { label: 'Scadenza', value: ticket.dueDate.toLocaleString('it-IT') },
      ]),
      callToAction('<strong>Rispondi a questa email</strong> per aggiungere aggiornamenti al ticket.'),
    ].join('');

    await sendEmail(
      from,
      `[Ticket #${ticket.id.substring(0, 8)}] Re: ${subject}`,
      buildEmailHtml({
        companyName,
        logoUrl,
        heading: 'Richiesta ricevuta',
        subheading: `Ticket #${ticket.id.substring(0, 8)}`,
        body: confirmBody,
        footerRef: `Ref: #${ticket.id.substring(0, 8)}`,
      }),
      ticket.id
    );
  } catch (err: any) {
    console.warn(`⚠️ Email di conferma non inviata a ${from}: ${err.message}`);
  }

  return ticket;
}

// ── Inbound email helpers ─────────────────────────────────────────────────

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : raw.trim().toLowerCase();
}

function extractDisplayName(raw: string): string {
  const match = raw.match(/^(.+?)\s*</);
  if (match) return match[1].trim();
  return raw.split('@')[0];
}

function extractTicketIdFromSubject(subject: string): string | null {
  const match = subject.match(/ticket\s*#([a-f0-9-]{8,})/i);
  return match ? match[1].toLowerCase() : null;
}

function stripPlainTextQuotes(text: string): string {
  const lines = text.split('\n');
  const resultLines: string[] = [];
  const quoteSeparatorRe = [
    /^-{3,}/, /^_{3,}/,
    /^Da:\s/i, /^From:\s/i, /^De:\s/i, /^Von:\s/i,
    /^Il\s.+\sha\s+scritto:/i,
    /^On\s.+,\s*.+\s+wrote:/i,
    /^Le\s.+,\s*.+\s+a\s+écrit\s*:/i,
    /^Am\s.+schrieb\s+.+:/i,
    /^\s*>\s*On\s/i,
  ];
  for (const line of lines) {
    if (/^>/.test(line)) continue;
    let isQuoteStart = false;
    for (const re of quoteSeparatorRe) { if (re.test(line.trim())) { isQuoteStart = true; break; } }
    if (isQuoteStart) break;
    resultLines.push(line);
  }
  while (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() === '') resultLines.pop();
  return resultLines.join('\n').trim();
}

function stripHtmlQuotes(html: string): string {
  let result = html;
  result = result.replace(/<div[^>]*id="divRplyFwdMsg"[^>]*>[\s\S]*/gi, '');
  result = result.replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*/gi, '');
  result = result.replace(/<div[^>]*id="[^"]*yahoo_quoted[^"]*"[^>]*>[\s\S]*/gi, '');
  result = result.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');
  result = result.replace(/<div[^>]*style="[^"]*border-top[^"]*"[^>]*>[\s\S]*/gi, '');
  result = result.replace(/<hr[^>]*\/?>[\s\S]*/gi, '');
  result = result.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
  result = result.replace(/<img[^>]*\/?>/gi, '');
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<[^>]+>/g, ' ');
  result = result.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  result = result.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  result = stripPlainTextQuotes(result);
  return result.trim();
}

export function stripEmailQuotes(body: string): string {
  if (!body) return '';
  const isHtml = /<html|<body|<div|<p[^>]*>|<br/i.test(body);
  const cleaned = isHtml ? stripHtmlQuotes(body) : stripPlainTextQuotes(body);
  if (!cleaned.trim()) {
    let fallback = body;
    if (isHtml) {
      fallback = body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return fallback;
  }
  return cleaned;
}

export function cleanEmailBodyForDescription(body: string): string {
  return stripEmailQuotes(body);
}

/**
 * Processa email in arrivo: aggiorna ticket esistente o ne crea uno nuovo
 */
export async function processInboundEmail(
  from: string,
  subject: string,
  rawBody: string,
  attachments: any[]
) {
  const cleanedBody = stripEmailQuotes(rawBody);
  const shortId = extractTicketIdFromSubject(subject);

  if (shortId) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: { startsWith: shortId } }
    });
    if (ticket) {
      return await addInboundComment(ticket.id, from, cleanedBody);
    }
  }

  return await createTicketFromEmail(from, subject, cleanedBody, null, attachments);
}

async function addInboundComment(ticketId: string, fromRaw: string, body: string) {
  const fromEmail = extractEmailAddress(fromRaw);
  let user = await prisma.user.findUnique({ where: { email: fromEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: fromEmail,
        password: '',
        firstName: extractDisplayName(fromRaw),
        lastName: 'External',
        role: 'USER'
      }
    });
  }
  return await (prisma.comment as any).create({
    data: { ticketId, userId: user.id, content: body, isEmailReply: true, fromEmail },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } }
  });
}

/**
 * Listener per email in arrivo
 * NOTA: In produzione, usare webhook IMAP o servizio come SendGrid/Mailgun
 */
export async function startEmailListener() {
  console.log('📧 Email listener configurato per: ' + process.env.EMAIL_USER);
  console.log('⚠️  Per produzione, configurare webhook email (SendGrid, Mailgun, etc.)');

  // Questo è un placeholder - in produzione si userebbe:
  // - IMAP listener
  // - Webhook da SendGrid/Mailgun
  // - AWS SES
}

/**
 * Notifica cambiamento ticket
 */
export async function notifyTicketUpdate(
  ticketId: string,
  updateType: string,
  details: string,
  fileAttachments?: { fileName: string; filePath: string; mimeType: string }[],
  authorName?: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
      assignedTo: true
    }
  });

  if (!ticket) return;

  // Raccogli tutti i destinatari (senza duplicati)
  const recipientSet = new Set<string>();
  recipientSet.add(ticket.createdBy.email);
  if (ticket.assignedTo) {
    recipientSet.add(ticket.assignedTo.email);
  }
  // Includi contatti esterni (chi ha creato il ticket via email)
  if (ticket.externalContacts && ticket.externalContacts.length > 0) {
    ticket.externalContacts.forEach((email: string) => recipientSet.add(email));
  }

  // Colori per tipo aggiornamento
  const typeColors: Record<string, string> = {
    'Nuovo commento': '#2563eb',
    'Nuovo allegato': '#7c3aed',
    'Assegnazione': '#d97706',
  };
  const accentColor = typeColors[updateType] || '#2563eb';

  const companyName = await getCompanyName();
  const logoUrl = await getCompanyLogoUrl();
  const attachFileNames = fileAttachments?.map(a => a.fileName) || [];

  const notifBody = [
    `<p style="margin:0 0 4px;font-size:9px;font-weight:800;color:#888888;text-transform:uppercase;letter-spacing:2px;">Oggetto ticket</p>`,
    `<p style="margin:0 0 24px;font-size:16px;font-weight:800;color:#000000;letter-spacing:-0.2px;">${ticket.title}</p>`,
    messageBlock(sanitizeHtmlForEmail(details), { author: authorName, accentColor }),
    attachmentsList(attachFileNames),
    callToAction('<strong>Rispondi a questa email</strong> per aggiungere un commento al ticket.', accentColor),
  ].join('');

  const subject = `[Ticket #${ticket.id.substring(0, 8)}] ${ticket.title} - ${updateType}`;
  const html = buildEmailHtml({
    companyName,
    logoUrl,
    heading: updateType,
    subheading: `Ticket #${ticket.id.substring(0, 8)}`,
    accentColor,
    body: notifBody,
    footerRef: `Ref: #${ticket.id.substring(0, 8)}`,
  });

  for (const email of recipientSet) {
    try {
      await sendEmail(email, subject, html, ticketId, fileAttachments);
    } catch (err: any) {
      console.error(`⚠️ Notifica non inviata a ${email}: ${err.message}`);
    }
  }
}


