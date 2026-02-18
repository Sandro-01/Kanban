import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

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
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
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

  // Crea ticket
  const emailThreadId = `ticket-${Date.now()}@europoligrafico.it`;
  const ticketData: any = {
    title: subject,
    description: body,
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
        console.log(`   ✅ Allegato salvato: ${attachment.filename}`);
      } catch (err) {
        console.error(`   ❌ Errore salvataggio allegato ${attachment.filename}:`, err);
      }
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
    const priorityColors: Record<string, string> = { CRITICAL: '#dc2626', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#22c55e' };
    const pColor = priorityColors[priority] || '#3b82f6';

    await sendEmail(
      from,
      `[Ticket #${ticket.id.substring(0, 8)}] Re: ${subject}`,
      `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 24px 28px;">
            <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">Europoligrafico — Assistenza</p>
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Richiesta ricevuta</h2>
          </div>
          <div style="padding: 28px; background: #ffffff;">
            <p style="margin: 0 0 20px; font-size: 15px; color: #334155; line-height: 1.5;">
              La tua richiesta è stata presa in carico. Di seguito i dettagli:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 120px;">Ticket</td>
                <td style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; font-family: 'Courier New', monospace; color: #1e293b;">#${ticket.id.substring(0, 8)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Oggetto</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">${subject}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Priorità</td>
                <td style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px;"><span style="display: inline-block; padding: 2px 10px; border-radius: 12px; background: ${pColor}20; color: ${pColor}; font-weight: 600; font-size: 12px;">${priority}</span></td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">SLA</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">${slaHours} ore</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; background: #f8fafc; font-size: 13px; color: #64748b;">Scadenza</td>
                <td style="padding: 10px 14px; background: #f8fafc; font-size: 13px; color: #1e293b;">${ticket.dueDate.toLocaleString('it-IT')}</td>
              </tr>
            </table>
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #1e40af;">
                <strong>Rispondi a questa email</strong> per aggiungere aggiornamenti al ticket.
              </p>
            </div>
          </div>
          <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">Europoligrafico — Sistema Kanban ISO</p>
          </div>
        </div>
      `,
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
  fileAttachments?: { fileName: string; filePath: string; mimeType: string }[]
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
    'Nuovo commento': '#3b82f6',
    'Nuovo allegato': '#8b5cf6',
    'Assegnazione': '#f59e0b',
  };
  const accentColor = typeColors[updateType] || '#3b82f6';

  // Icone per tipo
  const typeIcons: Record<string, string> = {
    'Nuovo commento': '💬',
    'Nuovo allegato': '📎',
    'Assegnazione': '👤',
  };
  const icon = typeIcons[updateType] || '📋';

  // Lista file allegati nell'email
  let attachmentsListHtml = '';
  if (fileAttachments && fileAttachments.length > 0) {
    attachmentsListHtml = `
      <div style="margin-top: 16px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #475569;">📎 Allegati (${fileAttachments.length}):</p>
        ${fileAttachments.map(a => `<p style="margin: 4px 0; font-size: 13px; color: #334155;">&bull; ${a.fileName}</p>`).join('')}
      </div>
    `;
  }

  // Usa [Ticket #ID] nell'oggetto così le risposte vengono tracciate
  const subject = `[Ticket #${ticket.id.substring(0, 8)}] ${ticket.title} - ${updateType}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e40af, ${accentColor}); color: white; padding: 24px 28px;">
        <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">Ticket #${ticket.id.substring(0, 8)}</p>
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">${icon} ${updateType}</h2>
      </div>
      <div style="padding: 28px; background: #ffffff;">
        <p style="margin: 0 0 6px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Oggetto ticket</p>
        <p style="margin: 0 0 20px; font-size: 15px; color: #1e293b; font-weight: 600;">${ticket.title}</p>
        <div style="background: #f8fafc; padding: 16px 18px; border-radius: 8px; border-left: 4px solid ${accentColor}; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${details}</p>
        </div>
        ${attachmentsListHtml}
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 20px;">
          <p style="margin: 0; font-size: 13px; color: #1e40af;">
            <strong>Rispondi a questa email</strong> per aggiungere un commento al ticket.
          </p>
        </div>
      </div>
      <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">Europoligrafico — Sistema Kanban ISO</p>
      </div>
    </div>
  `;

  for (const email of recipientSet) {
    try {
      await sendEmail(email, subject, html, ticketId, fileAttachments);
    } catch (err: any) {
      console.error(`⚠️ Notifica non inviata a ${email}: ${err.message}`);
    }
  }
}
