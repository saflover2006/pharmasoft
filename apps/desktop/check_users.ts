import { prisma } from '../../packages/database/src/index.ts';

async function main() {
    console.log('--- USER LIST ---');
    const users = await prisma.user.findMany({
        include: { pharmacy: true }
    });
    users.forEach(u => {
        console.log(`User: ${u.username} | Role: ${u.role} | Pharmacy: ${u.pharmacy.name} (ID: ${u.pharmacyId})`);
    });
    console.log('-----------------');
}

main().catch(console.error);
