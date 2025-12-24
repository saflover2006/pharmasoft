import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Attempting to create product...');
        const product = await prisma.product.create({
            data: {
                barcode: 'TEST-BARCODE-' + Date.now(),
                commercial_name: 'Test Product',
                public_price: 10.5,
                purchase_price: 8.0,
                vat_rate: 19.0,
                current_stock: 100,
                low_stock_threshold: 5
            }
        })
        console.log('Success! Created:', product)
    } catch (e: any) {
        console.error('Stack:', e.stack);
        console.error('Message:', e.message);
        if (e.code) console.error('Code:', e.code);
        if (e.meta) console.error('Meta:', e.meta);
    } finally {
        await prisma.$disconnect()
    }
}

main()
