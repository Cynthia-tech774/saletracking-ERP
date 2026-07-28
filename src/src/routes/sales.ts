import { Router } from 'express';
import { PaymentMethod, SaleStatus } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateInvoiceNo } from '../utils/invoice';
import { logActivity } from '../utils/activity';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  body('customerId').notEmpty(),
  body('items').isArray({ min: 1 }),
  body('paymentMethod').isIn(Object.values(PaymentMethod)),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerId, items, discount = 0, tax = 0, notes, paymentMethod, status } = req.body;

    try {
      const sale = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
          throw new Error('Customer not found');
        }

        let subtotal = 0;
        const saleItems: {
          productId: string;
          quantity: number;
          unitPrice: number;
          total: number;
        }[] = [];

        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
          }

          const lineTotal = product.price * item.quantity;
          subtotal += lineTotal;
          saleItems.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
            total: lineTotal,
          });
        }

        const grandTotal = subtotal + tax - discount;
        const invoiceNo = generateInvoiceNo();
        const saleStatus = status || SaleStatus.COMPLETED;

        if (saleStatus === SaleStatus.COMPLETED) {
          for (const item of items) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product || product.stock < item.quantity) {
              throw new Error(`Insufficient stock for ${product?.name || item.productId}`);
            }
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }

        const newSale = await tx.sale.create({
          data: {
            invoiceNo,
            customerId,
            userId: req.userId!,
            total: subtotal,
            tax,
            discount,
            grandTotal,
            notes,
            paymentMethod,
            status: saleStatus,
            items: { create: saleItems },
          },
          include: {
            items: { include: { product: true } },
            customer: true,
            user: { select: { id: true, name: true, email: true } },
          },
        });

        if (saleStatus === SaleStatus.COMPLETED) {
          await tx.customer.update({
            where: { id: customerId },
            data: { totalSpent: { increment: grandTotal } },
          });
        }

        return newSale;
      });

      await logActivity(
        req.userId!,
        'SALE_CREATED',
        `Sale ${sale.invoiceNo} created for $${sale.grandTotal.toFixed(2)}`
      );

      res.status(201).json(sale);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create sale';
      const status = message.includes('not found') || message.includes('Insufficient') ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }
);

router.get('/', async (req, res) => {
  const { startDate, endDate, status, customerId, page = '1', limit = '10', search } = req.query;

  const where: Record<string, unknown> = {};

  if (startDate && endDate) {
    where.saleDate = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (search) {
    where.OR = [
      { invoiceNo: { contains: search as string, mode: 'insensitive' } },
      { customer: { name: { contains: search as string, mode: 'insensitive' } } },
    ];
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
      orderBy: { saleDate: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.sale.count({ where }),
  ]);

  res.json({
    sales,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

router.get('/:id', async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } },
    },
  });

  if (!sale) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  res.json(sale);
});

router.patch('/:id/status', async (req: AuthRequest, res) => {
  const { status } = req.body as { status: SaleStatus };

  if (!Object.values(SaleStatus).includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });

      if (!existing) {
        throw new Error('Sale not found');
      }

      const wasCompleted = existing.status === SaleStatus.COMPLETED;
      const willBeCompleted = status === SaleStatus.COMPLETED;
      const isReversal =
        wasCompleted && (status === SaleStatus.CANCELLED || status === SaleStatus.REFUNDED);

      if (isReversal) {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { totalSpent: { decrement: existing.grandTotal } },
        });
      } else if (!wasCompleted && willBeCompleted && existing.status !== SaleStatus.CANCELLED) {
        for (const item of existing.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.stock < item.quantity) {
            throw new Error(`Insufficient stock to complete sale`);
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { totalSpent: { increment: existing.grandTotal } },
        });
      }

      return tx.sale.update({
        where: { id: req.params.id },
        data: { status },
        include: { customer: true, items: { include: { product: true } } },
      });
    });

    await logActivity(req.userId!, 'SALE_STATUS', `Sale ${sale.invoiceNo} status → ${status}`);
    res.json(sale);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update status';
    res.status(400).json({ error: message });
  }
});

export default router;
