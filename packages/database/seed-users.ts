import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: '123',
            name: 'Administrator',
            role: 'admin'
        }
    })
    console.log('Admin user created/verified:', admin)

    // Creates a cashier user too
    const cashier = await prisma.user.upsert({
        where: { username: 'cashier' },
        update: {},
        create: {
            username: 'cashier',
            password: '123',
            name: 'Cashier 1',
            role: 'cashier'
        }
    })
    console.log('Cashier user created/verified:', cashier)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
