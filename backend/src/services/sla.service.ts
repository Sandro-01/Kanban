import { PrismaClient, Priority } from '@prisma/client';
import { notifyTicketUpdate } from './email.service';

const prisma = new PrismaClient();

/**
 * Calcola SLA per priorità
 */
export function getSLAHours(priority: Priority): number {
  const slaMap = {
    CRITICAL: parseInt(process.env.SLA_CRITICAL || '4'),
    HIGH: parseInt(process.env.SLA_HIGH || '24'),
    MEDIUM: parseInt(process.env.SLA_MEDIUM || '72'),
    LOW: parseInt(process.env.SLA_LOW || '168')
  };

  return slaMap[priority] || 24;
}

/**
 * Verifica violazioni SLA
 */
export async function checkSLAViolations() {
  const now = new Date();

  const tickets = await prisma.ticket.findMany({
    where: {
      status: {
        notIn: ['RESOLVED', 'CLOSED']
      },
      dueDate: {
        lt: now
      },
      slaViolated: false
    },
    include: {
      createdBy: true,
      assignedTo: true
    }
  });

  for (const ticket of tickets) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { slaViolated: true }
    });

    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        field: 'slaViolated',
        oldValue: 'false',
        newValue: 'true',
        changedBy: 'system'
      }
    });

    // Notifica violazione SLA
    await notifyTicketUpdate(
      ticket.id,
      'VIOLAZIONE SLA',
      `Il ticket ha superato il tempo SLA di ${ticket.slaHours} ore.`
    );
  }

  return tickets.length;
}

/**
 * Monitor SLA in tempo reale
 */
export async function getSLAMetrics() {
  const tickets = await prisma.ticket.findMany({
    where: {
      status: {
        notIn: ['RESOLVED', 'CLOSED']
      }
    }
  });

  const now = new Date();
  const metrics = {
    total: tickets.length,
    withinSLA: 0,
    nearingSLA: 0, // < 25% tempo rimasto
    violated: 0,
    byPriority: {
      CRITICAL: { total: 0, violated: 0 },
      HIGH: { total: 0, violated: 0 },
      MEDIUM: { total: 0, violated: 0 },
      LOW: { total: 0, violated: 0 }
    }
  };

  for (const ticket of tickets) {
    const timeRemaining = ticket.dueDate.getTime() - now.getTime();
    const totalTime = ticket.slaHours * 60 * 60 * 1000;

    metrics.byPriority[ticket.priority].total++;

    if (ticket.slaViolated || timeRemaining < 0) {
      metrics.violated++;
      metrics.byPriority[ticket.priority].violated++;
    } else if (timeRemaining < totalTime * 0.25) {
      metrics.nearingSLA++;
    } else {
      metrics.withinSLA++;
    }
  }

  return metrics;
}

/**
 * Start SLA monitor
 */
export function startSLAMonitor() {
  // Check ogni 15 minuti
  setInterval(async () => {
    try {
      const violations = await checkSLAViolations();
      if (violations > 0) {
        console.log(`⚠️  ${violations} violazioni SLA rilevate`);
      }
    } catch (error) {
      console.error('Errore nel monitor SLA:', error);
    }
  }, 15 * 60 * 1000);

  console.log('📊 SLA Monitor avviato');
}
