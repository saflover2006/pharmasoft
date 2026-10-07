import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createSuperAdmin() {
    try {
        console.log('🔧 Creating super admin user...');

        // Hash password "admin123"
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Check if superadmin already exists
        const existing = await prisma.user.findFirst({
            where: { username: 'superadmin' }
        });

        if (existing) {
            console.log('⚠️  Superadmin already exists. Updating password...');
            await prisma.user.update({
                where: { id: existing.id },
                data: {
                    password: hashedPassword,
                    role: 'admin'
                }
            });
            console.log('✅ Password updated for superadmin');
        } else {
            // Get first pharmacy ID
            const pharmacy = await prisma.pharmacy.findFirst();

            if (!pharmacy) {
                console.error('❌ No pharmacy found. Please create a pharmacy first.');
                return;
            }

            // Create superadmin user
            const admin = await prisma.user.create({
                data: {
                    username: 'superadmin',
                    password: hashedPassword,
                    name: 'Super Administrator',
                    role: 'admin',
                    pharmacyId: pharmacy.id
                }
            });

            console.log('✅ Super admin created successfully!');
        }

        console.log('\n🎉 Admin user ready!');
        console.log('\n📋 Login Credentials:');
        console.log('   URL: http://localhost:3001/admin.html');
        console.log('   Username: superadmin');
        console.log('   Password: admin123');
        console.log('\n🚀 You can now login to the admin dashboard!');

    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createSuperAdmin();
