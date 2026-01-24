import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { createTicketFromEmail } from '../services/email.service';

const router = Router();
const prisma = new PrismaClient();

// Webhook per ricevere email (SendGrid, Mailgun, etc.)
router.post('/webhook', async (req: any, res: Response) => {
  try {
    // Esempio per SendGrid
    const { from, subject, text, html, attachments } = req.body;

    await createTicketFromEmail(
      from,
      subject,
      html || text,
      attachments || []
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Errore webhook email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email logs
router.get('/logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId, status } = req.query;

    const where: any = {};
    if (ticketId) where.ticketId = ticketId;
    if (status) where.status = status;

    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
