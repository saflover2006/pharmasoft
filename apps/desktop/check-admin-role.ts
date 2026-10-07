
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking admin user...');
    const user = await prisma.user.findFirst({
        where: { username: 'admin' }
    });

    if (user) {
        console.log(`User found: ${user.username}`);
        console.log(`Role: ${user.role}`);
        console.log(`ID: ${user.id}`);
    } else {
        console.log('User "admin" not found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
