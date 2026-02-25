import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
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

// ─── Email Config (Admin) ────────────────────────────────────────────────────

// GET /email/config – return current saved config (passwords masked)
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    const cfg = settings || {};
    res.json({
      companyName:  (cfg as any).companyName  ?? '',
      logoUrl:      (cfg as any).logoUrl      ?? '',
      smtpHost:     (cfg as any).smtpHost     ?? process.env.EMAIL_HOST     ?? '',
      smtpPort:     (cfg as any).smtpPort     ?? process.env.EMAIL_PORT     ?? '587',
      smtpSecure:   (cfg as any).smtpSecure   ?? (process.env.EMAIL_SECURE === 'true' ? 'true' : 'false'),
      smtpFrom:     (cfg as any).smtpFrom     ?? process.env.EMAIL_FROM     ?? '',
      smtpUser:     (cfg as any).smtpUser     ?? process.env.EMAIL_USER     ?? '',
      smtpPassword: (cfg as any).smtpPassword ? '********' : '',
      imapHost:     (cfg as any).imapHost     ?? process.env.IMAP_HOST      ?? '',
      imapPort:     (cfg as any).imapPort     ?? process.env.IMAP_PORT      ?? '993',
      imapUser:     (cfg as any).imapUser     ?? process.env.IMAP_USER      ?? '',
      imapPassword: (cfg as any).imapPassword ? '********' : '',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /email/config – save config
router.put('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      companyName, logoUrl,
      smtpHost, smtpPort, smtpSecure, smtpFrom, smtpUser, smtpPassword,
      imapHost, imapPort, imapUser, imapPassword,
    } = req.body;

    // Fetch current settings so we don't overwrite the password when masked
    const current = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });

    const data: any = {
      companyName: companyName ?? '',
      logoUrl:     logoUrl     ?? '',
      smtpHost:    smtpHost    ?? '',
      smtpPort:    smtpPort    ?? '587',
      smtpSecure:  smtpSecure  ?? 'false',
      smtpFrom:    smtpFrom    ?? '',
      smtpUser:    smtpUser    ?? '',
      imapHost:    imapHost    ?? '',
      imapPort:    imapPort    ?? '993',
      imapUser:    imapUser    ?? '',
    };

    // Only update passwords if the client sent a real value (not the masked placeholder)
    if (smtpPassword && smtpPassword !== '********') data.smtpPassword = smtpPassword;
    else if (current) data.smtpPassword = (current as any).smtpPassword ?? '';

    if (imapPassword && imapPassword !== '********') data.imapPassword = imapPassword;
    else if (current) data.imapPassword = (current as any).imapPassword ?? '';

    await prisma.appSettings.upsert({
      where:  { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /email/config/test – verify SMTP connection with saved (or provided) credentials
router.post('/config/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    const s = settings as any;

    const host     = s?.smtpHost     || process.env.EMAIL_HOST || '';
    const port     = parseInt(s?.smtpPort || process.env.EMAIL_PORT || '587');
    const secure   = (s?.smtpSecure || process.env.EMAIL_SECURE) === 'true';
    const user     = s?.smtpUser     || process.env.EMAIL_USER || '';
    const pass     = s?.smtpPassword || process.env.EMAIL_PASSWORD || '';

    if (!host || !user) {
      return res.status(400).json({ error: 'SMTP host and user are required' });
    }

    const testTransporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await testTransporter.verify();

    res.json({ success: true, message: 'Connessione SMTP riuscita' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /email/config/status – lightweight connection status
router.get('/config/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    const s = settings as any;
    res.json({
      smtpConfigured: !!(s?.smtpHost && s?.smtpUser),
      imapConfigured: !!(s?.imapHost && s?.imapUser),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
