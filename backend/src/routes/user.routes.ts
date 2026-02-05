import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
const prisma = new PrismaClient();

// Get all users (All authenticated users can see this for ticket assignment)
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        where: {
          status: 'ACTIVE', // Only show active users
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

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
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
      const { email, password, firstName, lastName, role, department } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Email, password, nome e cognome sono obbligatori'
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email già registrata' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
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
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          status: true,
          createdAt: true,
        },
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
      const { email, password, firstName, lastName, role, department, status } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      // Check if email is being changed and if it's already in use
      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email }
        });

        if (emailExists) {
          return res.status(400).json({ error: 'Email già in uso' });
        }
      }

      // Build update data
      const updateData: any = {};

      if (email) updateData.email = email;
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (role) updateData.role = role;
      if (department !== undefined) updateData.department = department || null;
      if (status) updateData.status = status;

      // Hash password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      // Update user
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
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

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      // Prevent deleting yourself
      if (id === req.user!.id) {
        return res.status(400).json({
          error: 'Non puoi eliminare il tuo account'
        });
      }

      // Delete user (soft delete by setting status to INACTIVE)
      await prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      res.json({ message: 'Utente eliminato con successo' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
