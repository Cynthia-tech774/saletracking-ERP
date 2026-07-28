import { Router } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { SaleStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function parseDateRange(startDate?: string, endDate?: string) {
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

router.get('/summary', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate as string, endDate as string);

  const where = {
    saleDate: { gte: start, lte: end },
    status: SaleStatus.COMPLETED,
  };

  const [salesAgg, salesByPayment, salesByUser, productSales] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: { grandTotal: true, tax: true, discount: true, total: true },
      _count: true,
      _avg: { grandTotal: true },
    }),
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.sale.groupBy({
      by: ['userId'],
      where,
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.saleItem.findMany({
      where: { sale: where },
      include: { product: true, sale: true },
    }),
  ]);

  const users = await Promise.all(
    salesByUser.map(async (u) => {
      const user = await prisma.user.findUnique({
        where: { id: u.userId },
        select: { name: true },
      });
      return { name: user?.name || 'Unknown', revenue: u._sum.grandTotal || 0, count: u._count };
    })
  );

  const productMap = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
  for (const item of productSales) {
    const key = item.productId;
    const existing = productMap.get(key) || {
      name: item.product.name,
      sku: item.product.sku,
      qty: 0,
      revenue: 0,
    };
    existing.qty += item.quantity;
    existing.revenue += item.total;
    productMap.set(key, existing);
  }

  res.json({
    period: { start, end },
    summary: {
      totalSales: salesAgg._count,
      totalRevenue: salesAgg._sum.grandTotal || 0,
      totalTax: salesAgg._sum.tax || 0,
      totalDiscount: salesAgg._sum.discount || 0,
      averageOrder: salesAgg._avg.grandTotal || 0,
    },
    byPayment: salesByPayment,
    bySalesRep: users,
    topProducts: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 20),
  });
});

router.get('/sales/excel', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate as string, endDate as string);

  const sales = await prisma.sale.findMany({
    where: { saleDate: { gte: start, lte: end } },
    include: { customer: true, user: { select: { name: true } } },
    orderBy: { saleDate: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sales Report');
  sheet.columns = [
    { header: 'Invoice', key: 'invoice', width: 20 },
    { header: 'Customer', key: 'customer', width: 25 },
    { header: 'Sales Rep', key: 'rep', width: 20 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 12 },
    { header: 'Tax', key: 'tax', width: 10 },
    { header: 'Discount', key: 'discount', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Payment', key: 'payment', width: 15 },
  ];

  for (const sale of sales) {
    sheet.addRow({
      invoice: sale.invoiceNo,
      customer: sale.customer.name,
      rep: sale.user.name,
      date: sale.saleDate.toISOString().slice(0, 10),
      subtotal: sale.total,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.grandTotal,
      status: sale.status,
      payment: sale.paymentMethod,
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.xlsx`);
  await workbook.xlsx.write(res);
});

router.get('/sales/:id/pdf', async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { product: true } },
    },
  });

  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${sale.invoiceNo}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).text('INVOICE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice: ${sale.invoiceNo}`);
  doc.text(`Date: ${sale.saleDate.toLocaleDateString()}`);
  doc.text(`Customer: ${sale.customer.name}`);
  doc.text(`Sales Rep: ${sale.user.name}`);
  doc.moveDown();

  doc.text('Items:', { underline: true });
  sale.items.forEach((item) => {
    doc.text(
      `${item.product.name} x${item.quantity} @ $${item.unitPrice.toFixed(2)} = $${item.total.toFixed(2)}`
    );
  });

  doc.moveDown();
  doc.text(`Subtotal: $${sale.total.toFixed(2)}`);
  doc.text(`Tax: $${sale.tax.toFixed(2)}`);
  doc.text(`Discount: -$${sale.discount.toFixed(2)}`);
  doc.fontSize(14).text(`Grand Total: $${sale.grandTotal.toFixed(2)}`, { underline: true });
  doc.text(`Payment: ${sale.paymentMethod}`);
  doc.text(`Status: ${sale.status}`);

  doc.end();
});

export default router;
