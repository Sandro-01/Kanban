import nodemailer from 'nodemailer';
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { prisma } from '../index';
import { createTicketFromEmail } from './email.service';
import { getSmtpConfig, getImapConfig, getCompanyName } from './config.service';
import { isGraphConfigured, sendEmailViaGraph } from './graphEmail.service';
import { buildEmailHtml, messageBlock, attachmentsList, callToAction } from '../utils/emailTemplate';

// Fallback config statica (usata solo come default se DB non disponibile)
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
};

// Crea transporter SMTP dinamicamente dalla config DB
async function getTransporter() {
  const smtp = await getSmtpConfig();
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.password },
  });
}

// Crea config IMAP dinamicamente dalla config DB
async function getImapConfigDynamic() {
  const imap = await getImapConfig();
  return {
    user: imap.user,
    password: imap.password,
    host: imap.host,
    port: imap.port,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  };
}

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
      const smtpCfg = await getSmtpConfig();
      const emailDomain = smtpCfg.from.includes('@') ? smtpCfg.from.split('@')[1] : 'kanban.local';
      emailThreadId = `ticket-${ticketId}@${emailDomain}`;
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { emailThreadId },
      });
    }

    // Oggetto email include ticket ID per tracking
    const emailSubject = `[Ticket #${ticketId.slice(0, 8)}] ${subject}`;

    // Costruisci email con template professionale
    const companyName = await getCompanyName();
    const attachFileNames = ticket.attachments?.map((a: any) => a.fileName) || [];

    const bodyHtml = [
      messageBlock(body),
      attachmentsList(attachFileNames),
      callToAction('<strong>Rispondi a questa email</strong> per aggiungere un commento al ticket.'),
    ].join('');

    const emailBody = buildEmailHtml({
      companyName,
      heading: subject,
      subheading: `Ticket #${ticketId.slice(0, 8)}`,
      body: bodyHtml,
      footerRef: `Ref: #${ticketId.slice(0, 8)}`,
    });

    // Invia email: usa Graph API se configurato, altrimenti SMTP
    let info: any;
    if (isGraphConfigured()) {
      // Via Microsoft Graph API
      const fs = await import('fs');
      const pathModule = await import('path');
      const uploadDir = pathModule.join(__dirname, '../../../uploads');

      let graphAttachments: { name: string; contentBytes: string; contentType: string }[] | undefined;
      if (ticket.attachments && ticket.attachments.length > 0) {
        graphAttachments = ticket.attachments.map(att => {
          const fullPath = pathModule.join(uploadDir, att.filePath);
          const content = fs.readFileSync(fullPath);
          return {
            name: att.fileName,
            contentBytes: content.toString('base64'),
            contentType: att.mimeType || 'application/octet-stream',
          };
        });
      }

      await sendEmailViaGraph(toEmails, emailSubject, emailBody, graphAttachments);
      info = { messageId: emailThreadId };
    } else {
      // Via SMTP
      const emailAttachments = ticket.attachments.map(att => ({
        filename: att.fileName,
        path: att.filePath
      }));

      const fromUser = await prisma.user.findUnique({
        where: { id: fromUserId },
        select: { firstName: true, lastName: true, email: true },
      });
      const senderName = fromUser
        ? `${fromUser.firstName} ${fromUser.lastName}`
        : companyName;
      const smtp = await getSmtpConfig();
      const systemEmail = smtp.from;
      const transport = await getTransporter();

      info = await transport.sendMail({
        from: `"${senderName} - ${companyName}" <${systemEmail}>`,
        replyTo: fromUser?.email || systemEmail,
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
    }

    console.log(`✅ Email inviata per ticket ${ticketId} a: ${toEmails.join(', ')}`);
    if (ticket.attachments && ticket.attachments.length > 0) {
      console.log(`   📎 Allegati inclusi: ${ticket.attachments.length}`);
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
  const imapCfg = await getImapConfigDynamic();
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapCfg);

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err: Error, box: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Cerca email non lette
        imap.search(['UNSEEN'], (err: Error, results: any) => {
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

          fetch.on('message', (msg: any, seqno: any) => {
            msg.on('body', (stream: any, info: any) => {
              simpleParser(stream as any, async (err: any, parsed: any) => {
                if (err) {
                  console.error('Errore parsing email:', err);
                  return;
                }

                try {
                  await processIncomingEmail(parsed);
                  // Marca email come letta
                  imap.addFlags(seqno, ['\\Seen'], (err: any) => {
                    if (err) console.error('Errore marcatura email:', err);
                  });
                } catch (error) {
                  console.error('Errore elaborazione email:', error);
                }
              });
            });
          });

          fetch.once('error', (err: any) => {
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

    imap.once('error', (err: any) => {
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

  // Ignora le email inviate dal sistema stesso (notifiche proprie)
  const smtpCfg = await getSmtpConfig();
  const ownMailbox = smtpCfg.from.toLowerCase();
  if (from.toLowerCase() === ownMailbox) {
    console.log('⏭️ Email inviata dal sistema stesso, ignorata');
    return;
  }

  // Estrai ticket ID dall'oggetto
  const ticketIdMatch = subject.match(/\[Ticket #([a-f0-9-]+)\]/i);
  if (!ticketIdMatch) {
    // Nuova email senza riferimento a ticket esistente → crea nuovo ticket
    console.log('🆕 Nuova email senza ticket ID → creazione nuovo ticket');
    try {
      const emailAttachments = attachments.map((att: any) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        size: att.size,
      }));
      const ticket = await createTicketFromEmail(from, subject, text || html, emailAttachments, messageId);
      console.log(`✅ Nuovo ticket creato da email: ${ticket.id} - "${subject}"`);
    } catch (error) {
      console.error('❌ Errore creazione ticket da email:', error);
    }
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
      content: cleanContent,
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
        // Genera nome file per allegati inline senza nome (screenshot)
        const fileName = attachment.filename || `screenshot-${Date.now()}.${(attachment.contentType || 'image/png').split('/')[1] || 'png'}`;
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
            filePath: uniqueFileName,
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
  let cleaned = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/p>/gi, '\n');
  cleaned = cleaned.replace(/<\/div>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#\d+;/g, '');

  // Rimuovi righe con > (quote)
  cleaned = cleaned
    .split('\n')
    .filter((line) => !line.trim().startsWith('>'))
    .join('\n');

  const lines = cleaned.split('\n');

  // Trova dove inizia il messaggio originale quotato e taglia PRIMA
  let cutIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Separatori espliciti
    if (/^-{2,}\s*(Messaggio inoltrato|Forwarded message|Original Message|Messaggio originale)\s*-{2,}/i.test(line)) {
      cutIndex = i;
      break;
    }

    // Riga di underscore (Outlook)
    if (/^_{10,}$/.test(line)) {
      cutIndex = i;
      break;
    }

    // Pattern "Il gg/mm/aaaa, nome ha scritto:" o "On ... wrote:"
    if (/^(Il\s+\d|On\s+.+wrote\s*:)/i.test(line)) {
      cutIndex = i;
      break;
    }

    // Blocco header di risposta: "Da:" o "From:" seguito da altri header
    if (i > 0 && /^(Da|From)\s*:\s+.+/i.test(line)) {
      let hasMoreHeaders = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (/^(Inviato|Sent|Date|A|To|Cc|CC|Oggetto|Subject)\s*:\s+/i.test(lines[j].trim())) {
          hasMoreHeaders = true;
          break;
        }
      }
      if (hasMoreHeaders) {
        cutIndex = i;
        break;
      }
    }
  }

  if (cutIndex > 0) {
    cleaned = lines.slice(0, cutIndex).join('\n');
  } else {
    cleaned = lines.join('\n');
  }

  // Taglia se appare il testo del template notifica del sistema
  const notificationPatterns = [
    /Ticket #[a-f0-9].*Nuovo commento/i,
    /Ticket #[a-f0-9].*Nuovo allegato/i,
    /^Oggetto ticket$/i,
    /Rispondi a questa email per aggiungere/i,
    /Sistema Kanban/i,
  ];
  const cleanedLines2 = cleaned.split('\n');
  for (let i = 0; i < cleanedLines2.length; i++) {
    const line = cleanedLines2[i].trim();
    if (notificationPatterns.some(p => p.test(line))) {
      cleaned = cleanedLines2.slice(0, i).join('\n');
      break;
    }
  }

  // Rimuovi firme comuni
  const signaturePatterns = [
    /^--\s*$/m,
    /Sent from my (iPhone|iPad)/i,
    /Inviato da(l mio)? /i,
    /^Get Outlook for /im,
    /^Ottieni Outlook per /im,
  ];

  signaturePatterns.forEach((pattern) => {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index);
    }
  });

  // Rileva firma nome + titolo lavorativo alla fine
  const jobTitlePattern = /^(IT|HR|Sales|Marketing|Account|Project|Product|Business|Chief|Senior|Junior|Lead|Head|Director|Manager|Specialist|Consultant|Engineer|Developer|Analyst|Coordinator|Assistant|Administrator|Responsabile|Direttore|Tecnico|Commerciale|Amministratore|Addetto)\b/i;
  const sigLines = cleaned.split('\n');
  for (let i = 0; i < sigLines.length; i++) {
    const line = sigLines[i].trim();
    if (jobTitlePattern.test(line) && line.length < 50) {
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
  }

  // Rimuovi righe vuote multiple
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

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
