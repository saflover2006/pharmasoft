import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.product.deleteMany();

    console.log('✓ Cleared existing data');

    // Seed 20 pharmaceutical products common in Tunisia
    const products = await prisma.product.createMany({
        data: [
            {
                barcode: '3400930000001',
                commercial_name: 'Doliprane 1000mg',
                public_price: 4.50,
                purchase_price: 3.20,
                vat_rate: 7.0,
                current_stock: 150,
            },
            {
                barcode: '3400930000002',
                commercial_name: 'Clamoxyl 500mg',
                public_price: 12.80,
                purchase_price: 9.50,
                vat_rate: 7.0,
                current_stock: 80,
            },
            {
                barcode: '3400930000003',
                commercial_name: 'Augmentin 1g',
                public_price: 18.50,
                purchase_price: 14.20,
                vat_rate: 7.0,
                current_stock: 60,
            },
            {
                barcode: '3400930000004',
                commercial_name: 'Aspirine 500mg',
                public_price: 3.20,
                purchase_price: 2.10,
                vat_rate: 7.0,
                current_stock: 200,
            },
            {
                barcode: '3400930000005',
                commercial_name: 'Ibuprofène 400mg',
                public_price: 5.80,
                purchase_price: 4.00,
                vat_rate: 7.0,
                current_stock: 120,
            },
            {
                barcode: '3400930000006',
                commercial_name: 'Amoxicilline 1g',
                public_price: 8.90,
                purchase_price: 6.50,
                vat_rate: 7.0,
                current_stock: 95,
            },
            {
                barcode: '3400930000007',
                commercial_name: 'Ventoline Spray',
                public_price: 22.50,
                purchase_price: 18.00,
                vat_rate: 7.0,
                current_stock: 45,
            },
            {
                barcode: '3400930000008',
                commercial_name: 'Symbicort Turbuhaler',
                public_price: 65.00,
                purchase_price: 52.00,
                vat_rate: 7.0,
                current_stock: 25,
            },
            {
                barcode: '3400930000009',
                commercial_name: 'Seretide Diskus',
                public_price: 58.90,
                purchase_price: 47.50,
                vat_rate: 7.0,
                current_stock: 30,
            },
            {
                barcode: '3400930000010',
                commercial_name: 'Oméprazole 20mg',
                public_price: 15.30,
                purchase_price: 11.80,
                vat_rate: 7.0,
                current_stock: 75,
            },
            {
                barcode: '3400930000011',
                commercial_name: 'Loratadine 10mg',
                public_price: 6.50,
                purchase_price: 4.80,
                vat_rate: 7.0,
                current_stock: 110,
            },
            {
                barcode: '3400930000012',
                commercial_name: 'Aérius 5mg',
                public_price: 19.80,
                purchase_price: 15.50,
                vat_rate: 7.0,
                current_stock: 65,
            },
            {
                barcode: '3400930000013',
                commercial_name: 'Toplexil Sirop',
                public_price: 8.90,
                purchase_price: 6.80,
                vat_rate: 7.0,
                current_stock: 55,
            },
            {
                barcode: '3400930000014',
                commercial_name: 'Paracétamol 500mg',
                public_price: 2.80,
                purchase_price: 1.90,
                vat_rate: 7.0,
                current_stock: 250,
            },
            {
                barcode: '3400930000015',
                commercial_name: 'Tramadol 50mg',
                public_price: 25.00,
                purchase_price: 19.50,
                vat_rate: 7.0,
                current_stock: 40,
            },
            {
                barcode: '3400930000016',
                commercial_name: 'Atorvastatine 20mg',
                public_price: 32.50,
                purchase_price: 26.00,
                vat_rate: 7.0,
                current_stock: 50,
            },
            {
                barcode: '3400930000017',
                commercial_name: 'Metformine 1000mg',
                public_price: 12.90,
                purchase_price: 9.80,
                vat_rate: 7.0,
                current_stock: 85,
            },
            {
                barcode: '3400930000018',
                commercial_name: 'Insuline Novorapid',
                public_price: 45.00,
                purchase_price: 38.00,
                vat_rate: 7.0,
                current_stock: 20,
            },
            {
                barcode: '3400930000019',
                commercial_name: 'Vitamine D3 1000UI',
                public_price: 8.50,
                purchase_price: 6.20,
                vat_rate: 7.0,
                current_stock: 100,
            },
            {
                barcode: '3400930000020',
                commercial_name: 'Fer + Acide Folique',
                public_price: 11.20,
                purchase_price: 8.50,
                vat_rate: 7.0,
                current_stock: 70,
            },
        ],
    });

    console.log(`✓ Created ${products.count} pharmaceutical products`);

    // Create some sample sales for testing
    const sale1 = await prisma.sale.create({
        data: {
            total_amount: 27.30,
            payment_method: 'cash',
            items: {
                create: [
                    {
                        quantity: 2,
                        unit_price: 4.50,
                        product: { connect: { barcode: '3400930000001' } }, // Doliprane
                    },
                    {
                        quantity: 1,
                        unit_price: 18.50,
                        product: { connect: { barcode: '3400930000003' } }, // Augmentin
                    },
                ],
            },
        },
    });

    const sale2 = await prisma.sale.create({
        data: {
            total_amount: 79.50,
            payment_method: 'card',
            items: {
                create: [
                    {
                        quantity: 1,
                        unit_price: 22.50,
                        product: { connect: { barcode: '3400930000007' } }, // Ventoline
                    },
                    {
                        quantity: 3,
                        unit_price: 19.00,
                        product: { connect: { barcode: '3400930000012' } }, // Aérius
                    },
                ],
            },
        },
    });

    console.log(`✓ Created 2 sample sales with items`);

    // Display summary
    const productCount = await prisma.product.count();
    const saleCount = await prisma.sale.count();
    const saleItemCount = await prisma.saleItem.count();

    console.log('\n📊 Database seeding completed!');
    console.log(`   Products: ${productCount}`);
    console.log(`   Sales: ${saleCount}`);
    console.log(`   Sale Items: ${saleItemCount}`);
    console.log('\n✅ Database is ready for use!\n');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
