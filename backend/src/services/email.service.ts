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
 * Crea ticket da email
 */
export async function createTicketFromEmail(
  from: string,
  subject: string,
  body: string,
  attachments: any[],
  emailMessageId?: string
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

  // Pulisci il corpo email per la descrizione
  const cleanBody = cleanEmailBodyForDescription(body);

  // Crea ticket con descrizione pulita (verrà aggiornata con link allegati)
  const smtp = await getSmtpConfig();
  const emailDomain = smtp.from.includes('@') ? smtp.from.split('@')[1] : 'kanban.local';
  const emailThreadId = `ticket-${Date.now()}@${emailDomain}`;
  const ticketData: any = {
    title: subject,
    description: cleanBody,
    boardId: board.id,
    columnId: column.id,
    createdById: user.id,
    priority,
    slaHours,
    dueDate: new Date(Date.now() + slaHours * 60 * 60 * 1000),
    emailThreadId,
    externalContacts: [from],
  };

  // Aggiungi emailMessageId se presente (richiede migrazione DB)
  if (emailMessageId) {
    ticketData.emailMessageId = emailMessageId;
  }

  const ticket = await prisma.ticket.create({ data: ticketData });

  // Salva allegati se presenti
  const savedAttachments: { fileName: string; filePath: string; mimeType: string }[] = [];
  if (attachments && attachments.length > 0) {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const attachment of attachments) {
      try {
        if (!attachment.filename || !attachment.content) continue;
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${attachment.filename}`;
        const filePath = path.join(uploadDir, uniqueFileName);
        fs.writeFileSync(filePath, attachment.content);

        await prisma.attachment.create({
          data: {
            ticketId: ticket.id,
            uploadedById: user.id,
            fileName: attachment.filename,
            filePath: uniqueFileName,
            fileSize: attachment.size || attachment.content.length,
            mimeType: attachment.contentType || 'application/octet-stream',
          }
        });
        savedAttachments.push({
          fileName: attachment.filename,
          filePath: uniqueFileName,
          mimeType: attachment.contentType || 'application/octet-stream',
        });
        console.log(`   ✅ Allegato salvato: ${attachment.filename}`);
      } catch (err) {
        console.error(`   ❌ Errore salvataggio allegato ${attachment.filename}:`, err);
      }
    }
  }

  // Aggiorna descrizione con link agli allegati
  if (savedAttachments.length > 0) {
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    const attachmentLines = savedAttachments.map(a => {
      const url = `${baseUrl}/uploads/${a.filePath}`;
      const isImage = a.mimeType.startsWith('image/');
      return isImage
        ? `![${a.fileName}](${url})`
        : `[${a.fileName}](${url})`;
    });
    const updatedDescription = cleanBody
      + '\n\n---\n**Allegati:**\n' + attachmentLines.join('\n');
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { description: updatedDescription },
    });
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

/**
 * Pulisce il corpo HTML dell'email per estrarre solo il testo leggibile.
 * Rimuove firme, quote, header di risposta e HTML tags.
 */
export function cleanEmailBodyForDescription(body: string): string {
  let cleaned = body;

  // Rimuovi style/script tags
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Converti <br> e block tags in newline
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/p>/gi, '\n');
  cleaned = cleaned.replace(/<\/div>/gi, '\n');
  cleaned = cleaned.replace(/<\/tr>/gi, '\n');
  cleaned = cleaned.replace(/<\/li>/gi, '\n');

  // Rimuovi tutti i tag HTML restanti
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&#\d+;/g, '');

  // Rimuovi righe con > (quote)
  cleaned = cleaned
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');

  const lines = cleaned.split('\n');

  // Taglia prima di header di risposta (Da:/From:/Inviato: etc.)
  let cutIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Separatori espliciti di inoltro/risposta
    if (/^-{2,}\s*(Messaggio inoltrato|Forwarded message|Original Message|Messaggio originale)\s*-{2,}/i.test(line)) {
      cutIndex = i; break;
    }
    // Riga di underscore (Outlook)
    if (/^_{10,}$/.test(line)) {
      cutIndex = i; break;
    }
    // Pattern "Il gg/mm/aaaa, nome ha scritto:" o "On ... wrote:"
    if (/^(Il\s+\d|On\s+.+wrote\s*:)/i.test(line)) {
      cutIndex = i; break;
    }
    // Blocco header di risposta: "Da:" o "From:" seguito da altri header
    if (i > 0 && /^(Da|From)\s*:\s+.+/i.test(line)) {
      let hasMoreHeaders = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (/^(Inviato|Sent|Date|A|To|Cc|CC|Oggetto|Subject)\s*:\s+/i.test(lines[j].trim())) {
          hasMoreHeaders = true; break;
        }
      }
      if (hasMoreHeaders) { cutIndex = i; break; }
    }
  }

  if (cutIndex > 0) {
    cleaned = lines.slice(0, cutIndex).join('\n');
  } else {
    cleaned = lines.join('\n');
  }

  // Rimuovi firme comuni
  const signaturePatterns = [
    /^--\s*$/m,
    /Sent from my (iPhone|iPad)/i,
    /Inviato da(l mio)? /i,
    /^Get Outlook for /im,
    /^Ottieni Outlook per /im,
  ];
  signaturePatterns.forEach(pattern => {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index);
    }
  });

  // Rileva firma: nome + titolo lavorativo + azienda + tel + email + indirizzo
  const sigLines = cleaned.split('\n');
  const contactPattern = /^(Tel\.?|Email|Phone|Fax|Mobile|Cell|Web|www\.|http|Registered|R\.I\.|R\.E\.A|C\.F\.|P\.\s*IVA|VAT)/i;
  const jobTitlePattern = /^(IT|HR|Sales|Marketing|Account|Project|Product|Business|Chief|Senior|Junior|Lead|Head|Director|Manager|Specialist|Consultant|Engineer|Developer|Analyst|Coordinator|Assistant|Administrator|Responsabile|Direttore|Tecnico|Commerciale|Amministratore|Addetto|Technical|Service|Support)\b/i;

  for (let i = 0; i < sigLines.length; i++) {
    const line = sigLines[i].trim();
    // Se troviamo un titolo lavorativo, tagliamo da nome (riga precedente) in poi
    if (jobTitlePattern.test(line) && line.length < 60) {
      if (i > 0) {
        const prevLine = sigLines[i - 1].trim();
        if (prevLine.length > 0 && prevLine.length < 50 && /^[A-Z][a-zà-ú]+(\s+[A-Z][a-zà-ú]+){0,3}$/.test(prevLine)) {
          cleaned = sigLines.slice(0, i - 1).join('\n');
          break;
        }
      }
      cleaned = sigLines.slice(0, i).join('\n');
      break;
    }
    // Se troviamo info di contatto (Tel, Email, www), tagliamo dalla riga prima
    if (contactPattern.test(line)) {
      // Cerca indietro fino al nome
      let nameIdx = i;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const pl = sigLines[j].trim();
        if (pl.length > 0 && pl.length < 60) { nameIdx = j; }
        else break;
      }
      cleaned = sigLines.slice(0, nameIdx).join('\n');
      break;
    }
  }

  // Rimuovi righe vuote multiple
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}
