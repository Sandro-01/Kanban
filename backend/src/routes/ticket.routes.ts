import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { getSLAHours } from '../services/sla.service';
import { notifyTicketUpdate } from '../services/email.service';
import { sendTicketEmail } from '../services/emailIntegration.service';

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
    const currentUser = req.user!;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (boardId) where.boardId = boardId;

    // Visibility rules:
    // ADMIN can see EVERYTHING
    // Normal users follow assignment rules
    if (currentUser.role !== 'ADMIN') {
      // Visibility rules (user assignment has priority over department):
      // 1. OPEN tickets with NO assignments → visible to everyone
      // 2. Assigned to specific users → ONLY those users can see (even if department is also assigned)
      // 3. Assigned to department WITHOUT user assignment → all users in that department can see
      where.OR = [
        // Rule 1: OPEN tickets with NO assignments (visible to all - "bacheca pubblica")
        {
          AND: [
            { status: 'OPEN' },
            { assignedDepartments: { isEmpty: true } },
            { assignments: { none: {} } },
            { assignedToId: null }
          ]
        },
        // Rule 2: Multi-assigned to me
        { assignments: { some: { userId: currentUser.id } } },
        // Rule 3: Assigned to my department (only if no user assignments)
        currentUser.department ? {
          AND: [
            { assignedDepartments: { has: currentUser.department } },
            { assignments: { none: {} } }
          ]
        } : {},
        // Rule 4: Assigned directly to me (legacy single assignment)
        { assignedToId: currentUser.id },
        // Rule 5: Tickets I created, ma solo se ancora in OPEN (bacheca pubblica)
        // Una volta preso in carico da qualcuno, solo l'assegnatario lo vede
        {
          AND: [
            { createdById: currentUser.id },
            { status: 'OPEN' }
          ]
        },
        // Rule 6: Ticket onboarding creati da me → visibili in QUALSIASI stato
        // L'HR deve poter seguire l'avanzamento della nuova assunzione
        {
          AND: [
            { createdById: currentUser.id },
            { category: { in: ['Richiesta Onboarding', 'Onboarding - Dotazioni'] } }
          ]
        }
      ];
    }
    // If ADMIN, no OR filter is added, so they see all tickets

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true, department: true }
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true, department: true }
        },
        column: true,
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, department: true }
            }
          }
        },
        attachments: {
          where: { isDeleted: false },
          include: {
            uploadedBy: {
              select: { id: true, email: true, firstName: true, lastName: true, department: true }
            }
          }
        },
        comments: {
          where: { isDeleted: false },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, department: true }
            },
            attachments: {
              where: { isDeleted: false },
              include: {
                uploadedBy: {
                  select: { id: true, email: true, firstName: true, lastName: true, department: true }
                }
              }
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

// Get singolo ticket
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true, department: true }
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true, department: true }
        },
        column: true,
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, department: true }
            }
          }
        },
        attachments: {
          where: { isDeleted: false },
          include: {
            uploadedBy: {
              select: { id: true, email: true, firstName: true, lastName: true, department: true }
            }
          }
        },
        comments: {
          where: { isDeleted: false },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, department: true }
            },
            attachments: {
              where: { isDeleted: false },
              include: {
                uploadedBy: {
                  select: { id: true, email: true, firstName: true, lastName: true, department: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket non trovato' });
    }

    res.json(ticket);
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

    // Ricalcolo SLA: se la priorità cambia, aggiorna slaHours e dueDate
    if (updates.priority && updates.priority !== oldTicket.priority) {
      const newSlaHours = getSLAHours(updates.priority);
      updates.slaHours = newSlaHours;
      updates.dueDate = new Date(oldTicket.createdAt.getTime() + newSlaHours * 60 * 60 * 1000);
      console.log(`⏱️ SLA ricalcolato: ticket ${id} priorità ${oldTicket.priority} → ${updates.priority}, SLA ${oldTicket.slaHours}h → ${newSlaHours}h`);
    }

    // Auto-assegnazione: se lo status cambia da OPEN e il ticket non ha assegnazioni,
    // assegna automaticamente all'utente che lo sta spostando ("presa in carico")
    if (
      updates.status &&
      updates.status !== 'OPEN' &&
      oldTicket.status === 'OPEN' &&
      !oldTicket.assignedToId
    ) {
      const hasAssignments = await prisma.ticketAssignment.count({ where: { ticketId: id } });
      const hasDepartments = oldTicket.assignedDepartments.length > 0;

      if (hasAssignments === 0 && !hasDepartments) {
        // Nessuna assegnazione: auto-assegna a chi trascina il ticket
        await prisma.ticketAssignment.create({
          data: {
            ticketId: id,
            userId: req.user!.id,
            assignedBy: req.user!.id
          }
        });
        console.log(`👤 Auto-assegnazione: ticket ${id} preso in carico da ${req.user!.email}`);
      }
    }

    // Rilascio: se il ticket torna a OPEN, rimuovi tutte le assegnazioni
    // così torna visibile a tutti nella bacheca pubblica
    // ECCEZIONE: i ticket onboarding mantengono le assegnazioni automatiche (reparto/responsabile)
    if (
      updates.status === 'OPEN' &&
      oldTicket.status !== 'OPEN'
    ) {
      const isOnboardingTicket = oldTicket.category === 'Richiesta Onboarding' || oldTicket.category === 'Onboarding - Dotazioni';

      if (isOnboardingTicket) {
        // Ticket onboarding: mantieni assegnazioni originali (reparto IT, manager)
        console.log(`🔒 Ticket onboarding ${id} tornato in To Do, assegnazioni mantenute`);
      } else {
        const removed = await prisma.ticketAssignment.deleteMany({ where: { ticketId: id } });
        // Rimuovi anche l'assegnazione diretta legacy
        updates.assignedToId = null;
        updates.assignedDepartments = [];
        console.log(`🔓 Rilascio: ticket ${id} tornato in To Do, rimosse ${removed.count} assegnazioni`);
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updates,
      include: {
        createdBy: true,
        assignedTo: true,
        column: true,
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, department: true }
            }
          }
        },
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
    const { content, hasFile } = req.body;

    console.log('📝 Adding comment to ticket:', id);
    console.log('📝 Content:', content);
    console.log('📝 User ID:', req.user!.id);
    console.log('📝 Has file coming:', hasFile);

    const comment = await prisma.comment.create({
      data: {
        ticketId: id,
        userId: req.user!.id,
        content
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, department: true }
        }
      }
    });

    console.log('✅ Comment created successfully:', comment.id);

    // Se ci sono file in arrivo, la notifica verrà inviata dall'endpoint attachments
    if (!hasFile) {
      try {
        const authorName = `${req.user!.firstName} ${req.user!.lastName}`;
        await notifyTicketUpdate(id, 'Nuovo commento', content, undefined, authorName);
        console.log('✅ Email notification sent');
      } catch (emailError: any) {
        console.error('⚠️ Email notification failed (non-critical):', emailError.message);
      }
    } else {
      console.log('ℹ️ Deferring email notification to attachment upload');
    }

    res.json(comment);
  } catch (error: any) {
    console.error('❌ ERROR adding comment:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Upload file (IMMUTABILE)
router.post('/:id/attachments', authenticate, upload.single('file'), auditLog('UPLOAD_FILE', 'Attachment'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { commentId, isLastFile } = req.body; // Optional commentId to link file to comment

    console.log('📎 Uploading file to ticket:', id);
    if (commentId) {
      console.log('📎 Linking to comment:', commentId);
    }

    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    console.log('📎 File info:', {
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });

    const attachment = await prisma.attachment.create({
      data: {
        ticketId: id,
        commentId: commentId || null, // Link to comment if provided
        fileName: req.file.originalname,
        filePath: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedById: req.user!.id
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            department: true
          }
        }
      }
    });

    console.log('✅ File uploaded successfully:', attachment.id);

    // Invia notifica email:
    // - Standalone (senza commento): notifica con file allegato
    // - Con commento + isLastFile: notifica combinata (testo commento + tutti i file)
    const shouldNotify = !commentId || (commentId && isLastFile === 'true');
    if (shouldNotify) {
      try {
        // Raccogli tutti gli allegati collegati al commento (o solo questo se standalone)
        let allFileAttachments: { fileName: string; filePath: string; mimeType: string }[] = [];
        let emailDetails = '';

        if (commentId) {
          // Recupera il commento e tutti i suoi allegati
          const commentData = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { attachments: true }
          });
          emailDetails = commentData?.content || '';
          allFileAttachments = (commentData?.attachments || []).map((att: any) => ({
            fileName: att.fileName,
            filePath: att.filePath,
            mimeType: att.mimeType || 'application/octet-stream',
          }));
        } else {
          emailDetails = `File caricato: <strong>${req.file.originalname}</strong>`;
          allFileAttachments = [{ fileName: req.file.originalname, filePath: req.file.filename, mimeType: req.file.mimetype }];
        }

        const authorName = `${req.user!.firstName} ${req.user!.lastName}`;
        await notifyTicketUpdate(
          id,
          commentId ? 'Nuovo commento' : 'Nuovo allegato',
          emailDetails,
          allFileAttachments,
          authorName
        );
        console.log('✅ Email notification sent with', allFileAttachments.length, 'attachment(s)');
      } catch (emailError: any) {
        console.error('⚠️ Email notification failed (non-critical):', emailError.message);
      }
    } else {
      console.log('ℹ️ Waiting for last file before sending notification');
    }

    res.json(attachment);
  } catch (error: any) {
    console.error('❌ ERROR uploading file:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// DELETE ticket (solo admin)
router.delete('/:id', authenticate, authorize('ADMIN'), auditLog('DELETE_TICKET', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket non trovato' });
    }

    // Cascade delete rimuove automaticamente: comments, attachments, assignments, history
    await prisma.ticket.delete({ where: { id } });

    res.json({ message: 'Ticket eliminato con successo' });
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

// Assign users to ticket (multi-assignment)
router.post('/:id/assign-users', authenticate, auditLog('ASSIGN_USERS', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body; // Array of user IDs

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }

    console.log(`👥 Assigning ${userIds.length} users to ticket ${id}`);

    // Get ticket info for notifications
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { title: true, status: true }
    });

    // Clear department assignments (mutually exclusive)
    await prisma.ticket.update({
      where: { id },
      data: { assignedDepartments: [] }
    });
    console.log('🏢 Cleared department assignments (users have priority)');

    // Remove all existing user assignments first
    await prisma.ticketAssignment.deleteMany({
      where: { ticketId: id }
    });

    // Create new assignments for each user
    const assignments = await Promise.all(
      userIds.map((userId: string) =>
        prisma.ticketAssignment.create({
          data: {
            ticketId: id,
            userId: userId,
            assignedBy: req.user!.id
          },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, department: true }
            }
          }
        })
      )
    );

    // If assigning to users, move ticket to IN_PROGRESS
    if (ticket && ticket.status === 'OPEN') {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' }
      });
      console.log('📊 Ticket moved to IN_PROGRESS');
    }

    // Send email notifications to assigned users
    for (const assignment of assignments) {
      try {
        await notifyTicketUpdate(
          id,
          'Assegnazione ticket',
          `Ti è stato assegnato il ticket: "${ticket?.title}". Controlla la tua board Kanban.`
        );
        console.log(`📧 Email sent to ${assignment.user.email}`);
      } catch (emailError: any) {
        console.error(`⚠️ Failed to send email to ${assignment.user.email}:`, emailError.message);
        // Don't fail the request if email fails
      }
    }

    console.log(`✅ Successfully assigned ${assignments.length} users`);
    res.json({ message: 'Users assigned successfully', assignments });
  } catch (error: any) {
    console.error('❌ Error assigning users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove user assignment from ticket
router.delete('/:id/assign-users/:userId', authenticate, auditLog('UNASSIGN_USER', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    console.log(`👥 Removing user ${userId} from ticket ${id}`);

    await prisma.ticketAssignment.delete({
      where: {
        ticketId_userId: {
          ticketId: id,
          userId: userId
        }
      }
    });

    console.log(`✅ Successfully removed user assignment`);
    res.json({ message: 'User unassigned successfully' });
  } catch (error: any) {
    console.error('❌ Error removing user assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign departments to ticket
router.post('/:id/assign-departments', authenticate, auditLog('ASSIGN_DEPARTMENTS', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { departments } = req.body; // Array of department names

    if (!Array.isArray(departments)) {
      return res.status(400).json({ error: 'departments must be an array' });
    }

    console.log(`🏢 Assigning departments to ticket ${id}:`, departments);

    // Clear user assignments (mutually exclusive)
    await prisma.ticketAssignment.deleteMany({
      where: { ticketId: id }
    });
    console.log('👥 Cleared user assignments (departments have priority)');

    // Update ticket with department assignments
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        assignedDepartments: departments,
        status: 'OPEN' // Keep in OPEN when assigning to departments
      }
    });

    console.log(`✅ Successfully assigned departments, ticket status: ${ticket.status}`);
    res.json({ message: 'Departments assigned successfully', assignedDepartments: ticket.assignedDepartments });
  } catch (error: any) {
    console.error('❌ Error assigning departments:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ EMAIL INTEGRATION ============

// Aggiungi contatti esterni al ticket
router.post('/:id/external-contacts', authenticate, auditLog('ADD_EXTERNAL_CONTACTS', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { emails } = req.body; // Array of email addresses

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'emails must be a non-empty array' });
    }

    // Valida formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email: string) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ error: `Invalid email format: ${invalidEmails.join(', ')}` });
    }

    // Recupera ticket esistente
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { externalContacts: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Aggiungi nuovi contatti (evita duplicati)
    const existingContacts = new Set(ticket.externalContacts);
    emails.forEach((email: string) => existingContacts.add(email.toLowerCase()));

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        externalContacts: Array.from(existingContacts),
      },
    });

    console.log(`📧 Contatti esterni aggiunti al ticket ${id}:`, emails);
    res.json({
      message: 'External contacts added successfully',
      externalContacts: updatedTicket.externalContacts
    });
  } catch (error: any) {
    console.error('❌ Error adding external contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Invia email a contatti esterni (con allegati opzionali)
router.post('/:id/send-email', authenticate, auditLog('SEND_EMAIL', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, body, toEmails, attachmentIds } = req.body;
    const currentUser = req.user!;

    if (!subject || !body) {
      return res.status(400).json({ error: 'subject and body are required' });
    }

    if (!Array.isArray(toEmails) || toEmails.length === 0) {
      return res.status(400).json({ error: 'toEmails must be a non-empty array' });
    }

    // Verifica che ticket esista
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        attachments: {
          where: {
            isDeleted: false,
            ...(attachmentIds && attachmentIds.length > 0
              ? { id: { in: attachmentIds } }
              : {}
            )
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Invia email con allegati
    await sendTicketEmail(id, toEmails, subject, body, currentUser.id, attachmentIds);

    // Prepara testo commento con info allegati
    let commentContent = `📤 **Email inviata a:** ${toEmails.join(', ')}\n\n**Oggetto:** ${subject}\n\n**Messaggio:**\n${body}`;
    if (ticket.attachments && ticket.attachments.length > 0) {
      commentContent += `\n\n**📎 Allegati inclusi (${ticket.attachments.length}):**\n`;
      ticket.attachments.forEach(att => {
        commentContent += `- ${att.fileName}\n`;
      });
    }

    // Crea commento per tracciare l'invio email
    await prisma.comment.create({
      data: {
        ticketId: id,
        userId: currentUser.id,
        content: commentContent,
      },
    });

    console.log(`✅ Email inviata per ticket ${id} a ${toEmails.join(', ')}`);
    if (ticket.attachments && ticket.attachments.length > 0) {
      console.log(`   📎 Con ${ticket.attachments.length} allegati`);
    }
    res.json({
      message: 'Email sent successfully',
      sentTo: toEmails,
      attachmentsCount: ticket.attachments?.length || 0
    });
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// Rimuovi contatto esterno
router.delete('/:id/external-contacts/:email', authenticate, auditLog('REMOVE_EXTERNAL_CONTACT', 'Ticket'), async (req: AuthRequest, res: Response) => {
  try {
    const { id, email } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { externalContacts: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Rimuovi contatto
    const updatedContacts = ticket.externalContacts.filter(
      (contact) => contact.toLowerCase() !== email.toLowerCase()
    );

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        externalContacts: updatedContacts,
      },
    });

    console.log(`🗑️ Contatto esterno rimosso dal ticket ${id}:`, email);
    res.json({
      message: 'External contact removed successfully',
      externalContacts: updatedTicket.externalContacts
    });
  } catch (error: any) {
    console.error('❌ Error removing external contact:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
