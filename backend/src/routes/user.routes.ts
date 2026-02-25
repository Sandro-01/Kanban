import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
const prisma = new PrismaClient();

// Avatar photo upload
const avatarStorage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = path.join(__dirname, '../../../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const SAFE_USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true, role: true,
  status: true, avatarUrl: true, avatarConfig: true, avatarColor: true,
  department: true, jobTitle: true, phone: true, location: true,
  bio: true, theme: true, language: true, createdAt: true,
};

// GET /users  – list all (active users visible to authenticated users)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: SAFE_USER_SELECT,
      orderBy: { firstName: 'asc' },
    });
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /users/all  – all users including inactive (admin only)
router.get('/all', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({ select: SAFE_USER_SELECT, orderBy: { createdAt: 'desc' } });
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /users/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: SAFE_USER_SELECT });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /users/:id  – update profile (own profile or admin)
router.put('/:id', authenticate, auditLog('UPDATE_USER', 'User'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const { firstName, lastName, department, jobTitle, phone, location, bio, avatarColor, avatarConfig, theme, language } = req.body;

    const data: any = {};
    if (firstName   !== undefined) data.firstName   = firstName;
    if (lastName    !== undefined) data.lastName     = lastName;
    if (department  !== undefined) data.department   = department;
    if (jobTitle    !== undefined) data.jobTitle     = jobTitle;
    if (phone       !== undefined) data.phone        = phone;
    if (location    !== undefined) data.location     = location;
    if (bio         !== undefined) data.bio          = bio;
    if (avatarColor !== undefined) data.avatarColor  = avatarColor;
    if (avatarConfig !== undefined) data.avatarConfig = typeof avatarConfig === 'object'
      ? JSON.stringify(avatarConfig)
      : avatarConfig;
    if (theme    !== undefined) data.theme    = theme;
    if (language !== undefined) data.language = language;

    const user = await prisma.user.update({ where: { id }, data, select: SAFE_USER_SELECT });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /users/:id/avatar  – upload photo
router.put('/:id/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });

    // Delete old avatar file if present
    const existing = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
    if (existing?.avatarUrl) {
      const oldPath = path.join(__dirname, '../../../uploads/avatars', existing.avatarUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `avatars/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id },
      data: { avatarUrl, avatarConfig: null },
      select: SAFE_USER_SELECT,
    });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /users/:id/avatar  – remove photo
router.delete('/:id/avatar', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
    if (existing?.avatarUrl) {
      const filePath = path.join(__dirname, '../../../uploads/avatars', existing.avatarUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { avatarUrl: null },
      select: SAFE_USER_SELECT,
    });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /users/:id/avatar-config  – save SVG avatar config
router.put('/:id/avatar-config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const { config } = req.body;
    const avatarConfig = typeof config === 'object' ? JSON.stringify(config) : config;

    const user = await prisma.user.update({
      where: { id },
      data: { avatarConfig, avatarUrl: null },
      select: SAFE_USER_SELECT,
    });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /users/:id/avatar-config  – remove SVG avatar
router.delete('/:id/avatar-config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { avatarConfig: null },
      select: SAFE_USER_SELECT,
    });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /users/:id  – deactivate user (admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), auditLog('DEACTIVATE_USER', 'User'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'INACTIVE' },
      select: SAFE_USER_SELECT,
    });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
