import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configurazione transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Invia email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  ticketId?: string
) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });

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

    return info;
  } catch (error: any) {
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

/* ──────────────────────────────────────────────────────────────────────────
 * Email quote stripping
 * Removes quoted original message from a reply email body (HTML or plain text).
 * ────────────────────────────────────────────────────────────────────────── */

function stripHtmlQuotes(html: string): string {
  let result = html;

  // Gmail quote div
  result = result.replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?(<\/div>)/gi, '');
  // Yahoo quoted
  result = result.replace(/<div[^>]*id="[^"]*yahoo_quoted[^"]*"[^>]*>[\s\S]*?(<\/div>)/gi, '');
  // Outlook blockquote (with border-left style)
  result = result.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');
  // Outlook HR separator + everything after
  result = result.replace(/(<hr[^>]*\/?>\s*(?:<p[^>]*>|<div[^>]*>)\s*(?:Da|From|De|Von):[\s\S]*)/gi, '');
  // Generic HR separator lines
  result = result.replace(/<hr[^>]*\/?>[\s\S]*$/gi, '');

  // Strip remaining HTML tags
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities
  result = result
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalise whitespace
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

function stripPlainTextQuotes(text: string): string {
  const lines = text.split('\n');
  const resultLines: string[] = [];

  // Patterns that mark the beginning of quoted/forwarded content
  const quoteSeparatorRe = [
    /^-{3,}/,                                   // --- or -----
    /^_{3,}/,                                   // ___
    /^Da:\s/i,                                  // Italian Outlook: Da: ...
    /^From:\s/i,                                // English: From: ...
    /^De:\s/i,                                  // French: De: ...
    /^Von:\s/i,                                 // German: Von: ...
    /^Il\s.+\sha\s+scritto:/i,                  // Italian Gmail: "Il ... ha scritto:"
    /^On\s.+,\s*.+\s+wrote:/i,                 // English Gmail: "On ..., ... wrote:"
    /^Le\s.+,\s*.+\s+a\s+écrit\s*:/i,          // French Gmail
    /^Am\s.+schrieb\s+.+:/i,                   // German Gmail
    /^\s*>\s*On\s/i,                            // "> On ... wrote:"
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that are pure quoted content (start with >)
    if (/^>/.test(line)) continue;

    // Check if this line opens a quoted block
    let isQuoteStart = false;
    for (const re of quoteSeparatorRe) {
      if (re.test(line.trim())) { isQuoteStart = true; break; }
    }
    if (isQuoteStart) break; // Everything from here is quoted — stop

    resultLines.push(line);
  }

  // Trim trailing blank lines
  while (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() === '') {
    resultLines.pop();
  }

  return resultLines.join('\n').trim();
}

/**
 * Strips quoted / forwarded content from an inbound email body.
 * Accepts both HTML and plain-text bodies.
 */
export function stripEmailQuotes(body: string): string {
  if (!body) return '';
  const isHtml = /<html|<body|<div|<p[^>]*>|<br/i.test(body);
  return isHtml ? stripHtmlQuotes(body) : stripPlainTextQuotes(body);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Inbound email processing
 * Either adds a comment to an existing ticket (reply) or creates a new one.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Extracts a ticket short-ID (first 8 chars) from a subject like:
 *   "Re: Support request - Ticket #a1b2c3d4 - ..."
 *   "Re: Ticket #a1b2c3d4 creato"
 */
function extractTicketIdFromSubject(subject: string): string | null {
  const match = subject.match(/ticket\s*#([a-f0-9-]{8,})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Processes an inbound email:
 *  - If the subject contains a known ticket ID → adds a comment to that ticket
 *  - Otherwise → creates a new ticket
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
    // Find the ticket whose UUID starts with this short ID
    const ticket = await prisma.ticket.findFirst({
      where: { id: { startsWith: shortId } }
    });

    if (ticket) {
      return await addInboundComment(ticket.id, from, cleanedBody);
    }
  }

  // No matching ticket → create a new one
  return await createTicketFromEmail(from, subject, cleanedBody, attachments);
}

/**
 * Adds an inbound email reply as a comment on an existing ticket.
 */
async function addInboundComment(ticketId: string, fromEmail: string, body: string) {
  // Find or create the sender as a user
  let user = await prisma.user.findUnique({ where: { email: fromEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: fromEmail,
        password: '',
        firstName: fromEmail.split('@')[0],
        lastName: 'External',
        role: 'USER'
      }
    });
  }

  const comment = await (prisma.comment as any).create({
    data: {
      ticketId,
      userId: user.id,
      content: body,
      isEmailReply: true,
      fromEmail,
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } }
    }
  });

  return comment;
}

/**
 * Crea ticket da email (nuova richiesta in arrivo)
 */
export async function createTicketFromEmail(
  from: string,
  subject: string,
  body: string,
  attachments: any[]
) {
  // Trova o crea utente
  let user = await prisma.user.findUnique({ where: { email: from } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: from,
        password: '',
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

  // Crea ticket
  const ticket = await prisma.ticket.create({
    data: {
      title: subject,
      description: body,
      boardId: board.id,
      columnId: column.id,
      createdById: user.id,
      priority,
      slaHours,
      dueDate: new Date(Date.now() + slaHours * 60 * 60 * 1000),
      emailThreadId: from
    }
  });

  // Invia conferma
  await sendEmail(
    from,
    `Re: ${subject} - Ticket #${ticket.id.substring(0, 8)} creato`,
    `
      <h2>Ticket creato con successo</h2>
      <p>Il tuo ticket è stato registrato nel sistema.</p>
      <ul>
        <li><strong>ID:</strong> ${ticket.id}</li>
        <li><strong>Priorità:</strong> ${priority}</li>
        <li><strong>SLA:</strong> ${slaHours} ore</li>
        <li><strong>Scadenza:</strong> ${ticket.dueDate.toLocaleString('it-IT')}</li>
      </ul>
      <p>Riceverai aggiornamenti via email.</p>
    `,
    ticket.id
  );

  return ticket;
}

/**
 * Listener per email in arrivo
 * NOTA: In produzione, usare webhook IMAP o servizio come SendGrid/Mailgun
 */
export async function startEmailListener() {
  console.log('📧 Email listener configurato per: ' + process.env.EMAIL_USER);
  console.log('⚠️  Per produzione, configurare webhook email (SendGrid, Mailgun, etc.)');
}

/**
 * Notifica cambiamento ticket
 */
export async function notifyTicketUpdate(
  ticketId: string,
  updateType: string,
  details: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
      assignedTo: true
    }
  });

  if (!ticket) return;

  const recipients = [ticket.createdBy.email];
  if (ticket.assignedTo) {
    recipients.push(ticket.assignedTo.email);
  }

  const subject = `Ticket #${ticket.id.substring(0, 8)} - ${updateType}`;
  const html = `
    <h2>Aggiornamento Ticket</h2>
    <p><strong>Titolo:</strong> ${ticket.title}</p>
    <p><strong>Aggiornamento:</strong> ${details}</p>
    <p><a href="${process.env.APP_URL}/tickets/${ticket.id}">Visualizza ticket</a></p>
  `;

  for (const email of recipients) {
    await sendEmail(email, subject, html, ticketId);
  }
}
