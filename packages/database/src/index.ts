import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Re-export all Prisma types
export type {
    Product,
    Sale,
    SaleItem,
    Customer,
    Prisma,
} from '@prisma/client';
