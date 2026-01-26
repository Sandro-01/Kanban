import nodemailer from 'nodemailer';
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { prisma } from '../index';

// Configurazione email (da .env)
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'assistenza@europoligrafico.it',
    pass: process.env.EMAIL_PASSWORD || '',
  },
};

// Configurazione IMAP per ricevere email
const IMAP_CONFIG = {
  user: process.env.EMAIL_USER || 'assistenza@europoligrafico.it',
  password: process.env.EMAIL_PASSWORD || '',
  host: process.env.IMAP_HOST || 'imap.gmail.com',
  port: parseInt(process.env.IMAP_PORT || '993'),
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

// Transporter per invio email
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

/**
 * Invia email a contatti esterni per un ticket
 * L'oggetto include il ticket ID per tracking delle risposte
 * Supporta l'invio di allegati
 */
export const sendTicketEmail = async (
  ticketId: string,
  toEmails: string[],
  subject: string,
  body: string,
  fromUserId: string,
  attachmentIds?: string[] // IDs degli allegati da includere
) => {
  try {
    // Recupera ticket per thread ID e allegati
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        attachments: {
          where: {
            isDeleted: false,
            ...(attachmentIds && attachmentIds.length > 0
              ? { id: { in: attachmentIds } }
              : {}
            )
          }
        }
      },
    });

    if (!ticket) {
      throw new Error('Ticket non trovato');
    }

    // Genera email thread ID se non esiste
    let emailThreadId = ticket.emailThreadId;
    if (!emailThreadId) {
      emailThreadId = `ticket-${ticketId}@europoligrafico.it`;
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { emailThreadId },
      });
    }

    // Oggetto email include ticket ID per tracking
    const emailSubject = `[Ticket #${ticketId.slice(0, 8)}] ${subject}`;

    // Lista allegati in HTML
    let attachmentsHtml = '';
    if (ticket.attachments && ticket.attachments.length > 0) {
      attachmentsHtml = `
        <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 6px;">
          <strong>📎 Allegati (${ticket.attachments.length}):</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${ticket.attachments.map(att => `<li>${att.fileName}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Corpo email con footer
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Ticket #${ticketId.slice(0, 8)}</h2>
        </div>
        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            ${body}
          </div>
          ${attachmentsHtml}
          <div style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            <p><strong>💬 Per rispondere:</strong> Rispondi direttamente a questa email. La tua risposta verrà aggiunta automaticamente al ticket.</p>
            <p><strong>🔖 Riferimento Ticket:</strong> #${ticketId.slice(0, 8)}</p>
            <p style="margin-top: 15px; font-size: 11px;">Questo messaggio è stato inviato dal sistema Kanban ISO di Europoligrafico.</p>
          </div>
        </div>
      </div>
    `;

    // Prepara allegati per nodemailer
    const emailAttachments = ticket.attachments.map(att => ({
      filename: att.fileName,
      path: att.filePath
    }));

    // Invia email a tutti i destinatari con allegati
    const info = await transporter.sendMail({
      from: `"Europoligrafico - Assistenza" <${EMAIL_CONFIG.auth.user}>`,
      to: toEmails.join(', '),
      subject: emailSubject,
      html: emailBody,
      attachments: emailAttachments,
      headers: {
        'Message-ID': emailThreadId,
        'In-Reply-To': emailThreadId,
        References: emailThreadId,
      },
    });

    console.log(`✅ Email inviata per ticket ${ticketId} a: ${toEmails.join(', ')}`);
    if (emailAttachments.length > 0) {
      console.log(`   📎 Allegati inclusi: ${emailAttachments.length}`);
    }
    return info;
  } catch (error: any) {
    console.error('❌ Errore invio email:', error.message);
    throw error;
  }
};

/**
 * Controlla inbox per nuove email e le elabora
 * Questa funzione viene chiamata periodicamente (polling)
 */
export const checkInboxForReplies = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const imap = new Imap(IMAP_CONFIG);

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Cerca email non lette
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (results.length === 0) {
            console.log('📬 Nessuna nuova email');
            imap.end();
            resolve();
            return;
          }

          console.log(`📧 Trovate ${results.length} nuove email`);

          const fetch = imap.fetch(results, { bodies: '' });

          fetch.on('message', (msg, seqno) => {
            msg.on('body', (stream, info) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  console.error('Errore parsing email:', err);
                  return;
                }

                try {
                  await processIncomingEmail(parsed);
                  // Marca email come letta
                  imap.addFlags(seqno, ['\\Seen'], (err) => {
                    if (err) console.error('Errore marcatura email:', err);
                  });
                } catch (error) {
                  console.error('Errore elaborazione email:', error);
                }
              });
            });
          });

          fetch.once('error', (err) => {
            console.error('Fetch error:', err);
            reject(err);
          });

          fetch.once('end', () => {
            console.log('✅ Elaborazione email completata');
            imap.end();
            resolve();
          });
        });
      });
    });

    imap.once('error', (err) => {
      console.error('IMAP error:', err);
      reject(err);
    });

    imap.once('end', () => {
      console.log('🔌 Connessione IMAP chiusa');
    });

    imap.connect();
  });
};

/**
 * Elabora una email in arrivo e crea un commento sul ticket corrispondente
 * Include il download e salvataggio degli allegati
 */
async function processIncomingEmail(parsed: any) {
  const subject = parsed.subject || '';
  const from = parsed.from?.value?.[0]?.address || '';
  const text = parsed.text || '';
  const html = parsed.html || '';
  const messageId = parsed.messageId;
  const attachments = parsed.attachments || [];

  console.log(`\n📨 Elaborazione email da: ${from}`);
  console.log(`   Oggetto: ${subject}`);
  if (attachments.length > 0) {
    console.log(`   📎 Allegati: ${attachments.length}`);
  }

  // Estrai ticket ID dall'oggetto
  const ticketIdMatch = subject.match(/\[Ticket #([a-f0-9-]+)\]/i);
  if (!ticketIdMatch) {
    console.log('⚠️ Email ignorata: nessun ticket ID trovato nell\'oggetto');
    return;
  }

  // Cerca ticket con ID parziale
  const partialTicketId = ticketIdMatch[1];
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: {
        startsWith: partialTicketId,
      },
    },
    include: {
      createdBy: true,
    },
  });

  if (!ticket) {
    console.log(`⚠️ Ticket non trovato per ID: ${partialTicketId}`);
    return;
  }

  // Verifica se email già elaborata (evita duplicati)
  const existingComment = await prisma.comment.findFirst({
    where: {
      emailMessageId: messageId,
    },
  });

  if (existingComment) {
    console.log('⚠️ Email già elaborata (duplicato)');
    return;
  }

  // Pulisci il contenuto (rimuovi quote delle email precedenti)
  const cleanContent = cleanEmailContent(text || html);

  // Crea commento da email
  const comment = await prisma.comment.create({
    data: {
      ticketId: ticket.id,
      userId: ticket.createdById, // Assegnato al creatore del ticket
      content: `📧 **Risposta da ${from}:**\n\n${cleanContent}`,
      isEmailReply: true,
      fromEmail: from,
      emailMessageId: messageId,
    },
  });

  // Salva allegati se presenti
  if (attachments.length > 0) {
    const fs = await import('fs');
    const path = await import('path');

    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const attachment of attachments) {
      try {
        // Salta allegati inline (immagini embedded)
        if (attachment.contentDisposition === 'inline') {
          continue;
        }

        const fileName = attachment.filename || `attachment-${Date.now()}`;
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName}`;
        const filePath = path.join(uploadDir, uniqueFileName);

        // Salva file su disco
        fs.writeFileSync(filePath, attachment.content);

        // Crea record in database
        await prisma.attachment.create({
          data: {
            ticketId: ticket.id,
            commentId: comment.id,
            uploadedById: ticket.createdById,
            fileName: fileName,
            filePath: filePath,
            fileSize: attachment.size || attachment.content.length,
            mimeType: attachment.contentType || 'application/octet-stream',
          },
        });

        console.log(`   ✅ Allegato salvato: ${fileName}`);
      } catch (error) {
        console.error(`   ❌ Errore salvataggio allegato ${attachment.filename}:`, error);
      }
    }
  }

  // Aggiorna il ticket (updated timestamp)
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { updatedAt: new Date() },
  });

  // Aggiungi mittente ai contatti esterni se non già presente
  if (!ticket.externalContacts.includes(from)) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        externalContacts: {
          push: from,
        },
      },
    });
  }

  console.log(`✅ Commento creato per ticket ${ticket.id} da email ${from}`);
}

