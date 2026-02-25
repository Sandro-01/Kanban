import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma } from '@prisma/client';
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

// GET /api/users — all active users (any authenticated user, for ticket assignment)
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
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

// GET /api/users/:id — own profile or admin
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
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

// POST /api/users — create user (admin only)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  auditLog('CREATE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, firstName, lastName, role, department } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Email, password, nome e cognome sono obbligatori'
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email già registrata' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || 'USER',
          department: department || null,
          status: 'ACTIVE',
        },
        select: USER_SELECT,
      });

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/users/:id — update profile (own profile or admin)
router.put(
  '/:id',
  authenticate,
  auditLog('UPDATE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      const {
        email,
        password,
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

      // Admin-only fields
      if (req.user!.role === 'ADMIN') {
        if (email !== undefined) {
          if (email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({ where: { email } });
            if (emailExists) return res.status(400).json({ error: 'Email già in uso' });
          }
          data.email = email;
        }
        if (role !== undefined) data.role = role;
        if (status !== undefined) data.status = status;
        if (allowedPages !== undefined) data.allowedPages = allowedPages;
        if (password) data.password = await bcrypt.hash(password, 10);
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

// PUT /api/users/:id/avatar-config — save avatar config (own or admin)
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
      const user = await prisma.user.update({
        where: { id },
        data: { avatarConfig: config as Prisma.InputJsonValue, avatarUrl: null },
        select: USER_SELECT,
      });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/users/:id/avatar — remove avatar (own or admin)
router.delete(
  '/:id/avatar',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      const user = await prisma.user.update({
        where: { id },
        data: { avatarUrl: null, avatarConfig: Prisma.JsonNull },
        select: USER_SELECT,
      });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/users/:id/avatar-config — remove avatar config (own or admin)
router.delete(
  '/:id/avatar-config',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      const user = await prisma.user.update({
        where: { id },
        data: { avatarConfig: Prisma.JsonNull, avatarUrl: null },
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
