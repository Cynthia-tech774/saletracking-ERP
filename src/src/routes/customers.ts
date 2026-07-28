import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activity';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { search, page = '1', limit = '50' } = req.query;
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { company: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { _count: { select: { sales: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({ customers, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
});

router.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      sales: {
        orderBy: { saleDate: 'desc' },
        take: 20,
        include: { items: { include: { product: true } } },
      },
    },
  });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

router.post(
  '/',
  body('name').notEmpty(),
  body('email').isEmail(),
  body('phone').notEmpty(),
  body('address').notEmpty(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const customer = await prisma.customer.create({ data: req.body });
    await logActivity(req.userId!, 'CUSTOMER_CREATED', `Customer ${customer.name} created`);
    res.status(201).json(customer);
  }
);

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logActivity(req.userId!, 'CUSTOMER_UPDATED', `Customer ${customer.name} updated`);
    res.json(customer);
  } catch {
    res.status(404).json({ error: 'Customer not found' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const salesCount = await prisma.sale.count({ where: { customerId: req.params.id } });
  if (salesCount > 0) {
    return res.status(400).json({ error: 'Cannot delete customer with sales history' });
  }
  await prisma.customer.delete({ where: { id: req.params.id } });
  await logActivity(req.userId!, 'CUSTOMER_DELETED', `Customer deleted`);
  res.json({ message: 'Customer deleted' });
});

export default router;
