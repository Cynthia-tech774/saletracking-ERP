import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

router.patch('/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json(user);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: 'User deleted' });
});

export default router;
