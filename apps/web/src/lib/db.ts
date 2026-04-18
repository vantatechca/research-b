import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://peptideiq:peptideiq@localhost:5432/peptideiq';

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
