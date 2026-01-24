import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import authRoutes from './routes/auth.routes';
import ticketRoutes from './routes/ticket.routes';
import onboardingRoutes from './routes/onboarding.routes';
import offboardingRoutes from './routes/offboarding.routes';
import slaRoutes from './routes/sla.routes';
import auditRoutes from './routes/audit.routes';
import emailRoutes from './routes/email.routes';

// Services
import { startEmailListener } from './services/email.service';

dotenv.config();

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email listener starting...`);

  // Start email listener for incoming tickets
  startEmailListener().catch(console.error);
});

export default app;
