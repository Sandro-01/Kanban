import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { processInboundEmail } from '../services/email.service';

const router = Router();
const prisma = new PrismaClient();

// Webhook per ricevere email (SendGrid, Mailgun, Postmark, Cloudmailin, etc.)
// Se la mail è una risposta a un ticket esistente (subject contiene "Ticket #<id>")
// viene aggiunta come commento. Altrimenti viene creato un nuovo ticket.
router.post('/webhook', async (req: any, res: Response) => {
  try {
    const b = req.body;

    // Normalise field names across email providers:
    //   SendGrid Inbound Parse : from, subject, html, text
    //   Mailgun Inbound Parse  : from, subject, body-html, body-plain
    //   Postmark Inbound       : From, Subject, HtmlBody, TextBody
    //   Cloudmailin JSON       : from, subject, html, plain
    //   Brevo (Sendinblue)     : from, subject, html, text
    const from    = b.from    || b.From    || b.sender || '';
    const subject = b.subject || b.Subject || '';
    const html    = b.html    || b['body-html']  || b.HtmlBody  || b.Html  || '';
    const text    = b.text    || b['body-plain'] || b.TextBody  || b.plain || b.Plain || '';
    const attachments = b.attachments || [];

    await processInboundEmail(
      from,
      subject,
      html || text || '',
      attachments
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
