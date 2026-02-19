import { prisma } from '../index';
import { createTicketFromEmail } from './email.service';
import { generateEmailPdf } from '../utils/emailPdf';

/**
 * Microsoft Graph API - Email Integration
 *
 * Usa Microsoft Graph REST API per leggere email dalla casella condivisa.
 * Richiede un'app registrata in Azure AD con permessi Application:
 *   - Mail.Read (per leggere email dalla casella condivisa)
 *   - Mail.ReadWrite (per marcare come lette)
 *   - Mail.Send (per inviare email come casella condivisa)
 *
 * Configurazione .env:
 *   AZURE_TENANT_ID=<tenant-id>
 *   AZURE_CLIENT_ID=<client-id>
 *   AZURE_CLIENT_SECRET=<client-secret>
 *   GRAPH_SHARED_MAILBOX=assistenza@azienda.it
 */

const GRAPH_CONFIG = {
  tenantId: process.env.AZURE_TENANT_ID || '',
  clientId: process.env.AZURE_CLIENT_ID || '',
  clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  sharedMailbox: process.env.GRAPH_SHARED_MAILBOX || process.env.EMAIL_FROM || '',
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * Ottiene un token OAuth2 via Client Credentials flow (application-level)
 */
async function getAccessToken(): Promise<string> {
  // Usa token in cache se non scaduto (con 5 min di margine)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${GRAPH_CONFIG.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: GRAPH_CONFIG.clientId,
    client_secret: GRAPH_CONFIG.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token request failed (${response.status}): ${error}`);
  }

  const data = await response.json() as any;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.log('🔑 Token Microsoft Graph ottenuto');
  return data.access_token;
}

/**
 * Chiamata generica a Microsoft Graph API
 */
async function graphRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph API error (${response.status}): ${error}`);
  }

  // PATCH/DELETE may return 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

/**
 * Legge le email NON LETTE dalla casella condivisa
 * Filtra per isRead=false per evitare rielaborazione di email già processate
 */
async function getRecentEmails(): Promise<any[]> {
  const mailbox = GRAPH_CONFIG.sharedMailbox;
  const endpoint = `/users/${mailbox}/mailFolders/inbox/messages?$filter=isRead eq false&$top=50&$select=id,subject,from,body,receivedDateTime,hasAttachments,internetMessageId,toRecipients,ccRecipients&$orderby=receivedDateTime asc`;

  const data = await graphRequest(endpoint);
  return data.value || [];
}

/**
 * Scarica gli allegati di un messaggio
 */
async function getEmailAttachments(messageId: string): Promise<any[]> {
  const mailbox = GRAPH_CONFIG.sharedMailbox;
  const endpoint = `/users/${mailbox}/messages/${messageId}/attachments`;

  const data = await graphRequest(endpoint);
  return (data.value || []).filter((att: any) => att['@odata.type'] === '#microsoft.graph.fileAttachment');
}

/**
 * Marca un messaggio come letto
 */
async function markAsRead(messageId: string): Promise<void> {
  const mailbox = GRAPH_CONFIG.sharedMailbox;
  await graphRequest(`/users/${mailbox}/messages/${messageId}`, 'PATCH', { isRead: true });
}

/**
 * Invia email dalla casella condivisa via Graph API
 */
export async function sendEmailViaGraph(
  to: string[],
  subject: string,
  htmlBody: string,
  attachments?: { name: string; contentBytes: string; contentType: string }[]
): Promise<void> {
  const mailbox = GRAPH_CONFIG.sharedMailbox;

  const message: any = {
    message: {
      subject,
      body: { contentType: 'HTML', content: htmlBody },
      toRecipients: to.map(email => ({ emailAddress: { address: email } })),
    },
    saveToSentItems: true,
  };

  if (attachments && attachments.length > 0) {
    message.message.attachments = attachments.map(att => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.name,
      contentBytes: att.contentBytes,
      contentType: att.contentType,
    }));
  }

  await graphRequest(`/users/${mailbox}/sendMail`, 'POST', message);
  console.log(`✅ Email inviata via Graph a: ${to.join(', ')}`);
}

