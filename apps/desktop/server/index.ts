import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import type { Server } from 'node:http';
import { prisma } from '../../../packages/database/src/index.ts';
import { createBackup, listBackups, restoreBackup, deleteBackup, scheduleAutoBackup } from './backup.ts';
import { logActivity, getAuditLogs } from './audit.ts';
import { cloudBackupService } from './cloudBackup.ts';
import { LicenseService } from './licenseService.ts';
import { authenticateToken, isPlatformAdmin, isReservedUsername, JWT_SECRET, requirePharmacyAdmin, requirePlatformAdmin } from './middleware/auth.ts';
import { parsePharmacyMeta, stringifyPharmacyMeta } from './pharmacyMeta.ts';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005; // Changed to 3005 to avoid conflict
const POS_VAT_RATE = 0.07;
let server: Server | null = null;
let autoBackupScheduled = false;
let startPromise: Promise<Server | null> | null = null;

// CORS configuration
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper for error handling
const handleError = (res: any, error: any) => {
    console.error('API Error:', error);
    if (typeof error?.status === 'number') {
        return res.status(error.status).json({
            success: false,
            error: { message: error.message, code: error.code }
        });
    }
    if (error.code === 'P2002') {
        return res.status(400).json({
            success: false,
            error: { message: 'Unique constraint failed', code: 'P2002' }
        });
    }
    res.status(500).json({
        success: false,
        error: { message: 'Internal server error' }
    });
};

const createRequestError = (status: number, message: string, code?: string) => {
    return Object.assign(new Error(message), { status, code });
};

const enforceLimit = async (
    pharmacyId: number,
    limitType: 'products' | 'users' | 'sales'
) => {
    const result = await LicenseService.checkLimit(pharmacyId, limitType);

    if (!result.allowed) {
        const label = limitType === 'sales' ? 'sales this month' : limitType;
        throw createRequestError(
            403,
            `Your ${label} limit has been reached (${result.current}/${result.max}). Upgrade to continue.`,
            'LIMIT_REACHED'
        );
    }

    return result;
};

// Diagnostic Root Route
app.get('/', (req, res) => {
    res.send(`PharmaSOFT Backend API is running on port ${PORT}. Please access the app via Electron or http://localhost:5173`);
});

// --- AUTH ROUTES ---

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`[Auth] Login attempt for: ${username}`);

        // INCLUDE PHARMACY DATA
        const user = await prisma.user.findFirst({
            where: { username },
            include: { pharmacy: true }
        });

        if (!user) {
            console.log('[Auth] User not found');
            return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
        }

        const bcrypt = await import('bcryptjs');
        const passwordHash = user.password || '';
        const validPassword = passwordHash.startsWith('$2')
            ? await bcrypt.default.compare(password, passwordHash)
            : password === passwordHash;

        if (!validPassword) {
            console.log('[Auth] Invalid password');
            return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
        }

        if (!user.pharmacy.isActive || user.pharmacy.licenseStatus === 'suspended') {
            return res.status(403).json({ success: false, error: { message: 'This pharmacy account is suspended' } });
        }

        const jwt = await import('jsonwebtoken');
        const token = jwt.default.sign(
            { id: user.id, username: user.username, role: user.role, pharmacyId: user.pharmacyId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('[Auth] Login success. Tier:', user.pharmacy.subscriptionTier);

        // Construct User Object with Subscription Info
        const userData = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            pharmacyId: user.pharmacyId,
            pharmacyName: user.pharmacy.name,
            email: user.pharmacy.email,
            // CRITICAL: Pass these down!
            subscriptionTier: user.pharmacy.subscriptionTier,
            licenseKey: user.pharmacy.licenseKey,
            licenseStatus: user.pharmacy.licenseStatus,
            trialEndsAt: user.pharmacy.trialEndsAt,
            isPlatformAdmin: isPlatformAdmin(user),
        };

        res.json({
            success: true,
            token,
            user: userData,
            data: {
                token,
                user: userData
            }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Register Endpoint (Public for Free Tier)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { pharmacyName, username, password, email, phone, address, taxId, name } = req.body;

        if (!pharmacyName || !username || !password) {
            return res.status(400).json({
                success: false,
                error: { message: 'Pharmacy name, username, and password are required' }
            });
        }

        // Check existing
        const existing = await prisma.user.findFirst({ where: { username } });
        if (existing) return res.status(400).json({ success: false, error: { message: 'Username already taken' } });

        // Create Pharmacy
        const pharmacy = await prisma.pharmacy.create({
            data: {
                name: pharmacyName,
                email,
                phone,
                address,
                taxId,
                subscriptionTier: 'free',
                isActive: true
            }
        });

        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                name: name || `${pharmacyName} Admin`,
                role: 'admin',
                pharmacyId: pharmacy.id
            }
        });

        const jwt = await import('jsonwebtoken');
        const token = jwt.default.sign(
            { id: user.id, username: user.username, role: user.role, pharmacyId: user.pharmacyId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: { token, user: { id: user.id, username: user.username, role: user.role } }
        });

    } catch (e) {
        handleError(res, e);
    }
});

app.get('/api/auth/verify', authenticateToken, async (req: any, res) => {
    try {
        // Fetch fresh data from DB instead of relying on token payload
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { pharmacy: true }
        });

        if (!user) return res.status(401).json({ success: false, error: { message: 'User not found' } });

        const userData = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            pharmacyId: user.pharmacyId,
            pharmacyName: user.pharmacy.name,
            email: user.pharmacy.email,
            phone: user.pharmacy.phone,
            subscriptionTier: user.pharmacy.subscriptionTier,
            licenseKey: user.pharmacy.licenseKey,
            licenseStatus: user.pharmacy.licenseStatus,
            trialEndsAt: user.pharmacy.trialEndsAt,
            subscriptionMeta: parsePharmacyMeta(user.pharmacy.featuresEnabled),
            isPlatformAdmin: isPlatformAdmin(user),
        };

        res.json({ success: true, user: userData, data: { user: userData } });
    } catch (e) {
        handleError(res, e);
    }
});

// --- SUBSCRIPTION ROUTES ---

app.post('/api/subscription/checkout', authenticateToken, async (req: any, res) => {
    try {
        if (process.env.ALLOW_SIMULATED_BILLING !== 'true') {
            return res.status(503).json({
                success: false,
                error: { message: 'Simulated checkout is disabled' }
            });
        }

        if (!requirePlatformAdmin(req, res)) return;

        const { planId, paymentMethod } = req.body;
        console.log(`[Billing] Processing subscription for ${req.user.username} - Plan: ${planId}`);

        // SIMULATE PAYMENT PROCESSING DELAY
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In a real app, you would call Stripe here.
        // const charge = await stripe.charges.create({...});

        // UPDATE PHARMACY TIER
        const pharmId = parseInt(req.user.pharmacyId);
        if (isNaN(pharmId)) throw new Error('Invalid Pharmacy ID');

        // Verify pharmacy exists and get current features
        const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmId } });
        if (!pharmacy) throw new Error('Pharmacy not found');

        // Generate Invoice Data
        const planName = planId === 'lifetime' ? 'Lifetime Access' :
            planId === 'yearly' ? 'Professional (Yearly)' :
                'Professional (Monthly)';

        const invoiceData = {
            id: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: req.body.amount,
            description: `PharmaSOFT ${planName}`
        };

        // Preserve existing features and add invoice metadata
        const currentFeatures = parsePharmacyMeta(pharmacy.featuresEnabled);

        currentFeatures.lastInvoice = invoiceData;

        const updatedPharmacy = await prisma.pharmacy.update({
            where: { id: pharmId },
            data: {
                subscriptionTier: 'professional',
                paymentStatus: 'paid',
                isActive: true,
                licenseKey: `PRO-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${new Date().getFullYear()}`,
                featuresEnabled: stringifyPharmacyMeta(currentFeatures)
            }
        });

        console.log(`[Billing] Success. New License: ${updatedPharmacy.licenseKey}`);

        res.json({
            success: true,
            data: {
                message: 'Payment Successful',
                tier: updatedPharmacy.subscriptionTier,
                licenseKey: updatedPharmacy.licenseKey,
                invoice: invoiceData
            }
        });

    } catch (e) {
        handleError(res, e);
    }
});

// --- Products Routes ---

// Get All Products (Paginated)
app.get('/api/products', authenticateToken, async (req: any, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where: { pharmacyId: req.user.pharmacyId },
                skip,
                take: limit,
                orderBy: { commercial_name: 'asc' }
            }),
            prisma.product.count({ where: { pharmacyId: req.user.pharmacyId } })
        ]);

        res.json({
            success: true,
            data: { products, total }
        });
    } catch (error) {
        handleError(res, error);
    }
});

// Search Products
app.get('/api/products/search', authenticateToken, async (req: any, res) => {
    try {
        const query = (req.query.q as string || '').trim();
        const limit = Number(req.query.limit) || 10;

        if (!query) {
            return res.json({ success: true, data: [] });
        }

        const products = await prisma.product.findMany({
            where: {
                pharmacyId: req.user.pharmacyId,
                OR: [
                    { commercial_name: { contains: query } },
                    { barcode: { contains: query } },
                    { dci_name: { contains: query } },
                ],
            },
            take: limit,
            orderBy: { commercial_name: 'asc' }
        });
        res.json({ success: true, data: products });
    } catch (error) {
        handleError(res, error);
    }
});

// Low Stock Alert
app.get('/api/products/low-stock', authenticateToken, async (req: any, res) => {
    try {
        const allProducts = await prisma.product.findMany({
            where: { pharmacyId: req.user.pharmacyId }
        });
        const products = allProducts.filter(p => p.current_stock <= p.low_stock_threshold);
        res.json({ success: true, data: products });
    } catch (error) {
        handleError(res, error);
    }
});

