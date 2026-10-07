import { PrismaClient } from '@prisma/client';

const runtimeEnvironment =
    typeof globalThis === 'object' && 'process' in globalThis
        ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        : undefined;

export const prisma = new PrismaClient(
    runtimeEnvironment?.DATABASE_URL
        ? {
            datasources: {
                db: {
                    url: runtimeEnvironment.DATABASE_URL
                }
            }
        }
        : undefined
);

// Re-export all Prisma types
export type {
    Product,
    Sale,
    SaleItem,
    Customer,
    Prisma,
} from '@prisma/client';
