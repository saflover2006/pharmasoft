
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Force updating Pharmacy 1 to Professional...');
        const p = await prisma.pharmacy.update({
            where: { id: 1 },
            data: {
                subscriptionTier: 'professional',
                licenseKey: 'PRO-FORCE-UPDATED-2026',
                paymentStatus: 'paid'
            }
        });
        console.log('SUCCESS:', p);
    } catch (e) {
        console.error('ERROR:', e);
    }
}
main();
