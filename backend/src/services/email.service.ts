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

/**
 * Crea ticket da email
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
      emailThreadId,
      externalContacts: [from],
    }
  });

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
            filePath,
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

  // Invia conferma con [Ticket #ID] per tracciamento risposte
  await sendEmail(
    from,
    `[Ticket #${ticket.id.substring(0, 8)}] Re: ${subject}`,
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Ticket #${ticket.id.substring(0, 8)} creato</h2>
        </div>
        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <p>Il tuo ticket è stato registrato nel sistema.</p>
          <ul>
            <li><strong>ID:</strong> #${ticket.id.substring(0, 8)}</li>
            <li><strong>Titolo:</strong> ${subject}</li>
            <li><strong>Priorità:</strong> ${priority}</li>
            <li><strong>SLA:</strong> ${slaHours} ore</li>
            <li><strong>Scadenza:</strong> ${ticket.dueDate.toLocaleString('it-IT')}</li>
          </ul>
          <div style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            <p><strong>💬 Per rispondere:</strong> Rispondi direttamente a questa email. La tua risposta verrà aggiunta automaticamente al ticket.</p>
            <p style="margin-top: 15px; font-size: 11px;">Questo messaggio è stato inviato dal sistema Kanban ISO di Europoligrafico.</p>
          </div>
        </div>
      </div>
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
