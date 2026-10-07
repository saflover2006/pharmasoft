import { prisma } from '../../../packages/database/src/index.ts';
import bcrypt from 'bcryptjs';

/**
 * Create Demo Account
 * Pre-configured free tier account with sample data for testing
 */

async function createDemoAccount() {
    console.log('🎯 Creating demo account...');

    try {
        // 1. Create Demo Pharmacy
        const demoPharmacy = await prisma.pharmacy.upsert({
            where: { id: 999 }, // Special ID for demo
            update: {},
            create: {
                id: 999,
                name: 'Demo Pharmacy - Free Tier',
                address: '123 Demo Street, Tunis, Tunisia',
                phone: '+216 20 123 456',
                email: 'demo@pharmasoft.com',
                taxId: 'DEMO-MF-001',
                subscription: 'free',
                subscriptionTier: 'free',
                licenseStatus: 'inactive',
                paymentStatus: 'unpaid',
                maxProducts: 100,
                maxUsers: 1,
                maxSalesPerMonth: 50,
                featuresEnabled: JSON.stringify([
                    'pos',
                    'inventory_basic',
                    'barcode_scan',
                    'low_stock_alerts',
                    'expiry_alerts',
                    'basic_reports'
                ])
            }
        });

        console.log('✅ Demo pharmacy created:', demoPharmacy.name);

        // 2. Create Demo Admin User
        const hashedPassword = await bcrypt.hash('demo123', 10);
        const demoUser = await prisma.user.upsert({
            where: { username: 'demo' },
            update: {},
            create: {
                username: 'demo',
                password: hashedPassword,
                name: 'Demo User',
                role: 'admin',
                email: 'demo@pharmasoft.com',
                pharmacyId: 999
            }
        });

        console.log('✅ Demo user created:', demoUser.username);

        // 3. Create Sample Products
        const sampleProducts = [
            { name: 'Paracetamol 500mg', barcode: '1234567890001', price: 2.5, purchasePrice: 1.5, stock: 100, alertLimit: 20 },
            { name: 'Ibuprofen 400mg', barcode: '1234567890002', price: 3.0, purchasePrice: 2.0, stock: 80, alertLimit: 15 },
            { name: 'Amoxicillin 500mg', barcode: '1234567890003', price: 12.5, purchasePrice: 8.0, stock: 50, alertLimit: 10 },
            { name: 'Aspirin 100mg', barcode: '1234567890004', price: 1.8, purchasePrice: 1.0, stock: 150, alertLimit: 30 },
            { name: 'Vitamin C 1000mg', barcode: '1234567890005', price: 5.5, purchasePrice: 3.5, stock: 60, alertLimit: 12 },
            { name: 'Omeprazole 20mg', barcode: '1234567890006', price: 15.0, purchasePrice: 10.0, stock: 40, alertLimit: 8 },
            { name: 'Losartan 50mg', barcode: '1234567890007', price: 18.0, purchasePrice: 12.0, stock: 35, alertLimit: 7 },
            { name: 'Metformin 850mg', barcode: '1234567890008', price: 8.5, purchasePrice: 5.5, stock: 70, alertLimit: 15 },
            { name: 'Azithromycin 250mg', barcode: '1234567890009', price: 22.0, purchasePrice: 15.0, stock: 25, alertLimit: 5 },
            { name: 'Cetirizine 10mg', barcode: '1234567890010', price: 4.5, purchasePrice: 2.8, stock: 90, alertLimit: 18 }
        ];

        for (const product of sampleProducts) {
            await prisma.product.upsert({
                where: { barcode: product.barcode },
                update: {},
                create: {
                    ...product,
                    vatRate: 19,
                    pharmacyId: 999
                }
            });
        }

        console.log(`✅ Created ${sampleProducts.length} sample products`);

        // 4. Create Sample Sale
        const sampleSale = await prisma.sale.create({
            data: {
                invoiceNumber: `DEMO-${Date.now()}`,
                saleDate: new Date(),
                paymentMethod: 'cash',
                total: 15.5,
                subtotal: 13.0,
                tax: 2.5,
                discount: 0,
                cashierId: demoUser.id,
                pharmacyId: 999,
                items: {
                    create: [
                        {
                            product: { connect: { barcode: '1234567890001' } },
                            quantity: 2,
                            unitPrice: 2.5,
                            subtotal: 5.0,
                            pharmacyId: 999
                        },
                        {
                            product: { connect: { barcode: '1234567890002' } },
                            quantity: 1,
                            unitPrice: 3.0,
                            subtotal: 3.0,
                            pharmacyId: 999
                        },
                        {
                            product: { connect: { barcode: '1234567890005' } },
                            quantity: 1,
                            unitPrice: 5.5,
                            subtotal: 5.5,
                            pharmacyId: 999
                        }
                    ]
                }
            }
        });

        console.log('✅ Created sample sale:', sampleSale.invoiceNumber);

        console.log('\n🎉 Demo account setup complete!');
        console.log('\n📋 Demo Account Credentials:');
        console.log('   Username: demo');
        console.log('   Password: demo123');
        console.log('\n💡 This is a FREE tier account with limitations:');
        console.log('   - Max 100 products');
        console.log('   - 1 user only');
        console.log('   - Max 50 sales per month');
        console.log('   - Basic features only');
        console.log('\n🚀 Try "Start Free Trial" to unlock all features for 14 days!');

    } catch (error) {
        console.error('❌ Error creating demo account:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createDemoAccount()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export default createDemoAccount;
