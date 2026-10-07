
import { prisma } from '../../packages/database/src/index.ts';

async function main() {
    const username = 'superadmin';
    const user = await prisma.user.findFirst({
        where: { username },
        include: { pharmacy: true }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User:', user.username);
    console.log('Pharmacy ID:', user.pharmacyId);
    console.log('Current Subscription Tier (DB):', user.pharmacy.subscriptionTier);
    console.log('License Key (DB):', user.pharmacy.licenseKey);
}

main();
