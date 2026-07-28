import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import saleRoutes from './routes/sales';
import productRoutes from './routes/products';
import customerRoutes from './routes/customers';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/users';
import activityRoutes from './routes/activities';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activities', activityRoutes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close();
});
