import express from 'express';
import cors from 'cors';
import { prisma } from '../../../packages/database/src/index.ts';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Helper for error handling
const handleError = (res: any, error: any) => {
    console.error('API Error:', error);
    if (error.code === 'P2002') {
        return res.status(400).json({
            success: false,
            error: { message: 'Unique constraint failed', code: 'P2002' }
        });
    }
    res.status(500).json({
        success: false,
        error: { message: error.message || 'Internal server error' }
    });
};

// --- Products Routes ---

// Get All Products (Paginated)
app.get('/api/products', async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                skip,
                take: limit,
                orderBy: { commercial_name: 'asc' },
            }),
            prisma.product.count(),
        ]);

        res.json({ success: true, data: { products, total } });
    } catch (error) {
        handleError(res, error);
    }
});

// Search Products
app.get('/api/products/search', async (req, res) => {
    try {
        const query = String(req.query.q || '');
        const limit = Number(req.query.limit) || 10;

        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { commercial_name: { contains: query } },
                    { barcode: { contains: query } },
                ],
            },
            take: limit,
        });

        res.json({ success: true, data: products });
    } catch (error) {
        handleError(res, error);
    }
});

// Get Low Stock
app.get('/api/products/low-stock', async (req, res) => {
    try {
        // Find products where current_stock <= low_stock_threshold
        // Note: Prisma doesn't support field comparison in where easily, 
        // so we fetch all and filter or use raw query. 
        // For MVP we fetch all (optimization later).
        // Actually, schema has default 10.
        // We can use raw query for performance.
        const products = await prisma.$queryRaw`
            SELECT * FROM Product 
            WHERE current_stock <= low_stock_threshold
        `;
        res.json({ success: true, data: products });
    } catch (error) {
        handleError(res, error);
    }
});

// Create Product
app.post('/api/products', async (req, res) => {
    try {
        const product = await prisma.product.create({
            data: {
                ...req.body,
                low_stock_threshold: req.body.low_stock_threshold ?? 5,
            },
        });
        res.json({ success: true, data: product });
    } catch (error) {
        handleError(res, error);
    }
});

// Update Product
app.put('/api/products/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const product = await prisma.product.update({
            where: { id },
            data: req.body,
        });
        res.json({ success: true, data: product });
    } catch (error) {
        handleError(res, error);
    }
});

