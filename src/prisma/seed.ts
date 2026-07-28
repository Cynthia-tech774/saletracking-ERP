import { PrismaClient, Role, PaymentMethod, SaleStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: {
      email: 'admin@erp.com',
      password: adminPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  const managerPassword = await bcrypt.hash('manager123', 10);
  await prisma.user.upsert({
    where: { email: 'manager@erp.com' },
    update: {},
    create: {
      email: 'manager@erp.com',
      password: managerPassword,
      name: 'Sales Manager',
      role: Role.MANAGER,
    },
  });

  const userPassword = await bcrypt.hash('user123', 10);
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: {},
    create: {
      email: 'sales@erp.com',
      password: userPassword,
      name: 'Sales Rep',
      role: Role.USER,
    },
  });

  let customer1 = await prisma.customer.findFirst({ where: { email: 'contact@acme.com' } });
  if (!customer1) {
    customer1 = await prisma.customer.create({
      data: {
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+1-555-0100',
        address: '123 Business Ave, New York, NY',
        company: 'Acme Corp',
      },
    });
  }

  let customer2 = await prisma.customer.findFirst({ where: { email: 'jane@email.com' } });
  if (!customer2) {
    customer2 = await prisma.customer.create({
      data: {
        name: 'Jane Smith',
        email: 'jane@email.com',
        phone: '+1-555-0200',
        address: '456 Oak St, Los Angeles, CA',
      },
    });
  }

  const customers = [customer1, customer2];

  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'LAP-001' },
      update: {},
      create: {
        name: 'Business Laptop Pro',
        sku: 'LAP-001',
        category: 'Electronics',
        price: 1299.99,
        cost: 850,
        stock: 25,
        description: '15" business laptop with 16GB RAM',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'MON-002' },
      update: {},
      create: {
        name: '27" 4K Monitor',
        sku: 'MON-002',
        category: 'Electronics',
        price: 449.99,
        cost: 280,
        stock: 40,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'DSK-003' },
      update: {},
      create: {
        name: 'Ergonomic Desk Chair',
        sku: 'DSK-003',
        category: 'Furniture',
        price: 299.99,
        cost: 150,
        stock: 8,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'OFF-004' },
      update: {},
      create: {
        name: 'Office Paper Pack (500)',
        sku: 'OFF-004',
        category: 'Supplies',
        price: 12.99,
        cost: 6,
        stock: 200,
      },
    }),
  ]);

  const existingSale = await prisma.sale.findFirst();
  if (!existingSale) {
    const items = [
      { product: products[0], qty: 2 },
      { product: products[1], qty: 3 },
    ];
    let subtotal = 0;
    const saleItems = items.map(({ product, qty }) => {
      const total = product.price * qty;
      subtotal += total;
      return { productId: product.id, quantity: qty, unitPrice: product.price, total };
    });

    const tax = subtotal * 0.08;
    const grandTotal = subtotal + tax;

    await prisma.$transaction(async (tx) => {
      for (const { product, qty } of items) {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: qty } },
        });
      }

      await tx.sale.create({
        data: {
          invoiceNo: 'INV-SEED-0001',
          customerId: customers[0].id,
          userId: salesUser.id,
          total: subtotal,
          tax,
          discount: 0,
          grandTotal,
          status: SaleStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
          items: { create: saleItems },
        },
      });

      await tx.customer.update({
        where: { id: customers[0].id },
        data: { totalSpent: grandTotal },
      });
    });
  }

  console.log('Seed completed.');
  console.log('Admin: admin@erp.com / admin123');
  console.log('Manager: manager@erp.com / manager123');
  console.log('Sales: sales@erp.com / user123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
