import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

function createPrismaClient(): InstanceType<typeof PrismaClient> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Check your .env file or deployment environment variables.'
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Lazy-init via Proxy so DATABASE_URL is only required when Prisma is actually used,
// not at module-load/build time (which breaks Next.js production builds).
export const prisma = new Proxy({} as InstanceType<typeof PrismaClient>, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalForPrisma.prisma as any)[prop];
  },
});

export default prisma;