/**
 * Elabora un singolo messaggio email
 */
async function processGraphEmail(message: any): Promise<void> {
  const subject = message.subject || '';
  const from = message.from?.emailAddress?.address || '';
  const body = message.body?.content || '';
  const messageId = message.internetMessageId || message.id;

  console.log(`\n📨 Elaborazione email da: ${from}`);
  console.log(`   Oggetto: ${subject}`);

  // Ignora le email inviate dal sistema stesso (notifiche proprie)
  const ownMailbox = GRAPH_CONFIG.sharedMailbox.toLowerCase();
  if (from.toLowerCase() === ownMailbox) {
    console.log('⏭️ Email inviata dal sistema stesso, ignorata');
    return;
  }

  // Controlla se è una risposta a un ticket esistente
  const ticketIdMatch = subject.match(/\[Ticket #([a-f0-9-]+)\]/i);

  if (ticketIdMatch) {
    // RISPOSTA a ticket esistente → crea commento
    const partialTicketId = ticketIdMatch[1];
    const ticket = await prisma.ticket.findFirst({
      where: { id: { startsWith: partialTicketId } },
      include: { createdBy: true },
    });

    if (!ticket) {
      console.log(`⚠️ Ticket non trovato per ID: ${partialTicketId}`);
      return;
    }

    // Controlla duplicato
    const existing = await prisma.comment.findFirst({ where: { emailMessageId: messageId } });
    if (existing) {
      console.log('⚠️ Email già elaborata (duplicato)');
      return;
    }

    const cleanContent = cleanEmailContent(body);

    const comment = await prisma.comment.create({
      data: {
        ticketId: ticket.id,
        userId: ticket.createdById,
        content: cleanContent,
        isEmailReply: true,
        fromEmail: from,
        emailMessageId: messageId,
      },
    });

    // Salva allegati (incluse immagini inline/screenshot)
    // hasAttachments potrebbe essere false per immagini solo inline, controlliamo sempre
    try {
      await saveGraphAttachments(message.id, ticket.id, comment.id, ticket.createdById);
    } catch (e) {
      // Non fallire se non ci sono allegati
    }

    // Aggiorna ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });

    // Aggiungi ai contatti esterni
    if (!ticket.externalContacts.includes(from)) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { externalContacts: { push: from } },
      });
    }

    console.log(`✅ Commento creato per ticket ${ticket.id} da email ${from}`);
  } else {
    // NUOVA email → crea ticket
    console.log('🆕 Nuova email → creazione ticket');
    try {
      // Scarica allegati (incluse immagini inline/screenshot)
      let emailAttachments: any[] = [];
      try {
        const graphAttachments = await getEmailAttachments(message.id);
        emailAttachments = graphAttachments.map((att: any) => ({
          filename: att.name || `screenshot-${Date.now()}.${(att.contentType || 'image/png').split('/')[1] || 'png'}`,
          content: Buffer.from(att.contentBytes, 'base64'),
          contentType: att.contentType,
          size: att.size,
        }));
      } catch (e) {
        // Nessun allegato
      }

      // Descrizione breve + pulita per il ticket
      const cleanBody = cleanEmailContent(body);
      const cleanSubject = cleanEmailSubject(subject);

      // Descrizione corta: solo il corpo pulito (max 500 char) + nota PDF
      const shortDescription = cleanBody.length > 500
        ? cleanBody.substring(0, 500) + '...'
        : cleanBody;
      const description = shortDescription
        ? `${shortDescription}\n\n📎 Email originale completa in allegato (PDF)`
        : `Email ricevuta da ${from}\n\n📎 Email originale completa in allegato (PDF)`;

      const ticket = await createTicketFromEmail(from, cleanSubject, description, emailAttachments, messageId);

      // Genera PDF con email completa e allegalo al ticket
      try {
        const receivedDate = message.receivedDateTime
          ? new Date(message.receivedDateTime).toLocaleString('it-IT')
          : undefined;

        // Estrai destinatari per il PDF
        const toRecipients = (message.toRecipients || [])
          .map((r: any) => r.emailAddress?.address || '').filter(Boolean).join(', ');
        const ccRecipients = (message.ccRecipients || [])
          .map((r: any) => r.emailAddress?.address || '').filter(Boolean).join(', ');

        const pdfResult = await generateEmailPdf({
          from,
          to: toRecipients || undefined,
          cc: ccRecipients || undefined,
          date: receivedDate,
          subject: cleanSubject,
          body,
        }, ticket.id);

        await prisma.attachment.create({
          data: {
            ticketId: ticket.id,
            uploadedById: ticket.createdById,
            fileName: pdfResult.fileName,
            filePath: pdfResult.filePath,
            fileSize: pdfResult.fileSize,
            mimeType: 'application/pdf',
          },
        });
        console.log(`   📄 PDF email originale allegato al ticket`);
      } catch (pdfError: any) {
        console.error(`   ⚠️ Errore generazione PDF (non bloccante): ${pdfError.message}`);
      }

      console.log(`✅ Nuovo ticket creato da email: ${ticket.id} - "${cleanSubject}"`);
    } catch (error) {
      console.error('❌ Errore creazione ticket da email:', error);
    }
  }
}

