import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function checkPrismaReadiness(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
