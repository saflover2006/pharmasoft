import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    try {
        console.log('🧹 Cleaning up demo data...');

        // Delete in correct order (respect foreign keys)
        await prisma.product.deleteMany({ where: { pharmacyId: 999 } });
        await prisma.user.deleteMany({ where: { pharmacyId: 999 } });
        await prisma.pharmacy.deleteMany({ where: { id: 999 } });

        console.log('✅ Demo data cleaned up!');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