// Create Product
app.post('/api/products', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        await enforceLimit(req.user.pharmacyId, 'products');

        const product = await prisma.product.create({
            data: {
                ...req.body,
                pharmacyId: req.user.pharmacyId,
                low_stock_threshold: req.body.low_stock_threshold ?? 5,
            },
        });
        res.json({ success: true, data: product });
    } catch (error) {
        handleError(res, error);
    }
});

// Update Product
app.put('/api/products/:id', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);
        const product = await prisma.product.update({
            where: { id, pharmacyId: req.user.pharmacyId }, // Ensure ownership
            data: req.body,
        });
        res.json({ success: true, data: product });
    } catch (error) {
        handleError(res, error);
    }
});

// Delete Product
app.delete('/api/products/:id', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);
        // Check sales first
        const salesCount = await prisma.saleItem.count({
            where: {
                productId: id,
                // Sales items don't have pharmacyId, but productId is unique enough IF product ownership checked?
                // Actually we should check product ownership first
            }
        });

        // Verify ownership
        const product = await prisma.product.findFirst({
            where: { id, pharmacyId: req.user.pharmacyId }
        });

        if (!product) return res.status(404).json({ success: false, error: { message: 'Product not found' } });

        if (salesCount > 0) {
            return res.status(400).json({ success: false, error: { message: 'Cannot delete product with sales history' } });
        }

        await prisma.product.delete({ where: { id } });
        res.json({ success: true, data: true });
    } catch (error) {
        handleError(res, error);
    }
});

// ========================
// --- CUSTOMER MANAGEMENT API ---
// ========================

// Get All Customers (with pagination and search)
app.get('/api/customers', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const search = req.query.search as string || '';
        const customerType = req.query.customerType as string;

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            pharmacyId: req.user.pharmacyId
        };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } },
                { address: { contains: search } },
                { taxId: { contains: search } },
            ];
        }

        if (customerType && customerType !== 'all') {
            where.customerType = customerType;
        }

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { invoices: true }
                    }
                }
            }),
            prisma.customer.count({ where })
        ]);

        res.json({
            success: true,
            data: customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) {
        console.error('Get customers error:', e);
        handleError(res, e);
    }
});

// Search Customers (lightweight for autocomplete/quick search)
app.get('/api/customers/search', authenticateToken, async (req: any, res) => {
    try {
        const query = req.query.q as string || '';
        const limit = Number(req.query.limit) || 10;

        if (!query || query.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const customers = await prisma.customer.findMany({
            where: {
                pharmacyId: req.user.pharmacyId,
                OR: [
                    { name: { contains: query } },
                    { phone: { contains: query } },
                    { email: { contains: query } }
                ]
            },
            take: limit,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                customerType: true,
                address: true
            }
        });

        res.json({ success: true, data: customers });
    } catch (e) {
        console.error('Search customers error:', e);
        handleError(res, e);
    }
});

// Create New Customer
app.post('/api/customers', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const { name, phone, email, address, customerType, taxId, cnamNumber } = req.body;
        const normalizedName = name?.trim();
        const normalizedPhone = phone?.trim() || null;
        const normalizedEmail = email?.trim() || null;

        // Validation
        if (!normalizedName) {
            return res.status(400).json({
                success: false,
                error: { message: 'Customer name is required' }
            });
        }

        // Check for duplicate phone if provided
        if (normalizedPhone) {
            const existing = await prisma.customer.findFirst({
                where: {
                    phone: normalizedPhone,
                    pharmacyId: req.user.pharmacyId,
                }
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'A customer with this phone number already exists' }
                });
            }
        }

        // Check for duplicate email if provided
        if (normalizedEmail) {
            const existing = await prisma.customer.findFirst({
                where: {
                    email: normalizedEmail,
                    pharmacyId: req.user.pharmacyId
                }
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'A customer with this email already exists' }
                });
            }
        }

        const customer = await prisma.customer.create({
            data: {
                pharmacyId: req.user.pharmacyId,
                name: normalizedName,
                phone: normalizedPhone,
                email: normalizedEmail,
                address: address || null,
                customerType: customerType || 'individual',
                taxId: taxId || null,
                cnamNumber: cnamNumber || null
            }
        });

        res.json({ success: true, data: customer });
    } catch (e) {
        console.error('Create customer error:', e);
        handleError(res, e);
    }
});

// Get Customer by ID (with invoices)
app.get('/api/customers/:id', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);

        const customer = await prisma.customer.findFirst({
            where: {
                id,
                pharmacyId: req.user.pharmacyId
            },
            include: {
                _count: {
                    select: { invoices: true, sales: true }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: { message: 'Customer not found' }
            });
        }

        res.json({ success: true, data: customer });
    } catch (e) {
        console.error('Get customer error:', e);
        handleError(res, e);
    }
});

// Update Customer
app.put('/api/customers/:id', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);
        const { name, phone, email, address, customerType, taxId, cnamNumber } = req.body;
        const normalizedName = name?.trim();
        const normalizedPhone = phone?.trim() || null;
        const normalizedEmail = email?.trim() || null;

        // Check if customer exists
        const existing = await prisma.customer.findFirst({
            where: {
                id,
                pharmacyId: req.user.pharmacyId
            }
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { message: 'Customer not found' }
            });
        }

        // Validation
        if (name !== undefined && !normalizedName) {
            return res.status(400).json({
                success: false,
                error: { message: 'Customer name cannot be empty' }
            });
        }

        // Check for duplicate phone (excluding current customer)
        if (normalizedPhone && normalizedPhone !== existing.phone) {
            const duplicate = await prisma.customer.findFirst({
                where: {
                    phone: normalizedPhone,
                    pharmacyId: req.user.pharmacyId,
                    id: { not: id }
                }
            });
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Another customer with this phone number already exists' }
                });
            }
        }

        // Check for duplicate email (excluding current customer)
        if (normalizedEmail && normalizedEmail !== existing.email) {
            const duplicate = await prisma.customer.findFirst({
                where: {
                    email: normalizedEmail,
                    id: { not: id },
                    pharmacyId: req.user.pharmacyId
                }
            });
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Another customer with this email already exists' }
                });
            }
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name: name !== undefined ? normalizedName : undefined,
                phone: phone !== undefined ? normalizedPhone : undefined,
                email: email !== undefined ? normalizedEmail : undefined,
                address: address !== undefined ? address || null : undefined,
                customerType: customerType || undefined,
                taxId: taxId !== undefined ? taxId || null : undefined,
                cnamNumber: cnamNumber !== undefined ? cnamNumber || null : undefined
            }
        });

        res.json({ success: true, data: customer });
    } catch (e) {
        console.error('Update customer error:', e);
        handleError(res, e);
    }
});

// Delete Customer
app.delete('/api/customers/:id', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);

        // Check if customer exists
        const customer = await prisma.customer.findFirst({
            where: {
                id,
                pharmacyId: req.user.pharmacyId
            },
            include: {
                _count: {
                    select: { invoices: true }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: { message: 'Customer not found' }
            });
        }

        // If customer has invoices, prevent deletion
        if (customer._count.invoices > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `Cannot delete customer with ${customer._count.invoices} invoice(s). Archive customer instead.`
                }
            });
        }

        if (customer._count.sales > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `Cannot delete customer with ${customer._count.sales} sale(s). Archive customer instead.`
                }
            });
        }

        await prisma.customer.delete({ where: { id } });
        res.json({ success: true, data: true });
    } catch (e) {
        console.error('Delete customer error:', e);
        handleError(res, e);
    }
});

// Find or Create Customer (backward compatibility for POS)
app.post('/api/customers/find-or-create', authenticateToken, async (req: any, res) => {
    try {
        const { name, phone, email } = req.body;
        const normalizedName = name?.trim();
        const normalizedPhone = phone?.trim() || null;
        const normalizedEmail = email?.trim() || null;

        if (!normalizedName) {
            return res.status(400).json({
                success: false,
                error: { message: 'Customer name is required' }
            });
        }

        // Try to find by phone first, then by name
        let customer = null;

        if (normalizedPhone) {
            customer = await prisma.customer.findFirst({
                where: {
                    pharmacyId: req.user.pharmacyId,
                    phone: normalizedPhone
                }
            });
        }

        if (!customer && normalizedEmail) {
            customer = await prisma.customer.findFirst({
                where: {
                    pharmacyId: req.user.pharmacyId,
                    email: normalizedEmail
                }
            });
        }

        if (!customer) {
            customer = await prisma.customer.findFirst({
                where: {
                    pharmacyId: req.user.pharmacyId,
                    name: { equals: normalizedName }
                }
            });
        }

        // Create if not found
        if (!customer) {
            if (normalizedPhone) {
                const existingPhoneCustomer = await prisma.customer.findFirst({
                    where: {
                        phone: normalizedPhone,
                        pharmacyId: req.user.pharmacyId,
                    }
                });

                if (existingPhoneCustomer) {
                    return res.status(400).json({
                        success: false,
                        error: { message: 'A customer with this phone number already exists' }
                    });
                }
            }

            customer = await prisma.customer.create({
                data: {
                    pharmacyId: req.user.pharmacyId,
                    name: normalizedName,
                    phone: normalizedPhone,
                    email: normalizedEmail,
                    customerType: 'individual'
                }
            });
        }

        res.json({ success: true, data: customer });
    } catch (e) {
        console.error('Find or create customer error:', e);
        handleError(res, e);
    }
});

// ========================
// --- INVOICE MANAGEMENT API ---
// ========================

