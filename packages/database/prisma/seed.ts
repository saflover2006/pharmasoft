import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (in reverse order due to foreign keys)
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.stockAdjustment.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.user.deleteMany();
    await prisma.pharmacy.deleteMany();

    console.log('✓ Cleared existing data');

    // Create default pharmacy
    const defaultPharmacy = await prisma.pharmacy.create({
        data: {
            name: 'Demo Pharmacy',
            address: '123 Main Street, Tunis',
            phone: '+216 71 123 456',
            email: 'contact@demopharmacy.tn',
            taxId: 'MF123456',
            subscription: 'professional',
            isActive: true,
        }
    });

    console.log(`✓ Created default pharmacy: ${defaultPharmacy.name}`);

    // Create demo users
    const hashedAdminPass = await bcrypt.hash('admin123', 10);
    const hashedCashierPass = await bcrypt.hash('cashier123', 10);

    const admin = await prisma.user.create({
        data: {
            pharmacyId: defaultPharmacy.id,
            username: 'admin',
            password: hashedAdminPass,
            name: 'Admin User',
            role: 'admin',
        }
    });

    const cashier = await prisma.user.create({
        data: {
            pharmacyId: defaultPharmacy.id,
            username: 'cashier',
            password: hashedCashierPass,
            name: 'Cashier User',
            role: 'cashier',
        }
    });

    console.log(`✓ Created 2 demo users (admin, cashier)`);

    // Seed pharmaceutical products
    const productsData = [
        { barcode: '3400930000001', commercial_name: 'Doliprane 1000mg', public_price: 4.50, purchase_price: 3.20, vat_rate: 7.0, current_stock: 150 },
        { barcode: '3400930000002', commercial_name: 'Clamoxyl 500mg', public_price: 12.80, purchase_price: 9.50, vat_rate: 7.0, current_stock: 80 },
        { barcode: '3400930000003', commercial_name: 'Augmentin 1g', public_price: 18.50, purchase_price: 14.20, vat_rate: 7.0, current_stock: 60 },
        { barcode: '3400930000004', commercial_name: 'Aspirine 500mg', public_price: 3.20, purchase_price: 2.10, vat_rate: 7.0, current_stock: 200 },
        { barcode: '3400930000005', commercial_name: 'Ibuprofène 400mg', public_price: 5.80, purchase_price: 4.00, vat_rate: 7.0, current_stock: 120 },
        { barcode: '3400930000006', commercial_name: 'Amoxicilline 1g', public_price: 8.90, purchase_price: 6.50, vat_rate: 7.0, current_stock: 95 },
        { barcode: '3400930000007', commercial_name: 'Ventoline Spray', public_price: 22.50, purchase_price: 18.00, vat_rate: 7.0, current_stock: 45 },
        { barcode: '3400930000008', commercial_name: 'Symbicort Turbuhaler', public_price: 65.00, purchase_price: 52.00, vat_rate: 7.0, current_stock: 25 },
        { barcode: '3400930000009', commercial_name: 'Seretide Diskus', public_price: 58.90, purchase_price: 47.50, vat_rate: 7.0, current_stock: 30 },
        { barcode: '3400930000010', commercial_name: 'Oméprazole 20mg', public_price: 15.30, purchase_price: 11.80, vat_rate: 7.0, current_stock: 75 },
        { barcode: '3400930000011', commercial_name: 'Loratadine 10mg', public_price: 6.50, purchase_price: 4.80, vat_rate: 7.0, current_stock: 110 },
        { barcode: '3400930000012', commercial_name: 'Aérius 5mg', public_price: 19.80, purchase_price: 15.50, vat_rate: 7.0, current_stock: 65 },
    ];

    await prisma.product.createMany({
        data: productsData.map(p => ({ ...p, pharmacyId: defaultPharmacy.id }))
    });

    console.log(`✓ Created ${productsData.length} pharmaceutical products`);

    // Display summary
    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    const pharmacyCount = await prisma.pharmacy.count();

    console.log('\n📊 Database seeding completed!');
    console.log(`   Pharmacies: ${pharmacyCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Products: ${productCount}`);
    console.log('\n✅ Database is ready for use!\n');
    console.log('🔑 Demo credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Cashier: cashier / cashier123\n');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
