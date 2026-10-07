import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDemoAccount() {
    try {
        console.log('🎯 Creating demo account...');

        // Check if demo pharmacy already exists
        const existing = await prisma.pharmacy.findUnique({
            where: { id: 999 }
        });

        if (existing) {
            console.log('⚠️  Demo pharmacy already exists (ID: 999)');
            console.log('   Skipping creation...');
            return;
        }

        // Create Demo Pharmacy
        const demoPharmacy = await prisma.pharmacy.create({
            data: {
                id: 999,
                name: 'Demo Pharmacy - Free Tier',
                address: '123 Avenue Habib Bourguiba, Tunis, Tunisia',
                phone: '+216 71 123 456',
                email: 'demo@pharmasoft.tn',
                taxId: 'MF-DEMO-001',
                subscription: 'free',
                isActive: true
            }
        });

        console.log('✅ Demo pharmacy created:', demoPharmacy.name);

        // Create Demo Admin User
        const hashedPassword = await bcrypt.hash('demo123', 10);
        const demoUser = await prisma.user.create({
            data: {
                id: 9999,
                username: 'demo',
                password: hashedPassword,
                name: 'Demo Admin',
                role: 'admin',
                pharmacyId: 999
            }
        });

        console.log('✅ Demo user created:', demoUser.username);

        // Create Sample Products
        const products = [
            {
                name: 'Paracetamol 500mg',
                commercial_name: 'Paracetamol',
                barcode: 'DEMO001',
                price: 2.5,
                public_price: 2.5,
                purchase_price: 1.5,
                vat_rate: 19,
                stock: 100
            },
            {
                name: 'Ibuprofen 400mg',
                commercial_name: 'Ibuprofen',
                barcode: 'DEMO002',
                price: 3.0,
                public_price: 3.0,
                purchase_price: 2.0,
                vat_rate: 19,
                stock: 80
            },
            {
                name: 'Aspirin 100mg',
                commercial_name: 'Aspirin',
                barcode: 'DEMO003',
                price: 1.8,
                public_price: 1.8,
                purchase_price: 1.0,
                vat_rate: 19,
                stock: 150
            },
            {
                name: 'Vitamin C 1000mg',
                commercial_name: 'Vitamin C',
                barcode: 'DEMO004',
                price: 5.5,
                public_price: 5.5,
                purchase_price: 3.5,
                vat_rate: 19,
                stock: 60
            },
            {
                name: 'Amoxicillin 500mg',
                commercial_name: 'Amoxicillin',
                barcode: 'DEMO005',
                price: 12.5,
                public_price: 12.5,
                purchase_price: 8.0,
                vat_rate: 19,
                stock: 50
            }
        ];

        for (const product of products) {
            await prisma.product.create({
                data: {
                    ...product,
                    pharmacyId: 999
                }
            });
        }

        console.log(`✅ Created ${products.length} sample products`);
        console.log('\n🎉 Demo account setup complete!');
        console.log('\n📋 Demo Account Credentials:');
        console.log('   URL: http://localhost:5173');
        console.log('   Username: demo');
        console.log('   Password: demo123');
        console.log('\n💡 This is a FREE tier account with:');
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

createDemoAccount()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
