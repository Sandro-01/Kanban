import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import ticketRoutes from './routes/ticket.routes';
import onboardingRoutes from './routes/onboarding.routes';
import offboardingRoutes from './routes/offboarding.routes';
import slaRoutes from './routes/sla.routes';
import auditRoutes from './routes/audit.routes';
import emailRoutes from './routes/email.routes';

// Services
import { startEmailListener } from './services/email.service';
import { startEmailPolling } from './services/emailIntegration.service';
import { startGraphEmailPolling, isGraphConfigured } from './services/graphEmail.service';

dotenv.config();

// Prisma Client (shared instance)
export const prisma = new PrismaClient();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (read-only)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/email', emailRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ISO compliance info
app.get('/api/compliance', (req: Request, res: Response) => {
  res.json({
    standards: ['ISO 9001:2015', 'ISO 27001:2022'],
    features: {
      auditLogging: true,
      immutableRecords: true,
      slaTracking: true,
      accessControl: true,
      dataIntegrity: true
    }
  });
});

// Auto-create SystemConfig table if not exists
async function ensureSystemConfigTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemConfig" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
      )
    `);
    console.log('✅ SystemConfig table ready');
  } catch (err: any) {
    console.warn('⚠️  SystemConfig table check failed:', err.message);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Ensure SystemConfig table exists for email settings
  await ensureSystemConfigTable();

  // Email integration
  if (isGraphConfigured()) {
    // Microsoft Graph API (OAuth2 - raccomandato per M365)
    console.log('📧 Email integration via Microsoft Graph API');
    startGraphEmailPolling(30);
  } else {
    // Check SMTP config from DB or env
    const { getSmtpConfig } = await import('./services/config.service');
    const smtp = await getSmtpConfig();
    if (smtp.host && smtp.user && smtp.password) {
      console.log(`📧 Email integration via IMAP (host: ${smtp.host}, user: ${smtp.user})`);
      startEmailListener().catch((err) => {
        console.warn('⚠️  Email listener non avviato:', err.message);
      });
      startEmailPolling(2);
    } else {
      console.log('📧 Email integration disabilitata');
      console.log('   Configurare via Admin UI (/settings/email)');
      console.log('   Oppure impostare AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET');
      if (!smtp.password) {
        console.log('   ⚠️  SMTP password mancante - controllare configurazione');
      }
    }
  }
});

export default app;