// Delete Product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Check sales first
        const salesCount = await prisma.saleItem.count({ where: { productId: id } });
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
app.get('/api/customers', async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const search = req.query.search as string || '';
        const customerType = req.query.customerType as string;

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } },
                { address: { contains: search } }
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
                orderBy: { createdAt: 'desc' }
                // Temporarily removed _count to debug
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
app.get('/api/customers/search', async (req, res) => {
    try {
        const query = req.query.q as string || '';
        const limit = Number(req.query.limit) || 10;

        if (!query || query.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const customers = await prisma.customer.findMany({
            where: {
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
app.post('/api/customers', async (req, res) => {
    try {
        const { name, phone, email, address, customerType, taxId, cnamNumber } = req.body;

        // Validation
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Customer name is required' }
            });
        }

        // Check for duplicate phone if provided
        if (phone) {
            const existing = await prisma.customer.findFirst({
                where: { phone }
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'A customer with this phone number already exists' }
                });
            }
        }

        // Check for duplicate email if provided
        if (email) {
            const existing = await prisma.customer.findFirst({
                where: { email }
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
                name: name.trim(),
                phone: phone || null,
                email: email || null,
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
app.get('/api/customers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Temporarily removed includes to debug
        const customer = await prisma.customer.findUnique({
            where: { id }
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
app.put('/api/customers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, phone, email, address, customerType, taxId, cnamNumber } = req.body;

        // Check if customer exists
        const existing = await prisma.customer.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { message: 'Customer not found' }
            });
        }

        // Validation
        if (name !== undefined && (!name || name.trim().length === 0)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Customer name cannot be empty' }
            });
        }

        // Check for duplicate phone (excluding current customer)
        if (phone && phone !== existing.phone) {
            const duplicate = await prisma.customer.findFirst({
                where: {
                    phone,
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
        if (email && email !== existing.email) {
            const duplicate = await prisma.customer.findFirst({
                where: {
                    email,
                    id: { not: id }
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
                name: name !== undefined ? name.trim() : undefined,
                phone: phone !== undefined ? phone || null : undefined,
                email: email !== undefined ? email || null : undefined,
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
app.delete('/api/customers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Check if customer exists
        const customer = await prisma.customer.findUnique({
            where: { id },
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

        await prisma.customer.delete({ where: { id } });
        res.json({ success: true, data: true });
    } catch (e) {
        console.error('Delete customer error:', e);
        handleError(res, e);
    }
});

// Find or Create Customer (backward compatibility for POS)
app.post('/api/customers/find-or-create', async (req, res) => {
    try {
        const { name, phone, email } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Customer name is required' }
            });
        }

        // Try to find by phone first, then by name
        let customer = null;

        if (phone) {
            customer = await prisma.customer.findFirst({
                where: { phone }
            });
        }

        if (!customer && email) {
            customer = await prisma.customer.findFirst({
                where: { email }
            });
        }

        if (!customer) {
            customer = await prisma.customer.findFirst({
                where: {
                    name: { equals: name.trim(), mode: 'insensitive' }
                }
            });
        }

        // Create if not found
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    name: name.trim(),
                    phone: phone || null,
                    email: email || null,
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
async function getNextInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    // Get the latest invoice for this year
    const latestInvoice = await prisma.invoice.findFirst({
        where: {
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
app.get('/api/invoices', async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
        const invoiceType = req.query.invoiceType as string;
        const isPaid = req.query.isPaid === 'true' ? true : req.query.isPaid === 'false' ? false : undefined;
        const search = req.query.search as string || '';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (customerId) {
            where.customerId = customerId;
        }

        if (invoiceType && invoiceType !== 'all') {
            where.invoiceType = invoiceType;
        }

        if (isPaid !== undefined) {
            where.isPaid = isPaid;
        }

        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search } },
                { customerName: { contains: search } },
                { notes: { contains: search } }
            ];
        }

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { invoiceDate: 'desc' }
                // Temporarily removed includes to debug
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
        console.error('Get invoices error:', e);
        handleError(res, e);
    }
});

// Get Invoice by ID
app.get('/api/invoices/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const invoice = await prisma.invoice.findUnique({
            where: { id },
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
app.post('/api/invoices', async (req, res) => {
    try {
        const {
            customerId,
            saleId,
            invoiceType,
            items,
            notes,
            userId,
            paymentMethod,
            isPaid
        } = req.body;

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

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: { message: 'User ID is required' }
            });
        }

        // Get customer details
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: { message: 'Customer not found' }
            });
        }

        // Generate invoice number
        const invoiceNumber = await getNextInvoiceNumber();

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

        // Create invoice with items
        const invoice = await prisma.invoice.create({
            data: {
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
                taxAmount: 0, // Can be calculated if needed
                discountAmount: 0,
                totalAmount: subtotal,
                cnamAmount: cnamTotal,
                patientAmount: patientTotal,

                // Payment
                paymentMethod: paymentMethod || 'cash',
                isPaid: isPaid !== undefined ? isPaid : true,
                paidAt: isPaid ? new Date() : null,

                // Metadata
                notes: notes || null,
                saleId: saleId || null,
                createdById: userId,

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
app.patch('/api/invoices/:id/payment', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isPaid, paidAt, paymentMethod } = req.body;

        const invoice = await prisma.invoice.findUnique({
            where: { id }
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
app.patch('/api/invoices/:id/print', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const invoice = await prisma.invoice.findUnique({
            where: { id }
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
app.get('/api/invoices/stats/summary', async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

        const where: any = {};
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
app.delete('/api/invoices/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const invoice = await prisma.invoice.findUnique({
            where: { id }
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


app.post('/api/sales', async (req, res) => {
    try {
        const { items, paymentMethod, total, customerInfo, userId, shiftId } = req.body;

        let customerId = null;
        if (customerInfo) {
            // Find or create customer inside transaction? 
            // Simplified: do it separately or here.
            // Just use what we have.
            // Ideally should be transaction.
            const c = await prisma.customer.upsert({
                where: { phone: customerInfo.phone || '000000000' }, // Hacky unique constraint if phone exists
                update: {},
                create: { name: customerInfo.name, phone: customerInfo.phone }
            });
            customerId = c.id;
        }

        const sale = await prisma.sale.create({
            data: {
                total_amount: total,
                payment_method: paymentMethod,
                customerId,
                userId,
                shiftId,
                items: {
                    create: items.map((item: any) => ({
                        productId: item.product.id,
                        quantity: item.quantity,
                        unit_price: item.product.public_price
                    }))
                }
            },
            include: { items: { include: { product: true } }, customer: true }
        });

        // Update Stock
        for (const item of items) {
            await prisma.product.update({
                where: { id: item.product.id },
                data: { current_stock: { decrement: item.quantity } }
            });
        }

        console.log('Sale created successfully:', sale.id);
        const responseData = {
            success: true,
            data: {
                saleId: sale.id,
                items: sale.items,
                total_amount: sale.total_amount,
                timestamp: sale.timestamp,
                payment_method: sale.payment_method
            }
        };
        console.log('Sending response:', responseData);
        res.json(responseData);
    } catch (e) {
        console.error('Sales endpoint error:', e);
        handleError(res, e);
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const sales = await prisma.sale.findMany({
            take: limit,
            orderBy: { timestamp: 'desc' },
            include: {
                customer: true,
                items: { include: { product: true } },
                user: { select: { id: true, name: true, username: true } }
            }
        });

        // Map to include user_id at root level for easier filtering
        const salesWithUserId = sales.map(sale => ({
            ...sale,
            user_id: sale.userId
        }));

        res.json({ success: true, data: salesWithUserId });
    } catch (e) { handleError(res, e); }
});

// Sales Reports
app.get('/api/reports/sales', async (req, res) => {
    try {
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

        const where: any = {};
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
app.post('/api/stock-adjustments', async (req, res) => {
    try {
        const { productId, quantity, reason, notes, userId } = req.body;

        // Create adjustment record
        const adjustment = await prisma.stockAdjustment.create({
            data: { productId, quantity, reason, notes, userId }
        });

        // Update product stock
        await prisma.product.update({
            where: { id: productId },
            data: { current_stock: { increment: quantity } }
        });

        res.json({ success: true, data: adjustment });
    } catch (e) { handleError(res, e); }
});

// Get stock adjustments history
app.get('/api/stock-adjustments', async (req, res) => {
    try {
        const productId = req.query.productId ? Number(req.query.productId) : null;

        const adjustments = await prisma.stockAdjustment.findMany({
            where: productId ? { productId } : undefined,
            include: {
                product: { select: { commercial_name: true, barcode: true } },
                user: { select: { name: true, username: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json({ success: true, data: adjustments });
    } catch (e) { handleError(res, e); }
});

// --- Authentication Routes ---

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, username: true, name: true, role: true, password: true }
        });

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
        }

        // Remove password from response
        const { password: _, ...userData } = user;
        res.json({ success: true, data: userData });
    } catch (e) { handleError(res, e); }
});

// --- User Management Routes (Admin only) ---

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, name: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: users });
    } catch (e) { handleError(res, e); }
});

// Create new user
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, name, role } = req.body;

        // Check if username already exists
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return res.status(400).json({ success: false, error: { message: 'Username already exists' } });
        }

        const user = await prisma.user.create({
            data: { username, password, name, role },
            select: { id: true, username: true, name: true, role: true, createdAt: true }
        });

        res.json({ success: true, data: user });
    } catch (e) { handleError(res, e); }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { username, password, name, role } = req.body;

        const data: any = { username, name, role };
        if (password) {
            data.password = password;
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
app.delete('/api/users/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Prevent deleting user with active shifts or sales
        const activeShift = await prisma.shift.findFirst({ where: { userId: id, endTime: null } });
        if (activeShift) {
            return res.status(400).json({ success: false, error: { message: 'Cannot delete user with active shift' } });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ success: true, data: true });
    } catch (e) { handleError(res, e); }
});

// --- Shift Routes ---

app.post('/api/shifts/start', async (req, res) => {
    try {
        const { userId, startAmount } = req.body;

        // Check if user has an active shift
        const activeShift = await prisma.shift.findFirst({
            where: { userId, endTime: null }
        });

        if (activeShift) {
            return res.status(400).json({
                success: false,
                error: { message: 'User already has an active shift' }
            });
        }

        const shift = await prisma.shift.create({
            data: { userId, startAmount }
        });

        res.json({ success: true, data: shift });
    } catch (e) { handleError(res, e); }
});

app.post('/api/shifts/end', async (req, res) => {
    try {
        const { shiftId, endAmount, note } = req.body;

        // Calculate expected amount from sales
        const sales = await prisma.sale.findMany({
            where: { shiftId },
            select: { total_amount: true }
        });

        const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
        if (!shift) {
            return res.status(404).json({ success: false, error: { message: 'Shift not found' } });
        }

        const salesTotal = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
        const expectedAmount = shift.startAmount + salesTotal;

        const updatedShift = await prisma.shift.update({
            where: { id: shiftId },
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

app.get('/api/shifts/active/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const shift = await prisma.shift.findFirst({
            where: { userId, endTime: null },
            include: { user: { select: { name: true, username: true } } }
        });

        res.json({ success: true, data: shift });
    } catch (e) { handleError(res, e); }
});

// --- Analytics/Statistics API ---
app.get('/api/stats/dashboard', async (req, res) => {
    try {
        const range = req.query.range as string || 'week';

        // Calculate date range
        const now = new Date();
        let startDate = new Date();

        switch (range) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        // Get invoices for the period
        const invoices = await prisma.invoice.findMany({
            where: {
                invoiceDate: {
                    gte: startDate
                }
            },
            include: {
                items: true,
                customer: true
            },
            orderBy: { invoiceDate: 'desc' }
        });

        // Calculate today's stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayInvoices = invoices.filter(inv =>
            new Date(inv.invoiceDate) >= todayStart
        );

        const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const todayCnam = todayInvoices.reduce((sum, inv) => sum + inv.cnamAmount, 0);
        const todayPatient = todayInvoices.reduce((sum, inv) => sum + inv.patientAmount, 0);

        // Get unique customers today
        const todayCustomers = new Set(todayInvoices.map(inv => inv.customerId)).size;

        // Calculate revenue trend (last 30 days)
        const last30Days = new Date();
        last30Days.setDate(now.getDate() - 30);

        const trendInvoices = await prisma.invoice.findMany({
            where: {
                invoiceDate: { gte: last30Days }
            },
            select: {
                invoiceDate: true,
                totalAmount: true
            }
        });

        // Group by date
        const revenueByDate = new Map();
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(now.getDate() - (29 - i));
            const dateKey = date.toISOString().split('T')[0];
            revenueByDate.set(dateKey, 0);
        }

        trendInvoices.forEach(inv => {
            const dateKey = new Date(inv.invoiceDate).toISOString().split('T')[0];
            if (revenueByDate.has(dateKey)) {
                revenueByDate.set(dateKey, revenueByDate.get(dateKey) + inv.totalAmount);
            }
        });

        const revenueTrend = Array.from(revenueByDate.entries()).map(([date, amount]) => ({
            date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            amount: amount
        }));

        // Top products from invoice items
        const productSales = new Map();
        invoices.forEach(invoice => {
            invoice.items.forEach(item => {
                const existing = productSales.get(item.productName) || { quantity: 0, revenue: 0 };
                productSales.set(item.productName, {
                    name: item.productName,
                    quantity: existing.quantity + item.quantity,
                    revenue: existing.revenue + item.totalPrice
                });
            });
        });

        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Top customers
        const customerSales = new Map();
        invoices.forEach(invoice => {
            const existing = customerSales.get(invoice.customerId) || {
                name: invoice.customerName,
                invoices: 0,
                total: 0
            };
            customerSales.set(invoice.customerId, {
                name: invoice.customerName,
                invoices: existing.invoices + 1,
                total: existing.total + invoice.totalAmount
            });
        });

        const topCustomers = Array.from(customerSales.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // CNAM breakdown
        const totalCnam = invoices.reduce((sum, inv) => sum + inv.cnamAmount, 0);
        const totalPatient = invoices.reduce((sum, inv) => sum + inv.patientAmount, 0);

        // Growth comparisons (compare with previous period)
        const previousPeriodStart = new Date(startDate);
        previousPeriodStart.setTime(startDate.getTime() - (now.getTime() - startDate.getTime()));

        const previousInvoices = await prisma.invoice.findMany({
            where: {
                invoiceDate: {
                    gte: previousPeriodStart,
                    lt: startDate
                }
            }
        });

        const previousRevenue = previousInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const currentRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

        const revenueGrowth = previousRevenue > 0
            ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
            : 0;

        const salesGrowth = previousInvoices.length > 0
            ? ((invoices.length - previousInvoices.length) / previousInvoices.length * 100).toFixed(1)
            : 0;

        // Response
        res.json({
            success: true,
            data: {
                today: {
                    revenue: todayRevenue,
                    sales: todayInvoices.length,
                    customers: todayCustomers,
                    cnamAmount: todayCnam,
                    patientAmount: todayPatient
                },
                trends: {
                    revenue: revenueTrend,
                    sales: revenueTrend.map((item, i) => ({
                        date: item.date,
                        count: trendInvoices.filter(inv => {
                            const invDate = new Date(inv.invoiceDate).toISOString().split('T')[0];
                            const trendDate = new Date();
                            trendDate.setDate(now.getDate() - (29 - i));
                            return invDate === trendDate.toISOString().split('T')[0];
                        }).length
                    }))
                },
                topProducts,
                topCustomers,
                cnamBreakdown: {
                    cnamAmount: totalCnam,
                    patientAmount: totalPatient
                },
                comparisons: {
                    revenueGrowth: parseFloat(revenueGrowth as string),
                    salesGrowth: parseFloat(salesGrowth as string),
                    customerGrowth: 0 // Could calculate if we track customer creation dates
                }
            }
        });
    } catch (e) {
        console.error('Stats error:', e);
        handleError(res, e);
    }
});


app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
});