/**
 * Salva allegati da Graph API su disco
 */
async function saveGraphAttachments(
  graphMessageId: string,
  ticketId: string,
  commentId: string,
  uploadedById: string
): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  const attachments = await getEmailAttachments(graphMessageId);
  const uploadDir = path.join(__dirname, '../../../uploads');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  for (const att of attachments) {
    try {
      const fileName = att.name || `attachment-${Date.now()}`;
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      const buffer = Buffer.from(att.contentBytes, 'base64');
      fs.writeFileSync(filePath, buffer);

      await prisma.attachment.create({
        data: {
          ticketId,
          commentId,
          uploadedById,
          fileName,
          filePath: uniqueFileName,
          fileSize: att.size || buffer.length,
          mimeType: att.contentType || 'application/octet-stream',
        },
      });

      console.log(`   ✅ Allegato salvato: ${fileName}`);
    } catch (error) {
      console.error(`   ❌ Errore salvataggio allegato ${att.name}:`, error);
    }
  }
}

/**
 * Pulisce il contenuto HTML dell'email rimuovendo rumore (firme, header inoltro, quote)
 * Struttura email inoltrata Outlook:
 *   [Firma mittente]  ← RIMUOVERE
 *   Da: ... / Inviato: ... / A: ... / Oggetto: ...  ← SALTARE
 *   [Corpo email originale]  ← TENERE
 *   [Firma autore originale + disclaimer]  ← RIMUOVERE
 */
function cleanEmailContent(content: string): string {
  // Rimuovi blocchi di stile e script
  let cleaned = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Converti tag HTML in newline
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
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');

  const lines = cleaned.split('\n');

  // Trova dove inizia il messaggio originale quotato e taglia PRIMA
  // (la risposta dell'utente è in cima, il messaggio originale è in basso)
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

    // Blocco header di risposta: "Da:" o "From:" seguito da almeno un altro header
    // (cerchiamo Da/From con posizione > 0 per non tagliare se è la prima riga)
    if (i > 0 && /^(Da|From)\s*:\s+.+/i.test(line)) {
      // Verifica che le righe successive contengano altri header tipici
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
    // Prendi solo il contenuto PRIMA del messaggio quotato (la risposta dell'utente)
    cleaned = lines.slice(0, cutIndex).join('\n');
  } else {
    cleaned = lines.join('\n');
  }

  // Taglia se appare il testo del template notifica del sistema
  // Pattern specifici per evitare falsi positivi con testo utente
  const notificationPatterns = [
    /Ticket #[a-f0-9].*Nuovo commento/i,        // "Ticket #xxx 💬 Nuovo commento"
    /Ticket #[a-f0-9].*Nuovo allegato/i,         // "Ticket #xxx 📎 Nuovo allegato"
    /^Oggetto ticket$/i,                          // Intestazione template
    /Rispondi a questa email per aggiungere/i,    // Footer template esatto
    /Sistema Kanban/i,                             // Footer template
  ];
  const cleanedLines = cleaned.split('\n');
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i].trim();
    if (notificationPatterns.some(p => p.test(line))) {
      cleaned = cleanedLines.slice(0, i).join('\n');
      break;
    }
  }

  // Rimuovi firme e disclaimer dal contenuto rimanente
  cleaned = removeSignature(cleaned);

  // Rimuovi righe vuote multiple
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Rimuove firme email, disclaimer legali e business card dal testo
 */
