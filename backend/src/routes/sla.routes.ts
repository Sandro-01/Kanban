import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import { getSLAMetrics } from '../services/sla.service';

const router = Router();
const prisma = new PrismaClient();

// Get metriche SLA
router.get('/metrics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await getSLAMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get configurazioni SLA
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.sLAConfig.findMany({
      orderBy: { priority: 'asc' }
    });

    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crea/Aggiorna configurazione SLA
router.post('/config', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { category, priority, hours, description } = req.body;

    const config = await prisma.sLAConfig.upsert({
      where: { category },
      update: { priority, hours, description },
      create: { category, priority, hours, description }
    });

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Report violazioni SLA
router.get('/violations', authenticate, authorize('ADMIN', 'MANAGER', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    const violations = await prisma.ticket.findMany({
      where: {
        slaViolated: true
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    res.json(violations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
