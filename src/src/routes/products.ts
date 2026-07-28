import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activity';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { search, category, lowStock, page = '1', limit = '50' } = req.query;
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { sku: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (lowStock === 'true') where.stock = { lt: 10 };

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ products, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
});

router.get('/categories', async (_req, res) => {
  const categories = await prisma.product.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  res.json(categories.map((c) => c.category));
});

router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post(
  '/',
  authorize(Role.ADMIN, Role.MANAGER),
  body('name').notEmpty(),
  body('sku').notEmpty(),
  body('category').notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('cost').isFloat({ min: 0 }),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const product = await prisma.product.create({ data: req.body });
      await logActivity(req.userId!, 'PRODUCT_CREATED', `Product ${product.name} created`);
      res.status(201).json(product);
    } catch {
      res.status(400).json({ error: 'SKU already exists' });
    }
  }
);

router.put('/:id', authorize(Role.ADMIN, Role.MANAGER), async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logActivity(req.userId!, 'PRODUCT_UPDATED', `Product ${product.name} updated`);
    res.json(product);
  } catch {
    res.status(404).json({ error: 'Product not found' });
  }
});

router.patch('/:id/stock', authorize(Role.ADMIN, Role.MANAGER), async (req: AuthRequest, res) => {
  const { adjustment, reason } = req.body;
  if (typeof adjustment !== 'number') {
    return res.status(400).json({ error: 'adjustment must be a number' });
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { stock: { increment: adjustment } },
  });

  await logActivity(
    req.userId!,
    'STOCK_ADJUSTED',
    `Stock for ${product.name}: ${adjustment > 0 ? '+' : ''}${adjustment}. ${reason || ''}`
  );
  res.json(product);
});

router.delete('/:id', authorize(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    await logActivity(req.userId!, 'PRODUCT_DELETED', `Product ${req.params.id} deleted`);
    res.json({ message: 'Product deleted' });
  } catch {
    res.status(400).json({ error: 'Cannot delete product with sales history' });
  }
});

export default router;
