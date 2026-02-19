import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/notifications — lista notifiche dell'utente corrente
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 30;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread === 'true';

    const whereClause = unreadOnly
      ? `WHERE "userId" = $1 AND "read" = false`
      : `WHERE "userId" = $1`;

    const notifications: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Notification" ${whereClause} ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
      userId, limit, offset
    );

    const countResult: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "Notification" WHERE "userId" = $1 AND "read" = false`,
      userId
    );

    res.json({
      notifications,
      unreadCount: parseInt(countResult[0]?.total || '0'),
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/count — conteggio non lette
router.get('/count', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const result: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "Notification" WHERE "userId" = $1 AND "read" = false`,
      userId
    );
    res.json({ unreadCount: parseInt(result[0]?.total || '0') });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:id/read — segna come letta
router.put('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Notification" SET "read" = true WHERE "id" = $1 AND "userId" = $2`,
      req.params.id, req.user!.id
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read-all — segna tutte come lette
router.put('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Notification" SET "read" = true WHERE "userId" = $1 AND "read" = false`,
      req.user!.id
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