function removeSignature(text: string): string {
  let cleaned = text;

  // Rimuovi firme testuali comuni (tronca da quel punto)
  const signatureCutPatterns = [
    /^--\s*$/m,
    /Sent from my (iPhone|iPad)/i,
    /Inviato da(l mio)? /i,
    /_{10,}/,                         // ________________________________
    /^Get Outlook for /im,
    /^Ottieni Outlook per /im,
    /^Diese E-Mail enthält/im,        // Disclaimer tedesco
    /^This e-mail may contain/im,     // Disclaimer inglese
    /^Handelsregister /im,            // Info aziendali tedesche
  ];

  for (const pattern of signatureCutPatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index);
    }
  }

  // Rimuovi greetings finali + firma nome (es. "Grazie mille...\nStephan Fleschutz")
  const greetingPatterns = [
    /^(Grazie mille|Grazie|Saluti|Cordiali saluti|Distinti saluti|Best regards|Kind regards|Regards|Mit freundlichen Grüßen|Vielen Dank|Danke)[\s\S]*$/im,
  ];

  for (const pattern of greetingPatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index);
    }
  }

  // Rimuovi blocchi firma business (telefono, URL, "Follow us", ruolo/titolo)
  const lines = cleaned.split('\n');
  let sigStart = -1;

  // Pattern per titoli/ruoli lavorativi comuni
  const jobTitlePattern = /^(IT|HR|Sales|Marketing|Account|Project|Product|Business|Chief|Senior|Junior|Lead|Head|Director|Manager|Specialist|Consultant|Engineer|Developer|Analyst|Coordinator|Assistant|Administrator|Responsabile|Direttore|Tecnico|Commerciale|Amministratore|Addetto)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^(M|T|Tel|Cell|Phone|Fax|Mob|Telefon)[\s.:]+\+?\d/i.test(line) || /^\+\d{2,3}\s?\d/.test(line)) {
      sigStart = i;
      for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
        const prev = lines[j].trim();
        if (prev.length > 0 && prev.length < 60 && !/[.!?]$/.test(prev)) {
          sigStart = j;
        } else break;
      }
      break;
    }
    if (/^(www\.|http[s]?:\/\/|__www\.)/i.test(line)) {
      sigStart = i;
      for (let j = i - 1; j >= 0 && j >= i - 4; j--) {
        const prev = lines[j].trim();
        if (prev.length > 0 && prev.length < 60 && !/[.!?]$/.test(prev)) {
          sigStart = j;
        } else break;
      }
      break;
    }
    if (/^Follow us/i.test(line)) {
      sigStart = i;
      break;
    }
    // Rileva riga con titolo lavorativo (es. "IT Specialist", "Sales Manager")
    if (jobTitlePattern.test(line) && line.length < 50) {
      // Se la riga precedente sembra un nome (2-3 parole, tutte con maiuscola iniziale)
      if (i > 0) {
        const prevLine = lines[i - 1].trim();
        if (prevLine.length > 0 && prevLine.length < 50 && /^[A-Z][a-zà-ú]+(\s+[A-Z][a-zà-ú]+){0,3}$/.test(prevLine)) {
          sigStart = i - 1;
          break;
        }
      }
      sigStart = i;
      break;
    }
  }

  if (sigStart > 0) {
    cleaned = lines.slice(0, sigStart).join('\n');
  }

  return cleaned;
}

