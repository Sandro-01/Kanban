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
  } catch (err: any) {
    console.error('❌ Notification creation failed for userId', userId, ':', err.message);
  }
}

/**
 * Notifica commento a tutti gli interessati (tranne l'autore)
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

  for (const userId of recipients) {
    await createNotification(
      userId,
      'COMMENT',
      `Nuovo commento su #${ticketId.substring(0, 8)}`,
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
  const recipients = await getTicketRecipients(ticketId, changedByUserId);
  const ticketTitle = await getTicketTitle(ticketId);

  for (const userId of recipients) {
    await createNotification(
      userId,
      'STATUS_CHANGE',
      `Stato aggiornato: #${ticketId.substring(0, 8)}`,
      `"${ticketTitle}" ${oldStatus} → ${newStatus} (da ${changedByName})`,
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

// ─── Helpers ───

async function getTicketRecipients(ticketId: string, excludeUserId?: string): Promise<string[]> {
  const userIds = new Set<string>();

  try {
    // Creatore
    const ticket: any[] = await prisma.$queryRawUnsafe(
      `SELECT "createdById", "assignedToId" FROM "Ticket" WHERE "id" = $1`, ticketId
    );
    if (ticket.length > 0) {
      userIds.add(ticket[0].createdById);
      if (ticket[0].assignedToId) userIds.add(ticket[0].assignedToId);
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
  return Array.from(userIds);
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
