import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, authorize, authorizeDepartment } from '../middleware/auth.middleware';
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

// Lista onboarding (accessibile a HR, IT, Amministrazione)
router.get('/', authenticate, authorizeDepartment('HR', 'IT', 'Amministrazione'), async (req: AuthRequest, res: Response) => {
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

// Crea processo onboarding (HR può creare, Responsabile può aggiungere dotazioni)
router.post('/', authenticate, authorizeDepartment('HR', 'IT', 'Amministrazione'), auditLog('CREATE_ONBOARDING', 'Onboarding'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      employeeFirstName,
      employeeLastName,
      employeeEmail,
      managerId,
      startDate,
      expectedEndDate,
      expectedDays,
      // Informazioni dipendente
      sede,
      department,
      role,
      // Dotazioni hardware
      computerType,
      phoneType,
      needsHeadset,
      needsWebcam,
      additionalMonitor,
      // Software e accessi
      needsMicrosoft365,
      softwareNeeded,
      systemAccess,
      // Note
      additionalNotes
    } = req.body;

    // Validazione campi obbligatori
    if (!employeeFirstName || !employeeLastName || !employeeEmail) {
      return res.status(400).json({ error: 'Nome, cognome ed email del dipendente sono obbligatori' });
    }

    // Calcola data fine se non fornita (null = contratto indeterminato)
    let finalExpectedEndDate: Date | null = null;
    if (expectedEndDate) {
      finalExpectedEndDate = new Date(expectedEndDate);
    } else if (expectedDays) {
      finalExpectedEndDate = new Date();
      finalExpectedEndDate.setDate(finalExpectedEndDate.getDate() + expectedDays);
    }

    // Usa managerId dal body se fornito, altrimenti usa l'utente corrente
    const finalManagerId = managerId || req.user!.id;

    const onboarding = await prisma.onboarding.create({
      data: {
        employeeFirstName,
        employeeLastName,
        employeeEmail,
        managerId: finalManagerId,
        startDate: startDate ? new Date(startDate) : new Date(),
        expectedEndDate: finalExpectedEndDate as any,
        // Informazioni dipendente
        sede,
        department,
        role,
        // Dotazioni hardware
        computerType,
        phoneType,
        needsHeadset: needsHeadset || false,
        needsWebcam: needsWebcam || false,
        additionalMonitor: additionalMonitor || false,
        // Software e accessi
        needsMicrosoft365: needsMicrosoft365 || false,
        softwareNeeded,
        systemAccess,
        // Note
        additionalNotes,
        tasks: {
          create: DEFAULT_ONBOARDING_TASKS
        }
      },
      include: {
        manager: true,
        tasks: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // Prepara riepilogo dotazioni per email
    let equipmentSummary = '';
    if (computerType || phoneType || needsHeadset || needsWebcam || additionalMonitor) {
      equipmentSummary = '<h3>Dotazioni Assegnate:</h3><ul>';
      if (computerType && computerType !== 'Non necessario') equipmentSummary += `<li>💻 Computer: ${computerType}</li>`;
      if (phoneType && phoneType !== 'Non necessario') equipmentSummary += `<li>📱 Telefono: ${phoneType}</li>`;
      if (needsHeadset) equipmentSummary += '<li>🎧 Cuffie</li>';
      if (needsWebcam) equipmentSummary += '<li>📹 Webcam</li>';
      if (additionalMonitor) equipmentSummary += '<li>🖥️ Schermo aggiuntivo</li>';
      equipmentSummary += '</ul>';
    }

    let softwareSummary = '';
    if (needsMicrosoft365 || softwareNeeded || systemAccess) {
      softwareSummary = '<h3>Software e Accessi:</h3><ul>';
      if (needsMicrosoft365) softwareSummary += '<li>📦 Microsoft 365</li>';
      if (softwareNeeded) softwareSummary += `<li>💿 Software: ${softwareNeeded}</li>`;
      if (systemAccess) softwareSummary += `<li>🔐 Accessi: ${systemAccess}</li>`;
      softwareSummary += '</ul>';
    }

    // Invia email benvenuto al nuovo dipendente (opzionale - non blocca se fallisce)
    try {
      await sendEmail(
        employeeEmail,
        'Benvenuto - Processo di Onboarding',
        `
          <h2>Benvenuto ${employeeFirstName}!</h2>
          <p>È stato avviato il tuo processo di onboarding.</p>
          <p><strong>Responsabile:</strong> ${(onboarding as any).manager.firstName} ${(onboarding as any).manager.lastName}</p>
          ${sede ? `<p><strong>Sede:</strong> ${sede}</p>` : ''}
          ${department ? `<p><strong>Reparto:</strong> ${department}</p>` : ''}
          ${role ? `<p><strong>Ruolo:</strong> ${role}</p>` : ''}
          <p><strong>Data inizio:</strong> ${(startDate ? new Date(startDate) : new Date()).toLocaleDateString('it-IT')}</p>
          ${finalExpectedEndDate ? `<p><strong>Data prevista completamento:</strong> ${finalExpectedEndDate.toLocaleDateString('it-IT')}</p>` : '<p><strong>Contratto:</strong> Indeterminato</p>'}
          ${equipmentSummary}
          ${softwareSummary}
          ${additionalNotes ? `<p><strong>Note:</strong> ${additionalNotes}</p>` : ''}
          <p>Riceverai aggiornamenti durante il processo.</p>
        `
      );
    } catch (emailError: any) {
      console.warn('⚠️ Impossibile inviare email di benvenuto:', emailError.message);
      // Continua comunque - l'email è opzionale
    }

    // NOTA: Il ticket IT verrà creato solo quando il responsabile aggiungerà le dotazioni
    // (workflow 2 step: HR crea → Responsabile aggiunge dotazioni → IT riceve ticket)

    // CREA TICKET KANBAN PER IL MANAGER per compilare le dotazioni
    try {
      const board = await prisma.board.findFirst({
        where: { name: 'Main Board' },
        include: { columns: true }
      });

      if (board) {
        const todoColumn = board.columns.find(col => col.name === 'To Do') || board.columns[0];

        let managerTicketDescription = `**ONBOARDING: Compila le dotazioni per il nuovo dipendente**\n\n`;
        managerTicketDescription += `**Dipendente:** ${employeeFirstName} ${employeeLastName}\n`;
        managerTicketDescription += `**Email:** ${employeeEmail}\n`;
        if (sede) managerTicketDescription += `**Sede:** ${sede}\n`;
        if (department) managerTicketDescription += `**Reparto:** ${department}\n`;
        if (role) managerTicketDescription += `**Ruolo:** ${role}\n`;
        managerTicketDescription += `**Data Inizio:** ${(startDate ? new Date(startDate) : new Date()).toLocaleDateString('it-IT')}\n`;
        managerTicketDescription += finalExpectedEndDate ? `**Scadenza:** ${finalExpectedEndDate.toLocaleDateString('it-IT')}\n\n` : `**Contratto:** Indeterminato\n\n`;
        managerTicketDescription += `---\n`;
        managerTicketDescription += `Apri questo ticket e compila la sezione dotazioni (hardware, software, accessi).\n`;
        managerTicketDescription += `Una volta salvate, IT riceverà automaticamente un ticket con tutti i dettagli.\n\n`;
        managerTicketDescription += `[ONBOARDING_ID:${onboarding.id}]`;

        await prisma.ticket.create({
          data: {
            title: `📋 Onboarding ${employeeFirstName} ${employeeLastName} - Compila Dotazioni`,
            description: managerTicketDescription,
            boardId: board.id,
            columnId: todoColumn.id,
            createdById: req.user!.id,
            assignedToId: finalManagerId,
            priority: 'HIGH',
            category: 'Onboarding - Dotazioni',
            slaHours: 48,
            dueDate: finalExpectedEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        console.log(`✅ Ticket per manager creato per onboarding ${onboarding.id}`);
      }
    } catch (ticketError: any) {
      console.warn('⚠️ Impossibile creare ticket per manager:', ticketError.message);
    }

    res.json(onboarding);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Aggiungi dotazioni onboarding (Responsabile - STEP 2)
// Il Manager assegnato, HR, IT, Amministrazione e ADMIN possono compilare le dotazioni
router.put('/:id/equipment', authenticate, auditLog('ADD_EQUIPMENT_ONBOARDING', 'Onboarding'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      computerType,
      phoneType,
      needsHeadset,
      needsWebcam,
      additionalMonitor,
      needsMicrosoft365,
      softwareNeeded,
      systemAccess,
      additionalNotes
    } = req.body;

    // Recupera onboarding
    const onboarding = await prisma.onboarding.findUnique({
      where: { id },
      include: { manager: true }
    });

    if (!onboarding) {
      return res.status(404).json({ error: 'Onboarding non trovato' });
    }

    // Verifica permessi: ADMIN, Manager assegnato, o reparti HR/IT/Amministrazione
    const isAdmin = req.user!.role === 'ADMIN';
    const isAssignedManager = req.user!.id === onboarding.managerId;
    const isAuthorizedDept = req.user!.department && ['HR', 'IT', 'Amministrazione'].includes(req.user!.department);

    if (!isAdmin && !isAssignedManager && !isAuthorizedDept) {
      return res.status(403).json({ error: 'Accesso negato - solo il Manager assegnato o reparti autorizzati possono compilare le dotazioni' });
    }

    // Verifica che sia in stato PENDING_EQUIPMENT
    if (onboarding.status !== 'PENDING_EQUIPMENT') {
      return res.status(400).json({ error: 'Le dotazioni possono essere aggiunte solo per onboarding in stato PENDING_EQUIPMENT' });
    }

    // Aggiorna onboarding con dotazioni e cambia status a IN_PROGRESS
    const updatedOnboarding = await prisma.onboarding.update({
      where: { id },
      data: {
        computerType,
        phoneType,
        needsHeadset: needsHeadset || false,
        needsWebcam: needsWebcam || false,
        additionalMonitor: additionalMonitor || false,
        needsMicrosoft365: needsMicrosoft365 || false,
        softwareNeeded,
        systemAccess,
        additionalNotes,
        status: 'IN_PROGRESS' // Cambia status a IN_PROGRESS
      },
      include: {
        manager: true,
        tasks: { orderBy: { order: 'asc' } }
      }
    });

    // CREA TICKET AUTOMATICO PER IT CON RICHIESTA DOTAZIONI
    // Trova il board principale e la colonna "To Do"
    const board = await prisma.board.findFirst({
      where: { name: 'Main Board' },
      include: { columns: true }
    });

    if (board) {
      const todoColumn = board.columns.find(col => col.name === 'To Do') || board.columns[0];

      // Prepara descrizione dettagliata per il ticket
      let ticketDescription = `**RICHIESTA DOTAZIONI PER NUOVO DIPENDENTE**\n\n`;
      ticketDescription += `**Dipendente:** ${updatedOnboarding.employeeFirstName} ${updatedOnboarding.employeeLastName} (${updatedOnboarding.employeeEmail})\n`;
      ticketDescription += `**Responsabile:** ${updatedOnboarding.manager.firstName} ${updatedOnboarding.manager.lastName}\n`;
      if (updatedOnboarding.sede) ticketDescription += `**Sede:** ${updatedOnboarding.sede}\n`;
      if (updatedOnboarding.department) ticketDescription += `**Reparto:** ${updatedOnboarding.department}\n`;
      if (updatedOnboarding.role) ticketDescription += `**Ruolo:** ${updatedOnboarding.role}\n`;
      ticketDescription += `**Data Inizio:** ${new Date(updatedOnboarding.startDate).toLocaleDateString('it-IT')}\n\n`;

      // Dotazioni hardware
      if (computerType || phoneType || needsHeadset || needsWebcam || additionalMonitor) {
        ticketDescription += `---\n## 💻 DOTAZIONI HARDWARE RICHIESTE\n\n`;
        if (computerType && computerType !== 'Non necessario') ticketDescription += `- **Computer:** ${computerType}\n`;
        if (phoneType && phoneType !== 'Non necessario') ticketDescription += `- **Telefono:** ${phoneType}\n`;
        if (needsHeadset) ticketDescription += `- ✅ Cuffie\n`;
        if (needsWebcam) ticketDescription += `- ✅ Webcam\n`;
        if (additionalMonitor) ticketDescription += `- ✅ Schermo aggiuntivo\n`;
        ticketDescription += `\n`;
      }

      // Software e accessi
      if (needsMicrosoft365 || softwareNeeded || systemAccess) {
        ticketDescription += `---\n## 🔐 SOFTWARE E ACCESSI RICHIESTI\n\n`;
        if (needsMicrosoft365) ticketDescription += `- ✅ Pacchetto Microsoft 365\n`;
        if (softwareNeeded) ticketDescription += `- **Software Specifici:** ${softwareNeeded}\n`;
        if (systemAccess) ticketDescription += `- **Accessi Sistemi:** ${systemAccess}\n`;
        ticketDescription += `\n`;
      }

      // Note aggiuntive
      if (additionalNotes) {
        ticketDescription += `---\n## 📝 NOTE AGGIUNTIVE\n\n${additionalNotes}\n\n`;
      }

      ticketDescription += updatedOnboarding.expectedEndDate
        ? `---\n⚠️ **Preparare tutto entro il:** ${new Date(updatedOnboarding.expectedEndDate).toLocaleDateString('it-IT')}\n`
        : '';
      ticketDescription += `🔗 **Link Onboarding:** #${updatedOnboarding.id}`;

      // Crea il ticket assegnato al reparto IT
      const ticket = await prisma.ticket.create({
        data: {
          title: `🆕 Onboarding: ${updatedOnboarding.employeeFirstName} ${updatedOnboarding.employeeLastName} - Preparazione Dotazioni`,
          description: ticketDescription,
          boardId: board.id,
          columnId: todoColumn.id,
          createdById: req.user!.id,
          assignedDepartments: ['IT'], // Assegna automaticamente a IT
          priority: 'HIGH',
          category: 'Richiesta Onboarding',
          slaHours: 24,
          dueDate: updatedOnboarding.expectedEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      console.log(`✅ Ticket automatico creato per onboarding ${updatedOnboarding.id}: ${ticket.id}`);
    }

    // Chiudi automaticamente il ticket del manager (dotazioni compilate)
    try {
      const managerTickets = await prisma.ticket.findMany({
        where: {
          category: 'Onboarding - Dotazioni',
          description: { contains: `[ONBOARDING_ID:${id}]` }
        }
      });

      for (const mt of managerTickets) {
        // Trova la colonna "Done" o l'ultima colonna
        const ticketBoard = await prisma.board.findUnique({
          where: { id: mt.boardId },
          include: { columns: { orderBy: { order: 'asc' } } }
        });
        const doneColumn = ticketBoard?.columns.find(c => c.name === 'Done') || ticketBoard?.columns[ticketBoard.columns.length - 1];

        await prisma.ticket.update({
          where: { id: mt.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            columnId: doneColumn?.id || mt.columnId
          }
        });
        console.log(`✅ Ticket manager ${mt.id} risolto automaticamente`);
      }
    } catch (resolveError: any) {
      console.warn('⚠️ Impossibile risolvere ticket manager:', resolveError.message);
    }

    res.json(updatedOnboarding);
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
      const mandatoryTasks = onboarding.tasks.filter((t: any) => t.mandatory);
      const completedMandatory = mandatoryTasks.filter((t: any) => t.completed);

      if (mandatoryTasks.length === completedMandatory.length) {
        await prisma.onboarding.update({
          where: { id: onboarding.id },
          data: {
            status: 'COMPLETED',
            actualEndDate: new Date()
          }
        });

        // Aggiorna status utente solo se esiste un account collegato
        if (onboarding.userId) {
          await prisma.user.update({
            where: { id: onboarding.userId },
            data: { status: 'ACTIVE' }
          });
        }

        // Invia email di completamento (opzionale - non blocca se fallisce)
        const recipientEmail = onboarding.user?.email || onboarding.employeeEmail;
        const recipientName = onboarding.user?.firstName || onboarding.employeeFirstName;

        try {
          await sendEmail(
            recipientEmail,
            'Onboarding Completato!',
            `
              <h2>Congratulazioni ${recipientName}!</h2>
              <p>Hai completato con successo il processo di onboarding.</p>
              <p>Il tuo account è ora attivo.</p>
            `
          );
        } catch (emailError: any) {
          console.warn('⚠️ Impossibile inviare email di completamento:', emailError.message);
          // Continua comunque - l'email è opzionale
        }
      }
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Aggiorna informazioni di base onboarding (HR e ADMIN)
router.put('/:id/info', authenticate, auditLog('UPDATE_ONBOARDING_INFO', 'Onboarding'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      employeeFirstName,
      employeeLastName,
      employeeEmail,
      managerId,
      startDate,
      expectedEndDate,
      sede,
      department,
      role
    } = req.body;

    // Solo HR e ADMIN possono modificare le info di base
    const isAdmin = req.user!.role === 'ADMIN';
    const isHR = req.user!.department === 'HR';
    if (!isAdmin && !isHR) {
      return res.status(403).json({ error: 'Solo HR e ADMIN possono modificare le informazioni di base' });
    }

    const onboarding = await prisma.onboarding.findUnique({ where: { id } });
    if (!onboarding) {
      return res.status(404).json({ error: 'Onboarding non trovato' });
    }

    const updateData: any = {};
    if (employeeFirstName !== undefined) updateData.employeeFirstName = employeeFirstName;
    if (employeeLastName !== undefined) updateData.employeeLastName = employeeLastName;
    if (employeeEmail !== undefined) updateData.employeeEmail = employeeEmail;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (expectedEndDate !== undefined) updateData.expectedEndDate = expectedEndDate ? new Date(expectedEndDate) : null;
    if (sede !== undefined) updateData.sede = sede;
    if (department !== undefined) updateData.department = department;
    if (role !== undefined) updateData.role = role;

    const updated = await prisma.onboarding.update({
      where: { id },
      data: updateData,
      include: {
        manager: true,
        tasks: { orderBy: { order: 'asc' } }
      }
    });

    res.json(updated);
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

// Elimina onboarding (solo ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), auditLog('DELETE_ONBOARDING', 'Onboarding'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const onboarding = await prisma.onboarding.findUnique({
      where: { id },
      include: { tasks: true }
    });

    if (!onboarding) {
      return res.status(404).json({ error: 'Onboarding non trovato' });
    }

    // Elimina tutte le task associate (cascade)
    await prisma.onboarding.delete({
      where: { id }
    });

    res.json({ message: 'Onboarding eliminato con successo' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
