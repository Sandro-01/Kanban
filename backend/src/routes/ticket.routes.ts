import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { getSLAHours } from '../services/sla.service';
import { notifyTicketUpdate, sendEmail, stripEmailQuotes } from '../services/email.service';

const router = Router();
const prisma = new PrismaClient();

// Configurazione upload IMMUTABILE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }
});

// Lista tickets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, boardId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (boardId) where.boardId = boardId;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        column: true,
        attachments: {
          where: { isDeleted: false }
        },
        comments: {
          where: { isDeleted: false },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crea ticket
router.post('/', authenticate, auditLog('CREATE_TICKET', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, boardId, columnId, priority, category } = req.body;

    const slaHours = getSLAHours(priority || 'MEDIUM');
    const dueDate = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        boardId,
        columnId,
        createdById: req.user!.id,
        priority: priority || 'MEDIUM',
        category,
        slaHours,
        dueDate
      },
      include: {
        createdBy: true,
        column: true
      }
    });

    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        field: 'created',
        newValue: 'Ticket creato',
        changedBy: req.user!.id
      }
    });

    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Aggiorna ticket
router.put('/:id', authenticate, auditLog('UPDATE_TICKET', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const oldTicket = await prisma.ticket.findUnique({ where: { id } });
    if (!oldTicket) {
      return res.status(404).json({ error: 'Ticket non trovato' });
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updates,
      include: {
        createdBy: true,
        assignedTo: true,
        column: true,
        attachments: { where: { isDeleted: false } },
        comments: { where: { isDeleted: false } }
      }
    });

    // Crea history per ogni campo modificato
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = (oldTicket as any)[field];
      if (oldValue !== newValue) {
        await prisma.ticketHistory.create({
          data: {
            ticketId: id,
            field,
            oldValue: String(oldValue),
            newValue: String(newValue),
            changedBy: req.user!.id
          }
        });
      }
    }

    // Notifica se assegnato
    if (updates.assignedToId && updates.assignedToId !== oldTicket.assignedToId) {
      await notifyTicketUpdate(id, 'Assegnazione', 'Il ticket ti è stato assegnato');
    }

    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Aggiungi commento (IMMUTABILE)
router.post('/:id/comments', authenticate, auditLog('ADD_COMMENT', 'Comment'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: {
        ticketId: id,
        userId: req.user!.id,
        content
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });

    await notifyTicketUpdate(id, 'Nuovo commento', content);

    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload file (IMMUTABILE)
router.post('/:id/attachments', authenticate, upload.single('file'), auditLog('UPLOAD_FILE', 'Attachment'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const attachment = await prisma.attachment.create({
      data: {
        ticketId: id,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    res.json(attachment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SOFT DELETE commento (dati rimangono per ISO compliance)
router.delete('/:ticketId/comments/:commentId', authenticate, auditLog('DELETE_COMMENT', 'Comment'), async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true } // SOFT DELETE - dati rimangono
    });

    res.json({ message: 'Commento nascosto (dati conservati per ISO compliance)', comment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SOFT DELETE file (file rimane su disco per ISO compliance)
router.delete('/:ticketId/attachments/:attachmentId', authenticate, auditLog('DELETE_ATTACHMENT', 'Attachment'), async (req: AuthRequest, res: Response) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await prisma.attachment.update({
      where: { id: attachmentId },
      data: { isDeleted: true } // SOFT DELETE - file rimane su disco
    });

    res.json({ message: 'File nascosto (file conservato per ISO compliance)', attachment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get ticket history (ISO compliance)
router.get('/:id/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const history = await prisma.ticketHistory.findMany({
      where: { ticketId: id },
      orderBy: { changedAt: 'desc' }
    });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Assign users ──────────────────────────────────────────────────────────────
router.post('/:id/assign-users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array required' });
    }
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { assignedToId: userIds[0] },
      include: { assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } } }
    });
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/assign-users/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { assignedToId: null }
    });
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Assign departments ────────────────────────────────────────────────────────
router.post('/:id/assign-departments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { departments } = req.body;
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { category: Array.isArray(departments) ? departments[0] : departments }
    });
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── External contacts ─────────────────────────────────────────────────────────
router.post('/:id/external-contacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { emails } = req.body;

    const ticket = await (prisma.ticket as any).findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    const existing: string[] = ticket.externalContacts
      ? JSON.parse(ticket.externalContacts)
      : [];

    const merged = [...new Set([...existing, ...(emails || [])])];

    const updated = await (prisma.ticket as any).update({
      where: { id },
      data: { externalContacts: JSON.stringify(merged) }
    });

    res.json({ ...updated, externalContacts: merged });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/external-contacts/:email', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, email } = req.params;
    const decoded = decodeURIComponent(email);

    const ticket = await (prisma.ticket as any).findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    const existing: string[] = ticket.externalContacts
      ? JSON.parse(ticket.externalContacts)
      : [];

    const filtered = existing.filter((e: string) => e !== decoded);

    const updated = await (prisma.ticket as any).update({
      where: { id },
      data: { externalContacts: JSON.stringify(filtered) }
    });

    res.json({ ...updated, externalContacts: filtered });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Send email from ticket ────────────────────────────────────────────────────
router.post('/:id/send-email', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, body, toEmails, attachmentIds } = req.body;

    if (!toEmails || !Array.isArray(toEmails) || toEmails.length === 0) {
      return res.status(400).json({ error: 'toEmails required' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    const htmlBody = `
      <div>${body.replace(/\n/g, '<br>')}</div>
      <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">
      <p style="color:#6b7280;font-size:12px;">
        Ticket #${ticket.id.substring(0, 8)} — ${ticket.title}<br>
        Per rispondere scrivi direttamente a questa email.
      </p>
    `;

    for (const toEmail of toEmails) {
      await sendEmail(toEmail, subject, htmlBody, id);
    }

    // Save as outgoing email comment
    const comment = await (prisma.comment as any).create({
      data: {
        ticketId: id,
        userId: req.user!.id,
        content: body,
        isOutgoingEmail: true,
        toEmails: JSON.stringify(toEmails),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });

    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
