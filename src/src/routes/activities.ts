import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize(Role.ADMIN, Role.MANAGER));

router.get('/', async (req, res) => {
  const { page = '1', limit = '50' } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.activity.count(),
  ]);

  res.json({ activities, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
});

export default router;
