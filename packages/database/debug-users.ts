
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Pharmacies ---');
    const pharmacies = await prisma.pharmacy.findMany();
    console.table(pharmacies);

    console.log('\n--- Users ---');
    const users = await prisma.user.findMany({
        include: { pharmacy: true }
    });
    users.forEach(u => {
        console.log(`User: ${u.username} (ID: ${u.id}) -> Pharmacy: ${u.pharmacy.name} (ID: ${u.pharmacyId})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
