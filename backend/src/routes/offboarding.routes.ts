import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { sendEmail } from '../services/email.service';

const router = Router();
const prisma = new PrismaClient();

// Template task offboarding
const DEFAULT_OFFBOARDING_TASKS = [
  { title: 'Revoca accessi sistemi', description: 'Disabilitare tutti gli accessi ai sistemi aziendali', order: 1, mandatory: true },
  { title: 'Disattivazione email', description: 'Disattivare account email aziendale', order: 2, mandatory: true },
  { title: 'Ritiro badge/chiavi', description: 'Recuperare badge accesso e chiavi', order: 3, mandatory: true },
  { title: 'Ritiro dispositivi', description: 'Recuperare PC, telefono, e altri dispositivi', order: 4, mandatory: true },
  { title: 'Trasferimento documentazione', description: 'Trasferire documenti e progetti al team', order: 5, mandatory: true },
  { title: 'Cancellazione dati personali', description: 'Rimuovere dati personali dai sistemi (GDPR)', order: 6, mandatory: true },
  { title: 'Exit interview', description: 'Colloquio finale con HR', order: 7, mandatory: false },
  { title: 'Documenti finali', description: 'Firma documenti di fine rapporto', order: 8, mandatory: true }
];

// Lista offboarding
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const offboardings = await prisma.offboarding.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, status: true }
        },
        manager: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        tasks: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(offboardings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crea processo offboarding
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), auditLog('CREATE_OFFBOARDING', 'Offboarding'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, reason, expectedDays } = req.body;

    // Verifica utente
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Aggiorna status utente
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'OFFBOARDING' }
    });

    const expectedEndDate = new Date();
    expectedEndDate.setDate(expectedEndDate.getDate() + (expectedDays || 7));

    const offboarding = await prisma.offboarding.create({
      data: {
        userId,
        managerId: req.user!.id,
        reason,
        expectedEndDate,
        tasks: {
          create: DEFAULT_OFFBOARDING_TASKS
        }
      },
      include: {
        user: true,
        manager: true,
        tasks: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // Invia email notifica
    await sendEmail(
      user.email,
      'Processo di Offboarding avviato',
      `
        <h2>Gentile ${user.firstName},</h2>
        <p>È stato avviato il processo di offboarding.</p>
        <p><strong>Responsabile:</strong> ${offboarding.manager.firstName} ${offboarding.manager.lastName}</p>
        <p><strong>Data prevista completamento:</strong> ${expectedEndDate.toLocaleDateString('it-IT')}</p>
        <p>Sarai contattato per completare le procedure necessarie.</p>
      `
    );

    res.json(offboarding);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Completa task offboarding
router.put('/:id/tasks/:taskId', authenticate, authorize('ADMIN', 'MANAGER'), auditLog('COMPLETE_OFFBOARDING_TASK', 'OffboardingTask'), async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { completed } = req.body;

    const task = await prisma.offboardingTask.update({
      where: { id: taskId },
      data: {
        completed,
        completedAt: completed ? new Date() : null
      }
    });

    // Verifica se tutti i task obbligatori sono completati
    const offboarding = await prisma.offboarding.findUnique({
      where: { id: task.offboardingId },
      include: {
        tasks: true,
        user: true
      }
    });

    if (offboarding) {
      const mandatoryTasks = offboarding.tasks.filter(t => t.mandatory);
      const completedMandatory = mandatoryTasks.filter(t => t.completed);

      if (mandatoryTasks.length === completedMandatory.length) {
        await prisma.offboarding.update({
          where: { id: offboarding.id },
          data: {
            status: 'COMPLETED',
            actualEndDate: new Date()
          }
        });

        await prisma.user.update({
          where: { id: offboarding.userId },
          data: { status: 'INACTIVE' }
        });

        await sendEmail(
          offboarding.user.email,
          'Offboarding Completato',
          `
            <h2>Gentile ${offboarding.user.firstName},</h2>
            <p>Il processo di offboarding è stato completato.</p>
            <p>Ti auguriamo il meglio per il futuro.</p>
          `
        );
      }
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get singolo offboarding
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const offboarding = await prisma.offboarding.findUnique({
      where: { id },
      include: {
        user: true,
        manager: true,
        tasks: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!offboarding) {
      return res.status(404).json({ error: 'Offboarding non trovato' });
    }

    res.json(offboarding);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
