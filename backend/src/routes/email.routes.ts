import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import { createTicketFromEmail } from '../services/email.service';
import { getEmailConfigForAdmin, setConfig } from '../services/config.service';

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

// ===== Configurazione Email (solo ADMIN) =====

// Leggi configurazione email corrente
router.get('/config', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const config = await getEmailConfigForAdmin();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Salva configurazione email
router.put('/config', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const entries = req.body;
    if (!entries || typeof entries !== 'object') {
      return res.status(400).json({ error: 'Body deve essere un oggetto key-value' });
    }

    // Salva solo le chiavi permesse
    const allowed = ['company_name', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'smtp_from', 'imap_host', 'imap_port', 'imap_user', 'imap_password'];
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(entries)) {
      if (allowed.includes(key) && typeof value === 'string') {
        // Non salvare il placeholder mascherato
        if (value === '••••••••') continue;
        filtered[key] = value;
      }
    }

    await setConfig(filtered);
    const updated = await getEmailConfigForAdmin();
    res.json({ message: 'Configurazione salvata', config: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test connessione SMTP
router.post('/config/test', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { getSmtpConfig } = await import('../services/config.service');
    const nodemailer = await import('nodemailer');
    const smtp = await getSmtpConfig();

    if (!smtp.host || !smtp.user) {
      return res.status(400).json({ error: 'Configurazione SMTP incompleta' });
    }

    const transporter = nodemailer.default.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
    });

    await transporter.verify();
    res.json({ success: true, message: 'Connessione SMTP riuscita!' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