// Helper: Generate next invoice number
async function getNextInvoiceNumber(pharmacyId: number): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    // Get the latest invoice for this year
    const latestInvoice = await prisma.invoice.findFirst({
        where: {
            pharmacyId,
            invoiceNumber: {
                startsWith: prefix
            }
        },
        orderBy: {
            invoiceNumber: 'desc'
        }
    });

    let nextNumber = 1;
    if (latestInvoice) {
        // Extract number from INV-2024-0001 format
        const parts = latestInvoice.invoiceNumber.split('-');
        const lastNumber = parseInt(parts[2] || '0');
        nextNumber = lastNumber + 1;
    }

    // Pad with zeros (4 digits)
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${paddedNumber}`;
}

// Get All Invoices (with pagination and filters)
app.get('/api/invoices', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
        const invoiceType = req.query.invoiceType as string;
        const isPaid = req.query.isPaid === 'true' ? true : req.query.isPaid === 'false' ? false : undefined;
        const search = req.query.search as string || '';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            pharmacyId: req.user.pharmacyId
        };

        if (customerId) {
            where.customerId = customerId;
        }

        if (invoiceType && invoiceType !== 'all') {
            where.invoiceType = invoiceType;
        }

        if (isPaid !== undefined) where.isPaid = isPaid;

        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search } },
                { customerName: { contains: search } },
            ];
        }

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { invoiceDate: 'desc' },
                include: { customer: true }
            }),
            prisma.invoice.count({ where })
        ]);

        res.json({
            success: true,
            data: invoices,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) {
        handleError(res, e);
    }
});


// Get Invoice by ID
app.get('/api/invoices/:id', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);

        const invoice = await prisma.invoice.findFirst({
            where: {
                id,
                pharmacyId: req.user.pharmacyId,
            },
            include: {
                customer: true,
                items: {
                    orderBy: { id: 'asc' }
                },
                sale: {
                    select: {
                        id: true,
                        timestamp: true,
                        payment_method: true
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        name: true
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: { message: 'Invoice not found' }
            });
        }

        res.json({ success: true, data: invoice });
    } catch (e) {
        console.error('Get invoice error:', e);
        handleError(res, e);
    }
});

// Create Invoice
app.post('/api/invoices', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const {
            customerId,
            saleId,
            invoiceType,
            items,
            notes,
            paymentMethod,
            isPaid
        } = req.body;
        const pharmacyId = req.user.pharmacyId;
        const createdById = req.user.id;

        // Validation
        if (!customerId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Customer ID is required' }
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invoice must have at least one item' }
            });
        }

        // Get customer details
        const customer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                pharmacyId,
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: { message: 'Customer not found' }
            });
        }

        let linkedSaleId: number | null = null;

        if (saleId) {
            const sale = await prisma.sale.findFirst({
                where: {
                    id: Number(saleId),
                    pharmacyId,
                }
            });

            if (!sale) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Sale not found' }
                });
            }

            linkedSaleId = sale.id;
        }

        // Generate invoice number
        const invoiceNumber = await getNextInvoiceNumber(pharmacyId);
        const finalIsPaid = isPaid !== undefined ? isPaid : true;

        // Calculate totals
        let subtotal = 0;
        let cnamTotal = 0;
        let patientTotal = 0;

        const invoiceItems = items.map((item: any) => {
            const itemSubtotal = item.unitPrice * item.quantity;
            subtotal += itemSubtotal;

            // Calculate CNAM portions
            let itemCnamAmount = 0;
            let itemPatientAmount = itemSubtotal;

            if (item.cnamReimbursable && item.cnamRate > 0) {
                itemCnamAmount = itemSubtotal * (item.cnamRate / 100);
                itemPatientAmount = itemSubtotal - itemCnamAmount;
            }

            cnamTotal += itemCnamAmount;
            patientTotal += itemPatientAmount;

            return {
                productName: item.productName,
                productBarcode: item.productBarcode || null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: itemSubtotal,
                cnamReimbursable: item.cnamReimbursable || false,
                cnamRate: item.cnamRate || 0,
                cnamAmount: itemCnamAmount,
                patientAmount: itemPatientAmount,
                requiresPrescription: item.requiresPrescription || false,
                therapeuticClass: item.therapeuticClass || null,
                dciName: item.dciName || null
            };
        });

        const taxAmount = Number((subtotal * POS_VAT_RATE).toFixed(3));
        const totalAmount = Number((subtotal + taxAmount).toFixed(3));
        const finalPatientAmount = Number((patientTotal + taxAmount).toFixed(3));

        // Create invoice with items
        const invoice = await prisma.invoice.create({
            data: {
                pharmacyId,
                invoiceNumber,
                invoiceType: invoiceType || 'detailed',
                invoiceDate: new Date(),

                // Customer snapshot
                customerId,
                customerName: customer.name,
                customerPhone: customer.phone,
                customerEmail: customer.email,
                customerAddress: customer.address,
                customerType: customer.customerType,
                customerTaxId: customer.taxId,
                customerCnamNumber: customer.cnamNumber,

                // Financial details
                subtotal,
                taxAmount,
                discountAmount: 0,
                totalAmount,
                cnamAmount: cnamTotal,
                patientAmount: finalPatientAmount,

                // Payment
                paymentMethod: paymentMethod || 'cash',
                isPaid: finalIsPaid,
                paidAt: finalIsPaid ? new Date() : null,

                // Metadata
                notes: notes || null,
                saleId: linkedSaleId,
                createdById,

                // Items
                items: {
                    create: invoiceItems
                }
            },
            include: {
                items: true,
                customer: true,
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        name: true
                    }
                }
            }
        });

        res.json({ success: true, data: invoice });
    } catch (e) {
        console.error('Create invoice error:', e);
        handleError(res, e);
    }
});

// Update Invoice Payment Status
app.patch('/api/invoices/:id/payment', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);
        const { isPaid, paidAt, paymentMethod } = req.body;

        const invoice = await prisma.invoice.findFirst({
            where: {
                id,
                pharmacyId: req.user.pharmacyId,
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: { message: 'Invoice not found' }
            });
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                isPaid: isPaid !== undefined ? isPaid : undefined,
                paidAt: isPaid ? (paidAt ? new Date(paidAt) : new Date()) : null,
                paymentMethod: paymentMethod || undefined
            },
            include: {
                customer: true,
                items: true
            }
        });

        res.json({ success: true, data: updated });
    } catch (e) {
        console.error('Update payment error:', e);
        handleError(res, e);
    }
});

// Update Invoice Print Status
app.patch('/api/invoices/:id/print', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);

        const invoice = await prisma.invoice.findFirst({
            where: {
                id,
                pharmacyId: req.user.pharmacyId,
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: { message: 'Invoice not found' }
            });
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                isPrinted: true,
                printedAt: new Date()
            }
        });

        res.json({ success: true, data: updated });
    } catch (e) {
        console.error('Update print status error:', e);
        handleError(res, e);
    }
});

// Get Invoice Statistics
app.get('/api/invoices/stats/summary', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

        const where: any = {
            pharmacyId: req.user.pharmacyId,
        };
        if (startDate || endDate) {
            where.invoiceDate = {};
            if (startDate) where.invoiceDate.gte = startDate;
            if (endDate) where.invoiceDate.lte = endDate;
        }

        const [
            totalInvoices,
            totalAmount,
            paidInvoices,
            unpaidInvoices,
            cnamInvoices
        ] = await Promise.all([
            prisma.invoice.count({ where }),
            prisma.invoice.aggregate({
                where,
                _sum: { totalAmount: true }
            }),
            prisma.invoice.count({
                where: { ...where, isPaid: true }
            }),
            prisma.invoice.count({
                where: { ...where, isPaid: false }
            }),
            prisma.invoice.count({
                where: { ...where, invoiceType: 'cnam' }
            })
        ]);

        res.json({
            success: true,
            data: {
                totalInvoices,
                totalAmount: totalAmount._sum.totalAmount || 0,
                paidInvoices,
                unpaidInvoices,
                cnamInvoices
            }
        });
    } catch (e) {
        console.error('Get invoice stats error:', e);
        handleError(res, e);
    }
});

// Delete Invoice (only if not associated with a sale and not printed)
app.delete('/api/invoices/:id', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const id = Number(req.params.id);

        const invoice = await prisma.invoice.findFirst({
            where: {
                id,
                pharmacyId: req.user.pharmacyId,
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: { message: 'Invoice not found' }
            });
        }

        // Prevent deletion of printed invoices
        if (invoice.isPrinted) {
            return res.status(400).json({
                success: false,
                error: { message: 'Cannot delete printed invoices' }
            });
        }

        // Prevent deletion of invoices linked to sales
        if (invoice.saleId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Cannot delete invoices linked to sales' }
            });
        }

        // Delete invoice items first, then invoice
        await prisma.invoiceItem.deleteMany({
            where: { invoiceId: id }
        });

        await prisma.invoice.delete({
            where: { id }
        });

        res.json({ success: true, data: true });
    } catch (e) {
        console.error('Delete invoice error:', e);
        handleError(res, e);
    }
});

// --- Sales Routes ---


app.post('/api/sales', authenticateToken, async (req: any, res) => {
    try {
        const { items, paymentMethod, customerInfo, shiftId, discount } = req.body;
        const userId = req.user.id; // Use ID from token
        const pharmacyId = req.user.pharmacyId;

        let parsedDiscount: {
            type: 'percentage' | 'fixed';
            value: number;
            reason: string | null;
        } | null = null;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Sale must include at least one item' }
            });
        }

        await enforceLimit(pharmacyId, 'sales');

        if (discount != null) {
            if (typeof discount !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Discount payload must be an object' }
                });
            }

            const discountType = discount.type;
            const discountValue = Number(discount.value);

            if (discountType !== 'percentage' && discountType !== 'fixed') {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Discount type must be percentage or fixed' }
                });
            }

            if (!Number.isFinite(discountValue) || discountValue <= 0) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Discount value must be greater than 0' }
                });
            }

            if (discountType === 'percentage' && discountValue > 100) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Percentage discount cannot exceed 100%' }
                });
            }

            parsedDiscount = {
                type: discountType,
                value: discountValue,
                reason: typeof discount.reason === 'string' && discount.reason.trim()
                    ? discount.reason.trim()
                    : null,
            };
        }

        const requestedItems = items.map((item: any) => ({
            productId: Number(item?.product?.id),
            quantity: Number(item?.quantity),
        }));

        if (requestedItems.some((item) => !Number.isInteger(item.productId) || item.productId <= 0 || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Each sale item must include a valid product and quantity' }
            });
        }

        const requestedQuantities = new Map<number, number>();
        for (const item of requestedItems) {
            requestedQuantities.set(item.productId, (requestedQuantities.get(item.productId) || 0) + item.quantity);
        }

        const sale = await prisma.$transaction(async (tx) => {
            let customerId: number | null = null;

            if (customerInfo?.name?.trim()) {
                const normalizedName = customerInfo.name.trim();
                const normalizedPhone = customerInfo.phone?.trim() || null;

                let customer = null;

                if (normalizedPhone) {
                    customer = await tx.customer.findFirst({
                        where: {
                            pharmacyId,
                            phone: normalizedPhone,
                        }
                    });
                }

                if (!customer) {
                    customer = await tx.customer.findFirst({
                        where: {
                            pharmacyId,
                            name: { equals: normalizedName }
                        }
                    });
                }

                if (!customer) {
                    customer = await tx.customer.create({
                        data: {
                            pharmacyId,
                            name: normalizedName,
                            phone: normalizedPhone,
                            customerType: 'individual'
                        }
                    });
                }

                customerId = customer.id;
            }

            let validatedShiftId: number | null = null;
            if (shiftId !== undefined && shiftId !== null) {
                const shift = await tx.shift.findFirst({
                    where: {
                        id: Number(shiftId),
                        pharmacyId,
                        endTime: null,
                    },
                });

                if (!shift) {
                    throw createRequestError(400, 'The selected shift is no longer active');
                }

                if (req.user.role !== 'admin' && shift.userId !== userId) {
                    throw createRequestError(403, 'You can only record sales in your own active shift');
                }

                validatedShiftId = shift.id;
            }

            const products = await tx.product.findMany({
                where: {
                    id: { in: Array.from(requestedQuantities.keys()) },
                    pharmacyId,
                },
            });

            if (products.length !== requestedQuantities.size) {
                throw createRequestError(404, 'One or more sale items reference unavailable products');
            }

            const productsById = new Map(products.map((product) => [product.id, product]));
            const saleItems = Array.from(requestedQuantities.entries()).map(([productId, quantity]) => {
                const product = productsById.get(productId)!;

                if (product.current_stock < quantity) {
                    throw createRequestError(400, `${product.commercial_name} only has ${product.current_stock} units in stock`);
                }

                return {
                    productId: product.id,
                    quantity,
                    unit_price: product.public_price,
                };
            });

            const subtotal = saleItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
            const discountAmount = parsedDiscount
                ? parsedDiscount.type === 'percentage'
                    ? subtotal * (parsedDiscount.value / 100)
                    : Math.min(parsedDiscount.value, subtotal)
                : 0;
            const discountedSubtotal = Math.max(0, subtotal - discountAmount);
            const totalAmount = discountedSubtotal + (discountedSubtotal * POS_VAT_RATE);

            const createdSale = await tx.sale.create({
                data: {
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    discount: discountAmount,
                    notes: parsedDiscount?.reason || null,
                    customerId,
                    userId,
                    pharmacyId,
                    shiftId: validatedShiftId,
                    items: {
                        create: saleItems,
                    },
                },
                include: { items: { include: { product: true } }, customer: true },
            });

            for (const item of saleItems) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { current_stock: { decrement: item.quantity } },
                });
            }

            return createdSale;
        });

        console.log('Sale created successfully:', sale.id);
        const responseData = {
            success: true,
            data: {
                saleId: sale.id,
                items: sale.items,
                total_amount: sale.total_amount,
                timestamp: sale.timestamp,
                payment_method: sale.payment_method,
                discount: sale.discount,
                customer: sale.customer,
            }
        };
        console.log('Sending response:', responseData);
        res.json(responseData);
    } catch (e) {
        if ((e as any)?.status) {
            return res.status((e as any).status).json({
                success: false,
                error: { message: (e as Error).message }
            });
        }

        console.error('Sales endpoint error:', e);
        handleError(res, e);
    }
});

// Get Sales History
app.get('/api/sales', authenticateToken, async (req: any, res) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const where: any = { pharmacyId: req.user.pharmacyId };

        if (req.user.role !== 'admin') {
            where.userId = req.user.id;
        }

        const sales = await prisma.sale.findMany({
            where,
            take: limit,
            orderBy: { timestamp: 'desc' },
            include: {
                items: { include: { product: true } },
                customer: true,
                user: { select: { name: true } }
            }
        });
        res.json({ success: true, data: sales });
    } catch (e) { handleError(res, e); }
});

// Sales Reports
app.get('/api/reports/sales', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        let startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
        let endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
        const shiftId = req.query.shiftId ? Number(req.query.shiftId) : null;
        const userId = req.query.userId ? Number(req.query.userId) : null;

        // Set times for proper range filtering
        if (startDate) {
            startDate.setHours(0, 0, 0, 0);
        }
        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
        }

        const where: any = {
            pharmacyId: req.user.pharmacyId
        };
        if (startDate && endDate) {
            where.timestamp = { gte: startDate, lte: endDate };
        }
        if (shiftId) where.shiftId = shiftId;
        if (userId) where.userId = userId;

        console.log('Reports query:', { startDate, endDate, where });

        const sales = await prisma.sale.findMany({
            where,
            include: {
                items: { include: { product: true } },
                customer: true,
                user: { select: { name: true, username: true } },
                shift: true
            },
            orderBy: { timestamp: 'desc' }
        });

        // Calculate metrics
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
        const totalSales = sales.length;
        const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

        // Count payment methods
        const paymentMethods = sales.reduce((acc, sale) => {
            acc[sale.payment_method] = (acc[sale.payment_method] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Get product sales stats
        const productStats: Record<number, { name: string; quantity: number; revenue: number }> = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = {
                        name: item.product.commercial_name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productStats[item.productId].quantity += item.quantity;
                productStats[item.productId].revenue += item.unit_price * item.quantity;
            });
        });

        const topProducts = Object.entries(productStats)
            .map(([id, stats]) => ({ productId: Number(id), ...stats }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        res.json({
            success: true,
            data: {
                sales,
                metrics: {
                    totalRevenue,
                    totalSales,
                    averageSale,
                    paymentMethods
                },
                topProducts
            }
        });
    } catch (e) { handleError(res, e); }
});

// --- Stock Adjustments ---

// Create stock adjustment
app.post('/api/stock-adjustments', authenticateToken, async (req: any, res) => {
    try {
        const { productId, quantity, reason, notes, batchNumber, expiryDate } = req.body;
        const parsedProductId = Number(productId);
        const parsedQuantity = Number(quantity);

        if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid product ID' }
            });
        }

        if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Quantity must be a non-zero number' }
            });
        }

        let parsedExpiryDate: Date | undefined;
        if (typeof expiryDate === 'string' && expiryDate.trim()) {
            const normalizedExpiryDate = expiryDate.includes('T')
                ? expiryDate
                : `${expiryDate}T00:00:00.000Z`;
            parsedExpiryDate = new Date(normalizedExpiryDate);

            if (Number.isNaN(parsedExpiryDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Invalid expiry date' }
                });
            }
        }

        const product = await prisma.product.findFirst({
            where: {
                id: parsedProductId,
                pharmacyId: req.user.pharmacyId,
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                error: { message: 'Product not found' }
            });
        }

        if (product.current_stock + parsedQuantity < 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Stock adjustment would result in negative stock' }
            });
        }

        // Create adjustment record
        const adjustment = await prisma.stockAdjustment.create({
            data: {
                pharmacyId: req.user.pharmacyId,
                productId: parsedProductId,
                quantity: parsedQuantity,
                reason,
                notes,
                userId: Number(req.user.id)
            }
        });

        // Update product stock
        const productUpdateData: {
            current_stock: { increment: number };
            batch_number?: string;
            expiry_date?: Date;
        } = {
            current_stock: { increment: parsedQuantity }
        };

        if (parsedQuantity > 0 && typeof batchNumber === 'string' && batchNumber.trim()) {
            productUpdateData.batch_number = batchNumber.trim();
        }

        if (parsedQuantity > 0 && parsedExpiryDate) {
            productUpdateData.expiry_date = parsedExpiryDate;
        }

        await prisma.product.update({
            where: { id: parsedProductId },
            data: productUpdateData
        });

        res.json({ success: true, data: adjustment });
    } catch (e) { handleError(res, e); }
});

// Get stock adjustments history
// Get Stock Adjustments
app.get('/api/stock-adjustments', authenticateToken, async (req: any, res) => {
    try {
        const productId = req.query.productId ? Number(req.query.productId) : undefined;
        const where: any = {
            pharmacyId: req.user.pharmacyId
        };

        if (productId) {
            where.productId = productId;
        }

        const adjustments = await prisma.stockAdjustment.findMany({
            where,
            include: {
                product: true,
                user: { select: { id: true, name: true, username: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: adjustments });
    } catch (e) { handleError(res, e); }
});

// --- Authentication Routes ---

app.post('/api/auth/register-pharmacy', async (req, res) => {
    try {
        const { pharmacyName, address, phone, taxId, username, password, name, email } = req.body;

        // Basic validation
        if (!pharmacyName || !username || !password) {
            return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
        }

        // Check availability
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ success: false, error: { message: 'Username already taken' } });
        }

        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash(password, 10);

        // Create in transaction
        const result = await prisma.$transaction(async (tx) => {
            const pharmacy = await tx.pharmacy.create({
                data: {
                    name: pharmacyName,
                    address,
                    phone,
                    taxId,
                    email,
                    subscription: 'professional',
                    isActive: true
                }
            });

            const user = await tx.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    name: name || username,
                    role: 'admin',
                    pharmacyId: pharmacy.id
                }
            });

            return { pharmacy, user };
        });

        res.json({ success: true, data: result });
    } catch (e) { handleError(res, e); }
});

// --- User Management Routes (Admin only) ---

// Get all users


app.get('/api/users', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const where: any = { pharmacyId: req.user.pharmacyId };
        if (!isPlatformAdmin(req.user)) {
            where.username = { not: PLATFORM_ADMIN_USERNAME };
        }

        // Filter users by pharmacyId
        const users = await prisma.user.findMany({
            where,
            select: { id: true, username: true, name: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: users });
    } catch (e) { handleError(res, e); }
});

// Create new user
app.post('/api/users', authenticateToken, async (req: any, res) => {
    try {
        const { username, password, name, role } = req.body;

        if (!requirePharmacyAdmin(req, res)) return;

        if (!username || !password || !name || !role) {
            return res.status(400).json({ success: false, error: { message: 'Missing required user fields' } });
        }

        if (!['admin', 'cashier'].includes(role)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid role' } });
        }

        if (!isPlatformAdmin(req.user) && isReservedUsername(username)) {
            return res.status(403).json({ success: false, error: { message: 'That username is reserved' } });
        }

        // Check if username already exists
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return res.status(400).json({ success: false, error: { message: 'Username already exists' } });
        }

        await enforceLimit(req.user.pharmacyId, 'users');

        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                name,
                role,
                pharmacyId: req.user.pharmacyId
            },
            select: { id: true, username: true, name: true, role: true, createdAt: true }
        });

        res.json({ success: true, data: user });
    } catch (e) { handleError(res, e); }
});

// Update user
app.put('/api/users/:id', authenticateToken, async (req: any, res) => {
    try {
        const id = Number(req.params.id);
        const { username, password, name, role } = req.body;

        if (!requirePharmacyAdmin(req, res)) return;

        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser || existingUser.pharmacyId !== req.user.pharmacyId) {
            return res.status(404).json({ success: false, error: { message: 'User not found' } });
        }

        if (!isPlatformAdmin(req.user) && isReservedUsername(existingUser.username)) {
            return res.status(403).json({ success: false, error: { message: 'That account is reserved' } });
        }

        if (role !== undefined && !['admin', 'cashier'].includes(role)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid role' } });
        }

        if (username && username !== existingUser.username) {
            if (!isPlatformAdmin(req.user) && isReservedUsername(username)) {
                return res.status(403).json({ success: false, error: { message: 'That username is reserved' } });
            }

            const duplicateUser = await prisma.user.findUnique({ where: { username } });
            if (duplicateUser) {
                return res.status(400).json({ success: false, error: { message: 'Username already exists' } });
            }
        }

        const data: any = { username, name, role };
        if (password) {
            const bcrypt = await import('bcryptjs');
            data.password = await bcrypt.default.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, username: true, name: true, role: true, createdAt: true }
        });

        res.json({ success: true, data: user });
    } catch (e) { handleError(res, e); }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, async (req: any, res) => {
    try {
        const id = Number(req.params.id);

        if (!requirePharmacyAdmin(req, res)) return;

        // Prevent deleting self
        if (id === req.user.id) {
            return res.status(400).json({ success: false, error: { message: 'Cannot delete own account' } });
        }

        // Prevent deleting users from other pharmacies (security check)
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser || targetUser.pharmacyId !== req.user.pharmacyId) {
            return res.sendStatus(403);
        }

        if (!isPlatformAdmin(req.user) && isReservedUsername(targetUser.username)) {
            return res.status(403).json({ success: false, error: { message: 'That account is reserved' } });
        }

        // Check if user has sales (optional: soft delete instead?)
        // For now, just delete.
        await prisma.user.delete({ where: { id } });

        res.json({ success: true });
    } catch (e) { handleError(res, e); }
});

// --- Pharmacy Management Routes ---

// Get current pharmacy profile
app.get('/api/pharmacy', authenticateToken, async (req: any, res) => {
    try {
        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: req.user.pharmacyId },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                taxId: true,
                subscriptionTier: true,
                licenseKey: true,
                licenseStatus: true,
                trialEndsAt: true,
                paymentStatus: true,
                featuresEnabled: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!pharmacy) {
            return res.status(404).json({ success: false, error: { message: 'Pharmacy not found' } });
        }

        const settings = parsePharmacyMeta(pharmacy.featuresEnabled);

        res.json({
            success: true,
            data: {
                id: pharmacy.id,
                name: pharmacy.name,
                address: pharmacy.address,
                phone: pharmacy.phone,
                email: pharmacy.email,
                taxId: pharmacy.taxId,
                subscriptionTier: pharmacy.subscriptionTier,
                licenseKey: pharmacy.licenseKey,
                licenseStatus: pharmacy.licenseStatus,
                trialEndsAt: pharmacy.trialEndsAt,
                paymentStatus: pharmacy.paymentStatus,
                createdAt: pharmacy.createdAt,
                updatedAt: pharmacy.updatedAt,
                footer: settings.receiptFooter || 'Merci de votre visite!'
            }
        });
    } catch (e) { handleError(res, e); }
});

// Update pharmacy profile
app.put('/api/pharmacy', authenticateToken, async (req: any, res) => {
    try {
        // Only admin should update?
        if (req.user.role !== 'admin') return res.sendStatus(403);

        const { name, address, phone, email, taxId, footer } = req.body;

        const currentPharmacy = await prisma.pharmacy.findUnique({
            where: { id: req.user.pharmacyId },
            select: { featuresEnabled: true }
        });

        const settings = parsePharmacyMeta(currentPharmacy?.featuresEnabled);
        settings.receiptFooter = footer?.trim() || 'Merci de votre visite!';

        const pharmacy = await prisma.pharmacy.update({
            where: { id: req.user.pharmacyId },
            data: {
                name,
                address,
                phone,
                email,
                taxId,
                featuresEnabled: stringifyPharmacyMeta(settings)
            }
        });

        res.json({
            success: true,
            data: {
                ...pharmacy,
                footer: settings.receiptFooter
            }
        });
    } catch (e) { handleError(res, e); }
});

// --- Shift Routes ---

app.post('/api/shifts/start', authenticateToken, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const startAmount = Number(req.body.startAmount);

        const activeShift = await prisma.shift.findFirst({
            where: {
                userId,
                pharmacyId: req.user.pharmacyId,
                endTime: null
            }
        });

        if (activeShift) {
            return res.status(400).json({
                success: false,
                error: { message: 'User already has an active shift' }
            });
        }

        if (!Number.isFinite(startAmount) || startAmount < 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Opening amount must be a valid positive number' }
            });
        }

        const shift = await prisma.shift.create({
            data: {
                startAmount,
                user: { connect: { id: userId } },
                pharmacy: { connect: { id: req.user.pharmacyId } }
            }
        });

        res.json({ success: true, data: shift });
    } catch (e) { handleError(res, e); }
});

app.post('/api/shifts/end', authenticateToken, async (req: any, res) => {
    try {
        const { shiftId, endAmount, note } = req.body;

        const shift = await prisma.shift.findFirst({
            where: {
                id: Number(shiftId),
                pharmacyId: req.user.pharmacyId
            }
        });

        if (!shift) {
            return res.status(404).json({ success: false, error: { message: 'Shift not found' } });
        }

        if (req.user.role !== 'admin' && shift.userId !== req.user.id) {
            return res.status(403).json({ success: false, error: { message: 'You can only close your own shift' } });
        }

        // Calculate expected amount from cash sales only.
        const sales = await prisma.sale.findMany({
            where: {
                shiftId: shift.id,
                payment_method: 'cash'
            },
            select: { total_amount: true }
        });

        const salesTotal = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
        const expectedAmount = shift.startAmount + salesTotal;

        const updatedShift = await prisma.shift.update({
            where: { id: shift.id },
            data: {
                endTime: new Date(),
                endAmount,
                expectedAmount,
                note
            }
        });

        res.json({ success: true, data: updatedShift });
    } catch (e) { handleError(res, e); }
});

app.get('/api/shifts/active/:userId', authenticateToken, async (req: any, res) => {
    try {
        const requestedUserId = Number(req.params.userId);

        if (req.user.role !== 'admin' && requestedUserId !== req.user.id) {
            return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }

        const shift = await prisma.shift.findFirst({
            where: {
                userId: requestedUserId,
                pharmacyId: req.user.pharmacyId,
                endTime: null
            },
            include: { user: { select: { name: true, username: true } } }
        });

        res.json({ success: true, data: shift });
    } catch (e) { handleError(res, e); }
});





// Dashboard Stats
// Dashboard Stats
app.get('/api/stats/dashboard', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        console.log('[Dashboard] Request from user:', req.user.username, 'Pharmacy:', req.user.pharmacyId);

        const pharmacyId = req.user.pharmacyId;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Previous period for comparison (yesterday)
        const yesterdayStart = new Date(startOfDay);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(endOfDay);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

        // Fetch Today's Sales
        const todaySalesData = await prisma.sale.findMany({
            where: { pharmacyId, timestamp: { gte: startOfDay, lte: endOfDay } },
            include: { items: { include: { product: true } }, invoice: true }
        });

        // Fetch Yesterday's Sales for Comparison
        const yesterdaySalesData = await prisma.sale.findMany({
            where: { pharmacyId, timestamp: { gte: yesterdayStart, lte: yesterdayEnd } }
        });

        // 1. Calculate Today's Metrics
        const revenue = todaySalesData.reduce((sum, s) => sum + s.total_amount, 0);
        const salesCount = todaySalesData.length;
        const customersCount = new Set(todaySalesData.map(s => s.customerId).filter(Boolean)).size;

        // CNAM vs Patient (using Invoice breakdown if available, or approximate from Sales)
        // Assumption: invoice stores cnamAmount. If no invoice, assume generic split or 0
        let cnamAmount = 0;
        let patientAmount = 0;

        todaySalesData.forEach(sale => {
            if (sale.invoice) {
                cnamAmount += sale.invoice.cnamAmount || 0;
                patientAmount += sale.invoice.patientAmount || sale.total_amount;
            } else {
                patientAmount += sale.total_amount;
            }
        });

        // 2. Comparisons
        const yesterdayRevenue = yesterdaySalesData.reduce((sum, s) => sum + s.total_amount, 0);
        const yesterdaySalesCount = yesterdaySalesData.length;

        const revenueGrowth = yesterdayRevenue > 0 ? ((revenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 100;
        const salesGrowth = yesterdaySalesCount > 0 ? ((salesCount - yesterdaySalesCount) / yesterdaySalesCount) * 100 : 100;

        // 3. Trends (Last 7 Days)
        const trends = {
            revenue: [] as any[],
            sales: [] as any[]
        };

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toLocaleDateString('fr-FR', { weekday: 'short' });

            const dStart = new Date(d.setHours(0, 0, 0, 0));
            const dEnd = new Date(d.setHours(23, 59, 59, 999));

            const dayMeta: any = await prisma.sale.aggregate({
                where: { pharmacyId, timestamp: { gte: dStart, lte: dEnd } },
                _sum: { total_amount: true },
                _count: { id: true }
            });

            trends.revenue.push({ date: dStr, amount: dayMeta._sum?.total_amount || 0 });
            trends.sales.push({ date: dStr, count: dayMeta._count?.id || 0 });
        }

        // 4. Top Products
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const recentItems = await prisma.saleItem.findMany({
            where: { sale: { pharmacyId, timestamp: { gte: weekStart } } },
            include: { product: true }
        });

        const productStats = new Map();
        recentItems.forEach((item: any) => {
            const name = item.product?.commercial_name || 'Unknown';
            const current = productStats.get(name) || { name, quantity: 0, revenue: 0 };
            current.quantity += item.quantity;
            current.revenue += (item.unit_price * item.quantity);
            productStats.set(name, current);
        });

        const topProducts = Array.from(productStats.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // 5. Top Customers
        const topCustomers = await prisma.customer.findMany({
            where: { pharmacyId },
            take: 5,
            orderBy: { sales: { _count: 'desc' } },
            include: { sales: { select: { total_amount: true } } }
        });

        const formattedTopCustomers = topCustomers.map((c: any) => ({
            name: c.name,
            invoices: c.sales ? c.sales.length : 0,
            total: c.sales ? c.sales.reduce((sum: number, s: any) => sum + s.total_amount, 0) : 0
        })).sort((a: any, b: any) => b.total - a.total);

        // Construct Final Response
        const data = {
            today: {
                revenue,
                sales: salesCount,
                customers: customersCount,
                cnamAmount,
                patientAmount
            },
            trends,
            topProducts,
            topCustomers: formattedTopCustomers,
            cnamBreakdown: { cnamAmount, patientAmount },
            comparisons: {
                revenueGrowth: Number(revenueGrowth.toFixed(1)),
                salesGrowth: Number(salesGrowth.toFixed(1)),
                customerGrowth: 0 // Placeholder
            }
        };

        res.json({ success: true, data });
    } catch (e) {
        handleError(res, e);
    }
});

// ============================================
// BACKUP & SECURITY API ROUTES
// ============================================

// Backup Management (Admin Only)
app.post('/api/backups', authenticateToken, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const { description } = req.body;
        const backup = await createBackup(description);

        // Log the backup creation
        await logActivity({
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            action: 'CREATE_BACKUP',
            details: { description, filename: backup.filename },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.json({ success: true, data: backup });
    } catch (e) { handleError(res, e); }
});

app.get('/api/backups', authenticateToken, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const backups = await listBackups();
        res.json({ success: true, data: backups });
    } catch (e) { handleError(res, e); }
});

app.post('/api/backups/:filename/restore', authenticateToken, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const { filename } = req.params;
        await restoreBackup(filename);

        // Log the restore
        await logActivity({
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            action: 'RESTORE_BACKUP',
            details: { filename },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.json({ success: true, message: 'Database restored successfully. Please restart the application.' });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/backups/:filename', authenticateToken, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const { filename } = req.params;
        await deleteBackup(filename);

        // Log the deletion
        await logActivity({
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            action: 'DELETE_BACKUP',
            details: { filename },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.json({ success: true, message: 'Backup deleted successfully' });
    } catch (e) { handleError(res, e); }
});

// Audit Log Access (Admin Only)
app.get('/api/audit-logs', authenticateToken, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const { userId, action, startDate, endDate, limit, offset } = req.query;

        const result = await getAuditLogs({
            pharmacyId: req.user.pharmacyId,
            userId: userId ? parseInt(userId as string) : undefined,
            action: action as string,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            limit: limit ? parseInt(limit as string) : 100,
            offset: offset ? parseInt(offset as string) : 0,
        });

        res.json({ success: true, data: result });
    } catch (e) { handleError(res, e); }
});

// ============================================
// CLOUD BACKUP MANAGEMENT (Admin Only)
// ============================================

// Get pharmacy cloud settings
app.get('/api/pharmacy/cloud-settings', authenticateToken, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const pharmacyId = req.user.pharmacyId;
        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: pharmacyId },
            select: {
                cloudEnabled: true,
                cloudProvider: true,
                cloudUrl: true,
                cloudApiKey: true,
                cloudBucketName: true,
                lastCloudSync: true
            }
        });

        // Return hasApiKey flag without exposing the actual key
        const responseData = pharmacy ? {
            cloudEnabled: pharmacy.cloudEnabled,
            cloudProvider: pharmacy.cloudProvider,
            cloudUrl: pharmacy.cloudUrl,
            cloudBucketName: pharmacy.cloudBucketName,
            lastCloudSync: pharmacy.lastCloudSync,
            hasApiKey: !!pharmacy.cloudApiKey && pharmacy.cloudApiKey.length > 0
        } : null;

        res.json({ success: true, data: responseData });
    } catch (e) { handleError(res, e); }
});

// Update pharmacy cloud settings
app.put('/api/pharmacy/cloud-settings', authenticateToken, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const pharmacyId = req.user.pharmacyId;
        const { cloudEnabled, cloudUrl, cloudApiKey, cloudBucketName } = req.body;

        // Only update cloudApiKey if a new value is provided (not empty or placeholder)
        const updateData: any = {
            cloudEnabled,
            cloudUrl,
            cloudBucketName: cloudBucketName || 'pharmasoft-backups'
        };

        // Only update API key if a new one is provided (not placeholder dots, not empty)
        // Valid Supabase keys start with 'eyJ' (JWT format)
        const isPlaceholder = !cloudApiKey || cloudApiKey.includes('•') || cloudApiKey.trim() === '';
        const isValidKey = cloudApiKey && cloudApiKey.startsWith('eyJ');

        if (isValidKey) {
            updateData.cloudApiKey = cloudApiKey;
        } else if (!isPlaceholder) {
            // Key provided but invalid format - still save it but log warning
            console.warn('Cloud API key does not appear to be a valid Supabase key');
            updateData.cloudApiKey = cloudApiKey;
        }
        // If placeholder, don't update - keep existing key

        const updated = await prisma.pharmacy.update({
            where: { id: pharmacyId },
            data: updateData,
            select: {
                cloudEnabled: true,
                cloudUrl: true,
                cloudBucketName: true
            }
        });

        await logActivity({
            pharmacyId,
            userId: req.user.id,
            action: 'CLOUD_SETTINGS_UPDATE',
            entityType: 'Pharmacy',
            entityId: pharmacyId,
            details: { cloudEnabled, cloudUrl: cloudUrl?.substring(0, 30) + '...' },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, data: updated });
    } catch (e) { handleError(res, e); }
});

// Upload backup to cloud
app.post('/api/cloud-backups', authenticateToken, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const { description } = req.body;
        const pharmacyId = req.user.pharmacyId;

        const result = await cloudBackupService.uploadBackup(pharmacyId, description);

        await logActivity({
            pharmacyId,
            userId: req.user.id,
            action: 'CLOUD_BACKUP_UPLOAD',
            entityType: 'CloudBackup',
            details: { filename: result.name, size: result.size },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, data: result });
    } catch (e) { handleError(res, e); }
});

// List cloud backups
app.get('/api/cloud-backups', authenticateToken, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const pharmacyId = req.user.pharmacyId;
        const backups = await cloudBackupService.listBackups(pharmacyId);

        res.json({ success: true, data: backups });
    } catch (e) { handleError(res, e); }
});

// Restore from cloud backup
app.post('/api/cloud-backups/restore', authenticateToken, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const { filename } = req.body;
        const pharmacyId = req.user.pharmacyId;
        await cloudBackupService.restoreBackup(pharmacyId, filename);

        await logActivity({
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            action: 'CLOUD_BACKUP_RESTORE',
            entityType: 'CloudBackup',
            details: { filename },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: 'Cloud backup restored successfully. Please restart the application.' });
    } catch (e) { handleError(res, e); }
});

// Delete cloud backup
app.delete('/api/cloud-backups/:filename', authenticateToken, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const { filename } = req.params;
        const pharmacyId = req.user.pharmacyId;
        await cloudBackupService.deleteBackup(pharmacyId, filename);

        await logActivity({
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            action: 'CLOUD_BACKUP_DELETE',
            entityType: 'CloudBackup',
            details: { filename },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ success: true, message: 'Cloud backup deleted successfully' });
    } catch (e) { handleError(res, e); }
});

// Test cloud connection
// Test cloud connection
app.post('/api/cloud-backups/test-connection', authenticateToken, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }

        const pharmacyId = req.user.pharmacyId;
        const { cloudUrl, cloudApiKey, cloudBucketName } = req.body;

        let overrides = {};
        if (cloudUrl) overrides = { ...overrides, supabaseUrl: cloudUrl };
        if (cloudApiKey) overrides = { ...overrides, supabaseKey: cloudApiKey };
        if (cloudBucketName) overrides = { ...overrides, bucketName: cloudBucketName };

        const isConnected = await cloudBackupService.testConnection(pharmacyId, overrides);
        res.json({ success: true, data: { connected: isConnected } });
    } catch (e) { handleError(res, e); }
});

// ============================================
// LICENSE & SUBSCRIPTION MANAGEMENT
// ============================================

// Redeem license key (User facing)
app.post('/api/license/redeem', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const { licenseKey } = req.body;

        if (!licenseKey) {
            return res.status(400).json({
                success: false,
                error: { message: 'License key is required' }
            });
        }

        // Validate format (Simple check)
        if (!licenseKey.startsWith('PHARMA-') && !licenseKey.startsWith('PRO-')) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid license key format. Key must start with PHARMA- or PRO-' }
            });
        }

        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: req.user.pharmacyId },
            select: {
                id: true,
                subscriptionTier: true,
                licenseKey: true,
                licenseStatus: true,
                licenseActivatedAt: true,
                licenseExpiresAt: true,
                paymentStatus: true,
                featuresEnabled: true,
            },
        });

        if (!pharmacy) {
            return res.status(404).json({
                success: false,
                error: { message: 'Pharmacy not found' }
            });
        }

        if (pharmacy.licenseStatus === 'suspended') {
            return res.status(403).json({
                success: false,
                error: { message: 'Suspended licenses cannot be reactivated locally' }
            });
        }

        const meta = parsePharmacyMeta(pharmacy.featuresEnabled);
        const assignedLicenseKey = pharmacy.licenseKey
            || ((meta.productAccess as Record<string, any> | undefined)?.pharmasoft as Record<string, any> | undefined)?.licenseKey;

        if (!assignedLicenseKey || assignedLicenseKey !== licenseKey) {
            return res.status(403).json({
                success: false,
                error: { message: 'This license key is not assigned to the current pharmacy' }
            });
        }

        if (pharmacy.paymentStatus !== 'paid') {
            return res.status(403).json({
                success: false,
                error: { message: 'This pharmacy does not have an active paid desktop entitlement' }
            });
        }

        if (pharmacy.licenseExpiresAt && pharmacy.licenseExpiresAt < new Date()) {
            return res.status(403).json({
                success: false,
                error: { message: 'This license has expired and cannot be reactivated locally' }
            });
        }

        const tier = pharmacy.subscriptionTier === 'enterprise' ? 'enterprise' : 'professional';
        const limits = LicenseService.getTierLimits(tier);
        meta.features = [...limits.features];

        const updated = await prisma.pharmacy.update({
            where: { id: req.user.pharmacyId },
            data: {
                licenseKey: assignedLicenseKey,
                subscriptionTier: tier,
                licenseStatus: 'active',
                licenseActivatedAt: pharmacy.licenseActivatedAt || new Date(),
                paymentStatus: 'paid',
                maxProducts: limits.maxProducts,
                maxUsers: limits.maxUsers,
                maxSalesPerMonth: limits.maxSalesPerMonth,
                featuresEnabled: stringifyPharmacyMeta(meta)
            }
        });

        res.json({
            success: true,
            data: {
                tier: updated.subscriptionTier,
                message: 'Desktop license activated successfully!'
            }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Validate license key
app.post('/api/license/validate', async (req, res) => {
    try {
        const { licenseKey } = req.body;

        if (!licenseKey) {
            return res.status(400).json({
                success: false,
                error: { message: 'License key required' }
            });
        }

        const result = await LicenseService.validateLicense(licenseKey);

        res.json({
            success: result.valid,
            data: result.pharmacy,
            error: result.reason ? { message: result.reason } : undefined
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Get license status
app.get('/api/license/status', authenticateToken, async (req: any, res) => {
    try {
        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: req.user.pharmacyId },
            select: {
                subscriptionTier: true,
                licenseKey: true,
                licenseStatus: true,
                licenseExpiresAt: true,
                trialEndsAt: true,
                paymentStatus: true,
                maxProducts: true,
                maxUsers: true,
                maxSalesPerMonth: true,
                featuresEnabled: true,
                _count: {
                    select: {
                        products: true,
                        users: true,
                        sales: {
                            where: {
                                timestamp: {
                                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!pharmacy) {
            return res.status(404).json({
                success: false,
                error: { message: 'Pharmacy not found' }
            });
        }

        const meta = parsePharmacyMeta(pharmacy.featuresEnabled);
        const features = meta.features.length > 0
            ? meta.features
            : LicenseService.getTierLimits((pharmacy.subscriptionTier === 'enterprise' ? 'enterprise' : pharmacy.subscriptionTier === 'professional' ? 'professional' : 'free')).features;

        res.json({
            success: true,
            data: {
                tier: pharmacy.subscriptionTier,
                status: pharmacy.licenseStatus,
                expiresAt: pharmacy.licenseExpiresAt,
                trialEndsAt: pharmacy.trialEndsAt,
                paymentStatus: pharmacy.paymentStatus,
                limits: {
                    products: { current: pharmacy._count.products, max: pharmacy.maxProducts },
                    users: { current: pharmacy._count.users, max: pharmacy.maxUsers },
                    sales: { current: pharmacy._count.sales, max: pharmacy.maxSalesPerMonth }
                },
                features
            }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Start free trial
app.post('/api/trial/start', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: req.user.pharmacyId },
            select: { trialEndsAt: true, licenseStatus: true }
        });

        if (pharmacy?.trialEndsAt) {
            if (pharmacy.trialEndsAt > new Date()) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Trial already active' }
                });
            }

            return res.status(400).json({
                success: false,
                error: { message: 'The free trial has already been used for this pharmacy' }
            });
        }

        if (pharmacy?.licenseStatus === 'active') {
            return res.status(400).json({
                success: false,
                error: { message: 'Already have active license' }
            });
        }

        await LicenseService.startTrial(req.user.pharmacyId);

        res.json({
            success: true,
            data: { message: '14-day trial started successfully' }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Check specific limit
app.get('/api/limits/check/:type', authenticateToken, async (req: any, res) => {
    try {
        const { type } = req.params;

        if (!['products', 'users', 'sales'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid limit type' }
            });
        }

        const result = await LicenseService.checkLimit(
            req.user.pharmacyId,
            type as 'products' | 'users' | 'sales'
        );

        res.json({
            success: true,
            data: result
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Check feature access
app.get('/api/features/:feature', authenticateToken, async (req: any, res) => {
    try {
        const { feature } = req.params;
        const hasAccess = await LicenseService.hasFeature(req.user.pharmacyId, feature);

        res.json({
            success: true,
            data: { hasAccess, feature }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Activate license (admin only)
app.post('/api/license/activate', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePlatformAdmin(req, res)) return;

        const { tier, durationMonths } = req.body;

        if (!['professional', 'enterprise'].includes(tier)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid tier' }
            });
        }

        const licenseKey = await LicenseService.activateLicense(
            req.user.pharmacyId,
            tier,
            durationMonths || 1
        );

        res.json({
            success: true,
            data: { licenseKey, tier, message: 'License activated successfully' }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Stripe webhook handler
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripe = await import('stripe');
    const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-12-18.acacia'
    });

    try {
        const event = stripeClient.webhooks.constructEvent(
            req.body,
            sig as string,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as any;
                // Activate license after successful payment
                const pharmacyId = parseInt(session.metadata.pharmacyId);
                const tier = session.metadata.tier || 'professional';

                await LicenseService.activateLicense(pharmacyId, tier as any, 12);

                // Update payment status
                await prisma.pharmacy.update({
                    where: { id: pharmacyId },
                    data: {
                        stripeCustomerId: session.customer,
                        stripeSubscriptionId: session.subscription,
                        paymentStatus: 'paid'
                    }
                });
                break;

            case 'customer.subscription.deleted':
                const subscription = event.data.object as any;
                await prisma.pharmacy.update({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        licenseStatus: 'expired',
                        paymentStatus: 'canceled'
                    }
                });
                break;

            case 'invoice.payment_failed':
                const invoice = event.data.object as any;
                await prisma.pharmacy.update({
                    where: { stripeCustomerId: invoice.customer },
                    data: { paymentStatus: 'past_due' }
                });
                break;
        }

        res.json({ received: true });
    } catch (e) {
        console.error('Stripe webhook error:', e);
        res.status(400).send(`Webhook Error: ${e.message}`);
    }
});

// Create Stripe Checkout Session
app.post('/api/checkout/create', authenticateToken, async (req: any, res) => {
    try {
        if (!requirePharmacyAdmin(req, res)) return;

        const { tier } = req.body;

        if (tier !== 'professional' && tier !== 'enterprise') {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid subscription tier' }
            });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(503).json({
                success: false,
                error: { message: 'Stripe checkout is not configured. Add STRIPE_SECRET_KEY to enable upgrades.' }
            });
        }

        const stripe = await import('stripe');
        const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2024-12-18.acacia'
        });

        const prices = {
            professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
            enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID
        };

        const priceId = prices[tier as keyof typeof prices];
        if (!priceId) {
            return res.status(503).json({
                success: false,
                error: { message: `Stripe price for the ${tier} plan is not configured.` }
            });
        }
        const appUrl = process.env.APP_URL || 'http://localhost:5173';

        const session = await stripeClient.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/upgrade`,
            metadata: {
                pharmacyId: req.user.pharmacyId.toString(),
                tier
            }
        });

        res.json({
            success: true,
            data: { sessionId: session.id, url: session.url }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// ============================================
// ADMIN MANAGEMENT ENDPOINTS
// ============================================

// Admin middleware
const requireAdmin = async (req: any, res: any, next: any) => {
    if (!requirePlatformAdmin(req, res)) return;

    next();
};

// Get all pharmacies (Admin only)
app.get('/api/admin/pharmacies', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pharmacies = await prisma.pharmacy.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                        sales: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: pharmacies
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Get dashboard statistics (Admin only)
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalPharmacies = await prisma.pharmacy.count();
        const freePharmacies = await prisma.pharmacy.count({
            where: { subscriptionTier: 'free' }
        });
        const professionalPharmacies = await prisma.pharmacy.count({
            where: { subscriptionTier: 'professional' }
        });
        const enterprisePharmacies = await prisma.pharmacy.count({
            where: { subscriptionTier: 'enterprise' }
        });
        const activeTrials = await prisma.pharmacy.count({
            where: {
                trialEndsAt: { gt: new Date() },
                paymentStatus: 'unpaid'
            }
        });
        const paidSubscriptions = await prisma.pharmacy.count({
            where: {
                paymentStatus: 'paid',
                licenseStatus: 'active'
            }
        });

        // Calculate MRR (Monthly Recurring Revenue)
        const mrr = paidSubscriptions * 29; // Assuming $29/month

        res.json({
            success: true,
            data: {
                total: totalPharmacies,
                free: freePharmacies,
                professional: professionalPharmacies,
                enterprise: enterprisePharmacies,
                trials: activeTrials,
                paid: paidSubscriptions,
                mrr: mrr,
                arr: mrr * 12
            }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Manually upgrade pharmacy (Admin only)
app.post('/api/admin/pharmacy/:id/upgrade', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { tier, durationMonths } = req.body;

        const licenseKey = await LicenseService.activateLicense(
            parseInt(id),
            tier,
            durationMonths || 12
        );

        res.json({
            success: true,
            data: {
                message: 'Pharmacy upgraded successfully',
                licenseKey
            }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Suspend pharmacy (Admin only)
app.post('/api/admin/pharmacy/:id/suspend', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.pharmacy.update({
            where: { id: parseInt(id) },
            data: {
                isActive: false,
                licenseStatus: 'suspended'
            }
        });

        res.json({
            success: true,
            data: { message: 'Pharmacy suspended successfully' }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Reactivate pharmacy (Admin only)
app.post('/api/admin/pharmacy/:id/reactivate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.pharmacy.update({
            where: { id: parseInt(id) },
            data: {
                isActive: true,
                licenseStatus: 'active'
            }
        });

        res.json({
            success: true,
            data: { message: 'Pharmacy reactivated successfully' }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// Get recent activity (Admin only)
app.get('/api/admin/activity', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const recentPharmacies = await prisma.pharmacy.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                subscriptionTier: true,
                createdAt: true
            }
        });

        const recentSales = await prisma.sale.findMany({
            take: 10,
            orderBy: { timestamp: 'desc' },
            include: {
                pharmacy: {
                    select: { name: true }
                }
            }
        });

        res.json({
            success: true,
            data: {
                recentSignups: recentPharmacies,
                recentSales: recentSales
            }
        });
    } catch (e) {
        handleError(res, e);
    }
});

// --- NOTIFICATION ROUTES ---
app.get('/api/notifications', authenticateToken, async (req: any, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { pharmacyId: req.user.pharmacyId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const unreadCount = await prisma.notification.count({
            where: { pharmacyId: req.user.pharmacyId, read: false }
        });

        res.json({ success: true, data: { notifications, unreadCount } });
    } catch (e) { handleError(res, e); }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req: any, res) => {
    try {
        const id = Number(req.params.id);
        // Verify ownership indirectly via search? or just trust ID if unique
        // Better to check pharmacy ownership if strict, but strictness might be overkill for notifications
        // Let's safe guard:
        const notif = await prisma.notification.findFirst({ where: { id, pharmacyId: req.user.pharmacyId } });
        if (!notif) return res.status(404).json({ error: { message: "Notification not found" } });

        const updated = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        res.json({ success: true, data: updated });
    } catch (e) { handleError(res, e); }
});

app.patch('/api/notifications/read-all', authenticateToken, async (req: any, res) => {
    try {
        await prisma.notification.updateMany({
            where: { pharmacyId: req.user.pharmacyId, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (e) { handleError(res, e); }
});

// --- SUPPORT ROUTES ---
app.get('/api/support/tickets', authenticateToken, async (req: any, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            where: { pharmacyId: req.user.pharmacyId },
            orderBy: { createdAt: 'desc' },
            include: { pharmacy: true } // Optional debug
        });
        res.json({ success: true, data: tickets });
    } catch (e) { handleError(res, e); }
});

app.post('/api/support/tickets', authenticateToken, async (req: any, res) => {
    try {
        const { subject, category, message } = req.body;
        const ticket = await prisma.ticket.create({
            data: {
                pharmacyId: req.user.pharmacyId,
                subject,
                category,
                message,
                status: 'open',
                priority: 'normal'
            }
        });
        res.json({ success: true, data: ticket });
    } catch (e) { handleError(res, e); }
});

app.post('/api/support/tickets/:id/reply', authenticateToken, async (req: any, res) => {
    try {
        const { message } = req.body;
        const ticketId = parseInt(req.params.id);

        // Fetch existing responses
        // Verify ownership
        const ticket = await prisma.ticket.findFirst({
            where: { id: ticketId, pharmacyId: req.user.pharmacyId }
        });
        if (!ticket) return res.status(404).json({ error: { message: "Ticket not found" } });

        const responses = ticket.responses ? JSON.parse(ticket.responses) : [];

        // Add new response
        responses.push({
            sender: 'user',
            name: req.user.username, // or 'You'
            message: message,
            date: new Date().toISOString()
        });

        // Update ticket
        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                responses: JSON.stringify(responses),
                status: 'open' // Re-open or keep open
            }
        });

        res.json({ success: true, data: updated });
    } catch (e) { handleError(res, e); }
});


// --- ADMIN SUPPORT ROUTES ---
app.get('/api/admin/tickets', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            include: {
                pharmacy: { select: { name: true, email: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: tickets });
    } catch (e) { handleError(res, e); }
});

app.put('/api/admin/tickets/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
        const { status } = req.body; // 'open', 'resolved'
        const ticket = await prisma.ticket.update({
            where: { id: parseInt(req.params.id) },
            data: { status }
        });
        res.json({ success: true, data: ticket });
    } catch (e) { handleError(res, e); }
});

app.post('/api/admin/tickets/:id/reply', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
        const { message } = req.body;
        const ticketId = parseInt(req.params.id);

        // Fetch existing responses
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) return res.status(404).json({ error: { message: "Ticket not found" } });

        const responses = ticket.responses ? JSON.parse(ticket.responses) : [];

        // Add new response
        responses.push({
            sender: 'admin',
            name: req.user.username,
            message: message,
            date: new Date().toISOString()
        });

        // CREATE NOTIFICATION FOR USER
        await prisma.notification.create({
            data: {
                pharmacyId: ticket.pharmacyId,
                title: 'New Reply to Ticket',
                message: `Admin replied to: ${ticket.subject}`,
                type: 'info',
                link: String(ticket.id)
            }
        });

        // Update ticket
        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                responses: JSON.stringify(responses),
                status: 'in_progress'
            }
        });

        res.json({ success: true, data: updated });
    } catch (e) { handleError(res, e); }
});

// ============================================
// SERVER START & INITIALIZATION
// ============================================

export function startServer(): Promise<Server | null> {
    if (server) {
        return Promise.resolve(server);
    }

    if (startPromise) {
        return startPromise;
    }

    if (!autoBackupScheduled) {
        scheduleAutoBackup();
        autoBackupScheduled = true;
    }

    startPromise = new Promise((resolve, reject) => {
        const listener = app.listen(PORT);

        listener.once('listening', () => {
            server = listener;
            startPromise = null;
            console.log(`Backend API running on http://localhost:${PORT}`);
            resolve(listener);
        });

        listener.once('error', (error: NodeJS.ErrnoException) => {
            startPromise = null;

            if (error.code === 'EADDRINUSE') {
                console.warn(`Backend API port ${PORT} is already in use. Using existing server.`);
                resolve(null);
                return;
            }

            console.error('Server failed to start:', error);
            reject(error);
        });
    });

    return startPromise;
}

export function stopServer(): Promise<void> {
    if (!server) {
        return Promise.resolve();
    }

    const activeServer = server;
    server = null;

    return new Promise((resolve, reject) => {
        activeServer.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}
