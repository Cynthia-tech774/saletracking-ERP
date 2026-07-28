import { Router } from 'express';
import { SaleStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

router.get('/', async (_req, res) => {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const completed = { status: SaleStatus.COMPLETED };

  const [
    totalSales,
    totalCustomers,
    totalProducts,
    lowStockProducts,
    todaySales,
    weeklySalesRaw,
    monthlySalesRaw,
    recentSales,
    topProducts,
    salesByStatus,
    pendingSales,
  ] = await Promise.all([
    prisma.sale.aggregate({ _sum: { grandTotal: true }, where: completed }),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.product.findMany({
      where: { stock: { lt: 10 } },
      orderBy: { stock: 'asc' },
      take: 10,
    }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      _count: true,
      where: { saleDate: { gte: dayStart }, ...completed },
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: weekStart }, ...completed },
      select: { saleDate: true, grandTotal: true },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: monthStart }, ...completed },
      select: { saleDate: true, grandTotal: true },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.sale.findMany({
      take: 10,
      orderBy: { saleDate: 'desc' },
      include: { customer: true, user: { select: { name: true } } },
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.sale.groupBy({ by: ['status'], _count: true }),
    prisma.sale.count({ where: { status: SaleStatus.PENDING } }),
  ]);

  const aggregateByDay = (sales: { saleDate: Date; grandTotal: number }[]) => {
    const map = new Map<string, number>();
    for (const s of sales) {
      const key = s.saleDate.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + s.grandTotal);
    }
    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));
  };

  const topProductsWithDetails = await Promise.all(
    topProducts.map(async (item) => {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      return {
        ...product,
        totalSold: item._sum.quantity || 0,
        revenue: item._sum.total || 0,
      };
    })
  );

  const profitEstimate = await prisma.saleItem.findMany({
    where: { sale: completed },
    include: { product: { select: { cost: true } } },
  });
  let estimatedProfit = 0;
  for (const item of profitEstimate) {
    estimatedProfit += item.total - item.product.cost * item.quantity;
  }

  res.json({
    metrics: {
      totalRevenue: totalSales._sum.grandTotal || 0,
      totalCustomers,
      totalProducts,
      lowStockCount: lowStockProducts.length,
      pendingSales,
      estimatedProfit,
    },
    today: {
      revenue: todaySales._sum.grandTotal || 0,
      salesCount: todaySales._count || 0,
    },
    charts: {
      weeklySales: aggregateByDay(weeklySalesRaw),
      monthlySales: aggregateByDay(monthlySalesRaw),
    },
    recentSales,
    topProducts: topProductsWithDetails.filter(Boolean),
    lowStockProducts,
    salesByStatus,
  });
});

export default router;
