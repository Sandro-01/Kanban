import { prisma } from '../index';
import { v4 as uuidv4 } from 'uuid';

type NotificationType = 'COMMENT' | 'ASSIGNMENT' | 'STATUS_CHANGE' | 'SLA_ALERT' | 'EMAIL' | 'AI_SUGGESTION';

/**
 * Crea una notifica per un utente
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  ticketId?: string
): Promise<void> {
  try {
    const id = uuidv4();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Notification" ("id", "userId", "type", "title", "message", "ticketId", "read", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
      id, userId, type, title, message, ticketId || null
    );
    console.log(`🔔 Notification created [${type}] for user ${userId}`);
  } catch (err: any) {
    console.error('❌ Notification creation failed for userId', userId, ':', err.message);
  }
}

/**
 * Notifica commento a tutti gli interessati (tranne l'autore).
 * Se dopo l'esclusione non ci sono altri destinatari, notifica comunque
 * il creatore del ticket (utile in sistemi mono-utente o ticket senza assegnatari).
 */
export async function notifyComment(
  ticketId: string,
  authorUserId: string,
  authorName: string,
  commentPreview: string
): Promise<void> {
  const recipients = await getTicketRecipients(ticketId, authorUserId);
  const ticketTitle = await getTicketTitle(ticketId);
  const preview = commentPreview.replace(/<[^>]*>/g, '').substring(0, 100);

  // Fallback: se nessun altro è coinvolto, notifica il creator del ticket
  let targets = recipients;
  if (targets.length === 0) {
    const allParticipants = await getTicketRecipients(ticketId);
    targets = allParticipants;
  }

  for (const userId of targets) {
    await createNotification(
      userId,
      'COMMENT',
      `Nuovo commento su "${ticketTitle}"`,
      `${authorName}: ${preview}`,
      ticketId
    );
  }
}

/**
 * Notifica assegnazione ticket
 */
export async function notifyAssignment(
  ticketId: string,
  assignedUserIds: string[],
  assignedByName: string
): Promise<void> {
  const ticketTitle = await getTicketTitle(ticketId);
  for (const userId of assignedUserIds) {
    await createNotification(
      userId,
      'ASSIGNMENT',
      `Ticket assegnato: #${ticketId.substring(0, 8)}`,
      `${assignedByName} ti ha assegnato "${ticketTitle}"`,
      ticketId
    );
  }
}

/**
 * Notifica cambio stato
 */
export async function notifyStatusChange(
  ticketId: string,
  changedByUserId: string,
  changedByName: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  // Per il cambio stato notifichiamo TUTTI i partecipanti incluso chi ha cambiato
  // (utile come conferma e audit trail, specialmente in sistemi mono-utente)
  const recipients = await getTicketRecipients(ticketId);
  const ticketTitle = await getTicketTitle(ticketId);

  for (const userId of recipients) {
    await createNotification(
      userId,
      'STATUS_CHANGE',
      `Stato aggiornato: "${ticketTitle}"`,
      `${oldStatus} → ${newStatus} (da ${changedByName})`,
      ticketId
    );
  }
}

/**
 * Notifica violazione SLA
 */
export async function notifySLAAlert(
  ticketId: string,
  ticketTitle: string,
  assignedUserIds: string[]
): Promise<void> {
  for (const userId of assignedUserIds) {
    await createNotification(
      userId,
      'SLA_ALERT',
      `SLA violato: #${ticketId.substring(0, 8)}`,
      `Il ticket "${ticketTitle}" ha superato la scadenza SLA`,
      ticketId
    );
  }
}

/**
 * Notifica email ricevuta
 */
export async function notifyEmailReceived(
  ticketId: string,
  fromEmail: string
): Promise<void> {
  const recipients = await getTicketRecipients(ticketId);
  for (const userId of recipients) {
    await createNotification(
      userId,
      'EMAIL',
      `Email ricevuta su #${ticketId.substring(0, 8)}`,
      `Nuova email da ${fromEmail}`,
      ticketId
    );
  }
}

