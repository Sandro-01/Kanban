import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { getSLAHours } from '../services/sla.service';
import { notifyTicketUpdate } from '../services/email.service';

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
    // 1. OPEN tickets → visible to everyone
    // 2. Assigned to specific user → only that user can see
    // 3. Assigned to department → all users in that department can see
    // 4. Multi-assigned → users in assignments list can see
    where.OR = [
      // Rule 1: All OPEN tickets
      { status: 'OPEN' },
      // Rule 2: Assigned directly to me (old single assignment)
      { assignedToId: currentUser.id },
      // Rule 3: Assigned to my department
      currentUser.department ? { assignedDepartments: { has: currentUser.department } } : {},
      // Rule 4: Multi-assigned to me
      { assignments: { some: { userId: currentUser.id } } }
    ];

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

    console.log('📝 Adding comment to ticket:', id);
    console.log('📝 Content:', content);
    console.log('📝 User ID:', req.user!.id);

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

    try {
      await notifyTicketUpdate(id, 'Nuovo commento', content);
      console.log('✅ Email notification sent');
    } catch (emailError: any) {
      console.error('⚠️ Email notification failed (non-critical):', emailError.message);
      // Don't fail the request if email fails
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
    const { commentId } = req.body; // Optional commentId to link file to comment

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
    res.json(attachment);
  } catch (error: any) {
    console.error('❌ ERROR uploading file:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
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

    // Create assignments for each user
    const assignments = await Promise.all(
      userIds.map((userId: string) =>
        prisma.ticketAssignment.upsert({
          where: {
            ticketId_userId: {
              ticketId: id,
              userId: userId
            }
          },
          create: {
            ticketId: id,
            userId: userId,
            assignedBy: req.user!.id
          },
          update: {
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

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        assignedDepartments: departments
      }
    });

    console.log(`✅ Successfully assigned departments`);
    res.json({ message: 'Departments assigned successfully', assignedDepartments: ticket.assignedDepartments });
  } catch (error: any) {
    console.error('❌ Error assigning departments:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