/**
 * Pulisce l'oggetto email rimuovendo prefissi di inoltro/risposta
 */
function cleanEmailSubject(subject: string): string {
  // Rimuovi prefissi ripetuti: I:, FW:, Fwd:, Re:, R:, RE:
  return subject.replace(/^(I:|FW:|Fwd:|Re:|R:|RE:)\s*/gi, '').trim();
}

/**
 * Verifica se un'email è già stata elaborata (controlla sia ticket che commenti)
 */
async function isEmailAlreadyProcessed(messageId: string): Promise<boolean> {
  if (!messageId) return false;

  // Controlla duplicati nei ticket (usa raw query per compatibilità pre-migrazione)
  try {
    const existingTicket: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT id FROM "Ticket" WHERE "emailMessageId" = $1 LIMIT 1`,
      messageId
    );
    if (existingTicket.length > 0) return true;
  } catch {
    // Campo emailMessageId non ancora presente nel DB, skip check ticket
  }

  // Controlla duplicati nei commenti
  const existingComment = await prisma.comment.findFirst({
    where: { emailMessageId: messageId },
    select: { id: true },
  });
  if (existingComment) return true;

  return false;
}

/**
 * Controlla la casella condivisa per nuove email (polling via Graph API)
 */
export async function checkInboxViaGraph(): Promise<void> {
  try {
    const emails = await getRecentEmails();

    if (emails.length === 0) {
      console.log('📬 Nessuna nuova email');
      return;
    }

    // Filtra email già elaborate
    let newCount = 0;
    for (const email of emails) {
      const messageId = email.internetMessageId || email.id;
      const alreadyProcessed = await isEmailAlreadyProcessed(messageId);

      if (alreadyProcessed) {
        continue;
      }

      newCount++;
      try {
        await processGraphEmail(email);
        await markAsRead(email.id);
      } catch (error) {
        console.error(`❌ Errore elaborazione email "${email.subject}":`, error);
      }
    }

    if (newCount === 0) {
      console.log('📬 Nessuna nuova email');
    } else {
      console.log(`✅ Elaborate ${newCount} nuove email`);
    }
  } catch (error: any) {
    console.error('❌ Errore polling Graph API:', error.message);
  }
}

/**
 * Avvia il polling automatico via Microsoft Graph API
 */
export function startGraphEmailPolling(intervalSeconds: number = 30): void {
  console.log(`🚀 Polling email via Microsoft Graph avviato: ogni ${intervalSeconds} secondi`);
  console.log(`   📬 Casella: ${GRAPH_CONFIG.sharedMailbox}`);

  // Controlla subito
  checkInboxViaGraph().catch(err =>
    console.error('Errore primo controllo email Graph:', err.message)
  );

  // Poi periodicamente
  setInterval(() => {
    checkInboxViaGraph().catch(err =>
      console.error('Errore polling email Graph:', err.message)
    );
  }, intervalSeconds * 1000);
}

/**
 * Verifica che la configurazione Azure AD sia presente
 */
export function isGraphConfigured(): boolean {
  return !!(GRAPH_CONFIG.tenantId && GRAPH_CONFIG.clientId && GRAPH_CONFIG.clientSecret);
}

/**
 * Testa la connessione a Microsoft Graph API
 * Verifica le credenziali Azure AD e l'accesso alla casella condivisa
 */
export async function testGraphConnection(): Promise<{ mailbox: string }> {
  const token = await getAccessToken();
  const mailbox = GRAPH_CONFIG.sharedMailbox;
  const url = `https://graph.microsoft.com/v1.0/users/${mailbox}/mailFolders/inbox`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph API error (${response.status}): ${error}`);
  }
  return { mailbox };
}