/**
 * Notifica cambio priorità a tutti i partecipanti (tranne chi ha cambiato)
 */
export async function notifyPriorityChange(
  ticketId: string,
  changedByUserId: string,
  changedByName: string,
  oldPriority: string,
  newPriority: string
): Promise<void> {
  const recipients = await getTicketRecipients(ticketId, changedByUserId);
  const ticketTitle = await getTicketTitle(ticketId);

  for (const userId of recipients) {
    await createNotification(
      userId,
      'STATUS_CHANGE',
      `Priorità aggiornata: "${ticketTitle}"`,
      `${oldPriority} → ${newPriority} (da ${changedByName})`,
      ticketId
    );
  }
}

/**
 * Avvia il controllo periodico SLA (ogni 15 minuti).
 * Marca i ticket scaduti come slaViolated e invia notifiche ai partecipanti.
 */
export function startSLAChecker(): void {
  const CHECK_INTERVAL_MS = 15 * 60 * 1000;

  async function checkSLAViolations() {
    try {
      const now = new Date();
      const overdueTickets: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "title" FROM "Ticket"
         WHERE "dueDate" < $1
           AND "status" NOT IN ('RESOLVED', 'CLOSED')
           AND "slaViolated" = false`,
        now
      );

      for (const ticket of overdueTickets) {
        // Segna come violato (una sola volta)
        await prisma.$executeRawUnsafe(
          `UPDATE "Ticket" SET "slaViolated" = true WHERE "id" = $1`,
          ticket.id
        );

        const recipients = await getTicketRecipients(ticket.id);
        await notifySLAAlert(ticket.id, ticket.title, recipients);
        console.log(`⚠️ SLA violato per ticket ${ticket.id} — notificati ${recipients.length} utenti`);
      }
    } catch (err: any) {
      console.error('❌ SLA checker error:', err.message);
    }
  }

  checkSLAViolations();
  setInterval(checkSLAViolations, CHECK_INTERVAL_MS);
  console.log('⏰ SLA checker avviato (ogni 15 minuti)');
}

// ─── Helpers ───

async function getTicketRecipients(ticketId: string, excludeUserId?: string): Promise<string[]> {
  const userIds = new Set<string>();

  try {
    // Creatore + assegnazione diretta + reparti assegnati
    const ticket: any[] = await prisma.$queryRawUnsafe(
      `SELECT "createdById", "assignedToId", "assignedDepartments" FROM "Ticket" WHERE "id" = $1`, ticketId
    );
    if (ticket.length > 0) {
      userIds.add(ticket[0].createdById);
      if (ticket[0].assignedToId) userIds.add(ticket[0].assignedToId);

      // Utenti dei reparti assegnati
      const depts: string[] = ticket[0].assignedDepartments || [];
      if (depts.length > 0) {
        const deptUsers: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id" FROM "User" WHERE "department" = ANY($1) AND "status" = 'ACTIVE'`,
          depts
        );
        deptUsers.forEach((u: any) => userIds.add(u.id));
      }
    }

    // Multi-assegnazioni
    const assignments: any[] = await prisma.$queryRawUnsafe(
      `SELECT "userId" FROM "TicketAssignment" WHERE "ticketId" = $1`, ticketId
    );
    assignments.forEach(a => userIds.add(a.userId));
  } catch (err: any) {
    console.warn('⚠️ getTicketRecipients error:', err.message);
  }

  if (excludeUserId) userIds.delete(excludeUserId);
  const result = Array.from(userIds);
  console.log(`👥 Recipients for ticket ${ticketId} (exclude ${excludeUserId}):`, result);
  return result;
}

async function getTicketTitle(ticketId: string): Promise<string> {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "title" FROM "Ticket" WHERE "id" = $1`, ticketId
    );
    return rows[0]?.title || 'Ticket';
  } catch {
    return 'Ticket';
  }
}
