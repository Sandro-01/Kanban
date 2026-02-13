import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Get audit logs (solo ADMIN e AUDITOR)
router.get('/', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, entity, entityId, startDate, endDate, severity } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (severity) where.severity = severity;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 1000 // Limite per performance
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Report ISO compliance
router.get('/iso-report', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Statistiche
    const stats = {
      total: logs.length,
      byIsoStandard: {
        ISO9001: logs.filter((l: any) => l.isoStandard.includes('ISO9001')).length,
        ISO27001: logs.filter((l: any) => l.isoStandard.includes('ISO27001')).length
      },
      bySeverity: {
        INFO: logs.filter((l: any) => l.severity === 'INFO').length,
        WARNING: logs.filter((l: any) => l.severity === 'WARNING').length,
        CRITICAL: logs.filter((l: any) => l.severity === 'CRITICAL').length
      },
      byAction: logs.reduce((acc: any, log: any) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      byUser: logs.reduce((acc: any, log: any) => {
        const key = `${log.user.firstName} ${log.user.lastName}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      period: {
        start: startDate || 'all',
        end: endDate || 'now'
      },
      statistics: stats,
      logs: logs.slice(0, 100) // Prime 100 per il report
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export audit log (CSV per ISO compliance)
router.get('/export', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: true
      },
      orderBy: { timestamp: 'asc' }
    });

    // Genera CSV
    const csv = [
      'Timestamp,User,Email,Action,Entity,EntityID,Severity,ISO Standards,IP Address',
      ...logs.map((log: any) =>
        `${log.timestamp.toISOString()},${log.user.firstName} ${log.user.lastName},${log.user.email},${log.action},${log.entity},${log.entityId},${log.severity},"${log.isoStandard.join(',')}",${log.ipAddress || 'N/A'}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-log-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
