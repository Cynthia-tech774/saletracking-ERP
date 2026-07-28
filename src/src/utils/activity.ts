import { prisma } from '../lib/prisma';

export async function logActivity(userId: string, action: string, description: string) {
  await prisma.activity.create({
    data: { action, description, userId },
  });
}
