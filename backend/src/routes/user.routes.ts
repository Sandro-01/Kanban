import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
const prisma = new PrismaClient();

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
  jobTitle: true,
  phone: true,
  location: true,
  bio: true,
  status: true,
  allowedPages: true,
  avatarColor: true,
  avatarUrl: true,
  avatarConfig: true,
  theme: true,
  language: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET /api/users — list all active users (admin/manager only)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: USER_SELECT,
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      res.json(users);
    } catch (error: any) {
      console.error('Error loading users:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/users/all — all users regardless of status (admin only)
router.get(
  '/all',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/users/:id — get single user profile
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Non-admin users can only read their own profile
      if (req.user!.role === 'USER' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: USER_SELECT,
      });

      if (!user) return res.status(404).json({ error: 'Utente non trovato' });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/users/:id — update user profile / avatar
router.put(
  '/:id',
  authenticate,
  auditLog('UPDATE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Users can only edit their own profile; admins can edit anyone
      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }

      const {
        firstName,
        lastName,
        department,
        jobTitle,
        phone,
        location,
        bio,
        avatarColor,
        avatarUrl,
        avatarConfig,
        theme,
        language,
        // admin-only fields
        role,
        status,
        allowedPages,
      } = req.body;

      const data: any = {};
      if (firstName !== undefined) data.firstName = firstName;
      if (lastName !== undefined) data.lastName = lastName;
      if (department !== undefined) data.department = department;
      if (jobTitle !== undefined) data.jobTitle = jobTitle;
      if (phone !== undefined) data.phone = phone;
      if (location !== undefined) data.location = location;
      if (bio !== undefined) data.bio = bio;
      if (avatarColor !== undefined) data.avatarColor = avatarColor;
      if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
      if (avatarConfig !== undefined) data.avatarConfig = avatarConfig;
      if (theme !== undefined) data.theme = theme;
      if (language !== undefined) data.language = language;

      // Only admins can change these
      if (req.user!.role === 'ADMIN') {
        if (role !== undefined) data.role = role;
        if (status !== undefined) data.status = status;
        if (allowedPages !== undefined) data.allowedPages = allowedPages;
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: USER_SELECT,
      });

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/users/:id/avatar — update only avatar customization
router.put(
  '/:id/avatar',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }

      const { avatarColor, avatarConfig } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(avatarColor !== undefined && { avatarColor }),
          ...(avatarConfig !== undefined && { avatarConfig }),
        },
        select: USER_SELECT,
      });

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/users/:id — soft-disable user (admin only)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  auditLog('DEACTIVATE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (id === req.user!.id) {
        return res.status(400).json({ error: 'Non puoi disattivare il tuo account' });
      }

      await prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      res.json({ message: 'Utente disattivato' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
