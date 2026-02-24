import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
const prisma = new PrismaClient();

// Cast helper: prisma.user typed as any so the new fields compile before
// `npx prisma generate` has been run on the target machine.
const userRepo = prisma.user as any;

// ── Avatar colour palette (10 distinct colours) ───────────────────────────────
const AVATAR_PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#10b981', // green
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#84cc16', // lime
  '#f43f5e', // rose
];

function computeAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// ── Multer for avatar uploads ─────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, _file, cb) => {
    const ext = path.extname(_file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo immagini consentite'));
  },
});

// ── Fields returned for every user query ────────────────────────────────────
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
  status: true,
  allowedPages: true,
  avatarColor: true,
  avatarUrl: true,
  avatarConfig: true,
  createdAt: true,
  updatedAt: true,
};

// ── GET /users  (all active users — any authenticated user) ──────────────────
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await userRepo.findMany({
        select: USER_SELECT,
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ── GET /users/:id  (Admin only) ─────────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = await userRepo.findUnique({ where: { id }, select: USER_SELECT });
      if (!user) return res.status(404).json({ error: 'Utente non trovato' });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ── POST /users  (Admin only) ────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  auditLog('CREATE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, firstName, lastName, role, department, allowedPages } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Email, password, nome e cognome sono obbligatori',
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const avatarColor = computeAvatarColor(`${firstName} ${lastName}`);

      const user = await userRepo.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || 'USER',
          department: department || null,
          status: 'ACTIVE',
          allowedPages: Array.isArray(allowedPages) ? allowedPages : [],
          avatarColor,
        },
        select: USER_SELECT,
      });

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ── PUT /users/:id  (Admin only) ─────────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  auditLog('UPDATE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { email, password, firstName, lastName, role, department, status, allowedPages } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) return res.status(404).json({ error: 'Utente non trovato' });

      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) return res.status(400).json({ error: 'Email già in uso' });
      }

      const updateData: any = {};
      if (email) updateData.email = email;
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (role) updateData.role = role;
      if (department !== undefined) updateData.department = department || null;
      if (status) updateData.status = status;
      if (Array.isArray(allowedPages)) updateData.allowedPages = allowedPages;
      if (password) updateData.password = await bcrypt.hash(password, 10);

      // Recompute colour if name changed
      const newFirst = firstName || existingUser.firstName;
      const newLast  = lastName  || existingUser.lastName;
      if (firstName || lastName) {
        updateData.avatarColor = computeAvatarColor(`${newFirst} ${newLast}`);
      }

      const user = await userRepo.update({
        where: { id },
        data: updateData,
        select: USER_SELECT,
      });

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ── PUT /users/:id/avatar  (own user or Admin) ───────────────────────────────
router.put(
  '/:id/avatar',
  authenticate,
  uploadAvatar.single('avatar'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Nessun file caricato' });
      }

      // Delete old avatar file if present
      const existing = await userRepo.findUnique({ where: { id }, select: { avatarUrl: true } });
      if (existing?.avatarUrl) {
        const oldPath = path.join(__dirname, '../../../uploads', existing.avatarUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const avatarUrl = `avatars/${req.file.filename}`;
      const user = await userRepo.update({
        where: { id },
        data: { avatarUrl },
        select: USER_SELECT,
      });

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ── PUT /users/:id/avatar-config  (own user or Admin) ────────────────────────
router.put(
  '/:id/avatar-config',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      const { config } = req.body;
      if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'Configurazione avatar non valida' });
      }
      const user = await userRepo.update({
        where: { id },
        data: { avatarConfig: JSON.stringify(config) },
        select: USER_SELECT,
      });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ── DELETE /users/:id/avatar-config  (own user or Admin) ─────────────────────
router.delete(
  '/:id/avatar-config',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      const user = await userRepo.update({
        where: { id },
        data: { avatarConfig: null },
        select: USER_SELECT,
      });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ── DELETE /users/:id/avatar  (own user or Admin) ────────────────────────────
router.delete(
  '/:id/avatar',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }

      const existing = await userRepo.findUnique({ where: { id }, select: { avatarUrl: true } });
      if (existing?.avatarUrl) {
        const oldPath = path.join(__dirname, '../../../uploads', existing.avatarUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const user = await userRepo.update({
        where: { id },
        data: { avatarUrl: null },
        select: USER_SELECT,
      });

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ── DELETE /users/:id  (Admin only — soft delete) ────────────────────────────
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  auditLog('DELETE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) return res.status(404).json({ error: 'Utente non trovato' });

      if (id === req.user!.id) {
        return res.status(400).json({ error: 'Non puoi eliminare il tuo account' });
      }

      await prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
      res.json({ message: 'Utente eliminato con successo' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
