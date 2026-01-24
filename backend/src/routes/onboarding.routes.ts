import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { sendEmail } from '../services/email.service';

const router = Router();
const prisma = new PrismaClient();

// Template task onboarding
const DEFAULT_ONBOARDING_TASKS = [
  { title: 'Creazione account email', description: 'Configurare email aziendale', order: 1, mandatory: true },
  { title: 'Accesso sistemi aziendali', description: 'Fornire credenziali per tutti i sistemi', order: 2, mandatory: true },
  { title: 'Formazione sicurezza ISO 27001', description: 'Completare corso sicurezza informatica', order: 3, mandatory: true },
  { title: 'Formazione qualità ISO 9001', description: 'Completare corso gestione qualità', order: 4, mandatory: true },
  { title: 'Assegnazione workstation', description: 'Configurare PC e strumenti di lavoro', order: 5, mandatory: true },
  { title: 'Presentazione team', description: 'Incontro con team e responsabili', order: 6, mandatory: false },
  { title: 'Firma documenti', description: 'Contratto, NDA, policy aziendali', order: 7, mandatory: true },
  { title: 'Accesso badge/chiavi', description: 'Fornire badge accesso e chiavi ufficio', order: 8, mandatory: true }
];

// Lista onboarding
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const onboardings = await prisma.onboarding.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
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

    res.json(onboardings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crea processo onboarding
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), auditLog('CREATE_ONBOARDING', 'Onboarding'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, expectedDays } = req.body;

    // Verifica utente
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Aggiorna status utente
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ONBOARDING' }
    });

    const expectedEndDate = new Date();
    expectedEndDate.setDate(expectedEndDate.getDate() + (expectedDays || 7));

    const onboarding = await prisma.onboarding.create({
      data: {
        userId,
        managerId: req.user!.id,
        expectedEndDate,
        tasks: {
          create: DEFAULT_ONBOARDING_TASKS
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

    // Invia email benvenuto
    await sendEmail(
      user.email,
      'Benvenuto - Processo di Onboarding',
      `
        <h2>Benvenuto ${user.firstName}!</h2>
        <p>È stato avviato il tuo processo di onboarding.</p>
        <p><strong>Responsabile:</strong> ${onboarding.manager.firstName} ${onboarding.manager.lastName}</p>
        <p><strong>Data prevista completamento:</strong> ${expectedEndDate.toLocaleDateString('it-IT')}</p>
        <p>Riceverai aggiornamenti durante il processo.</p>
      `
    );

    res.json(onboarding);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Completa task onboarding
router.put('/:id/tasks/:taskId', authenticate, auditLog('COMPLETE_ONBOARDING_TASK', 'OnboardingTask'), async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { completed } = req.body;

    const task = await prisma.onboardingTask.update({
      where: { id: taskId },
      data: {
        completed,
        completedAt: completed ? new Date() : null
      }
    });

    // Verifica se tutti i task obbligatori sono completati
    const onboarding = await prisma.onboarding.findUnique({
      where: { id: task.onboardingId },
      include: {
        tasks: true,
        user: true
      }
    });

    if (onboarding) {
      const mandatoryTasks = onboarding.tasks.filter(t => t.mandatory);
      const completedMandatory = mandatoryTasks.filter(t => t.completed);

      if (mandatoryTasks.length === completedMandatory.length) {
        await prisma.onboarding.update({
          where: { id: onboarding.id },
          data: {
            status: 'COMPLETED',
            actualEndDate: new Date()
          }
        });

        await prisma.user.update({
          where: { id: onboarding.userId },
          data: { status: 'ACTIVE' }
        });

        await sendEmail(
          onboarding.user.email,
          'Onboarding Completato!',
          `
            <h2>Congratulazioni ${onboarding.user.firstName}!</h2>
            <p>Hai completato con successo il processo di onboarding.</p>
            <p>Il tuo account è ora attivo.</p>
          `
        );
      }
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get singolo onboarding
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const onboarding = await prisma.onboarding.findUnique({
      where: { id },
      include: {
        user: true,
        manager: true,
        tasks: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!onboarding) {
      return res.status(404).json({ error: 'Onboarding non trovato' });
    }

    res.json(onboarding);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