/**
 * Pulisce il contenuto email rimuovendo quote e firme
 */
function cleanEmailContent(content: string): string {
  // Rimuovi HTML tags se presente
  let cleaned = content.replace(/<[^>]*>/g, '');

  // Rimuovi righe che iniziano con > (quote)
  cleaned = cleaned
    .split('\n')
    .filter((line) => !line.trim().startsWith('>'))
    .join('\n');

  // Rimuovi firme comuni
  const signaturePatterns = [
    /--\s*$/m,
    /Sent from my iPhone/i,
    /Inviato da /i,
    /________________________________/,
  ];

  signaturePatterns.forEach((pattern) => {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = cleaned.substring(0, match.index);
    }
  });

  return cleaned.trim();
}

/**
 * Avvia il polling automatico della casella email
 * Controlla ogni X minuti
 */
export const startEmailPolling = (intervalMinutes: number = 2) => {
  console.log(
    `🚀 Polling email avviato: controllo ogni ${intervalMinutes} minuti`
  );

  // Controlla subito
  checkInboxForReplies().catch((err) =>
    console.error('Errore primo controllo email:', err)
  );

  // Poi controlla periodicamente
  setInterval(() => {
    checkInboxForReplies().catch((err) =>
      console.error('Errore polling email:', err)
    );
  }, intervalMinutes * 60 * 1000);
};
