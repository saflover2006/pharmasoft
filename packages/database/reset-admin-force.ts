import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function forceResetAdmin() {
    try {
        console.log('🔄 Resetting Super Admin...');

        // 1. Delete existing superadmin if exists
        const deleted = await prisma.user.deleteMany({
            where: { username: 'superadmin' }
        });
        console.log(`🗑️  Deleted ${deleted.count} old admin accounts.`);

        // 2. Ensure we have a pharmacy to attach to
        let pharmacy = await prisma.pharmacy.findFirst();
        if (!pharmacy) {
            console.log('⚠️  No pharmacy found. Creating "System Pharmacy"...');
            pharmacy = await prisma.pharmacy.create({
                data: {
                    name: "System Admin Pharmacy",
                    email: "admin@system.com",
                    address: "System",
                    phone: "00000000",
                    subscriptionTier: "enterprise",
                    isActive: true,
                    licenseStatus: "active"
                }
            });
        }

        // 3. Create NEW superadmin
        // Hash for "admin123"
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await prisma.user.create({
            data: {
                username: 'superadmin',
                password: hashedPassword,
                name: 'Super Administrator',
                role: 'admin',
                pharmacyId: pharmacy.id
            }
        });

        console.log('\n✅ SUCCESS! Admin Reset Complete.');
        console.log('------------------------------------------------');
        console.log('👤 Username : superadmin');
        console.log('🔑 Password : admin123');
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

forceResetAdmin();
