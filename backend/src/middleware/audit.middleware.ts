import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.middleware';

const prisma = new PrismaClient();

export const auditLog = (action: string, entity: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Log dopo il successo
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = body?.id || body?.data?.id || 'unknown';

        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            entity,
            entityId,
            changes: body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            isoStandard: ['ISO9001', 'ISO27001'],
            severity: getSeverity(action)
          }
        }).catch(console.error);
      }

      return originalJson(body);
    };

    next();
  };
};

function getSeverity(action: string): 'INFO' | 'WARNING' | 'CRITICAL' {
  if (action.includes('DELETE') || action.includes('REVOKE')) {
    return 'CRITICAL';
  }
  if (action.includes('UPDATE') || action.includes('ASSIGN')) {
    return 'WARNING';
  }
  return 'INFO';
}
