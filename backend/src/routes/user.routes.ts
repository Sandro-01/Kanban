import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
const prisma = new PrismaClient();

// Cast helper: prisma.user typed as any so the new allowedPages field
// compiles before `npx prisma generate` has been run on the target machine.
// After running `prisma generate` these casts can be removed.
const userRepo = prisma.user as any;

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
  status: true,
  allowedPages: true,
  createdAt: true,
  updatedAt: true,
};

// Get all users (All authenticated users can see this for ticket assignment)
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await userRepo.findMany({
        select: USER_SELECT,
        where: {
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get single user by ID (Admin only)
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const user = await userRepo.findUnique({
        where: { id },
        select: USER_SELECT,
      });

      if (!user) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create new user (Admin only)
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
          error: 'Email, password, nome e cognome sono obbligatori'
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

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
        },
        select: USER_SELECT,
      });

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update user (Admin only)
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
      if (!existingUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) {
          return res.status(400).json({ error: 'Email già in uso' });
        }
      }

      const updateData: any = {};

      if (email) updateData.email = email;
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (role) updateData.role = role;
      if (department !== undefined) updateData.department = department || null;
      if (status) updateData.status = status;
      if (Array.isArray(allowedPages)) updateData.allowedPages = allowedPages;

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
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

// Delete user (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  auditLog('DELETE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      if (id === req.user!.id) {
        return res.status(400).json({
          error: 'Non puoi eliminare il tuo account'
        });
      }

      // Soft delete
      await prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' }
      });

      res.json({ message: 'Utente eliminato con successo' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
