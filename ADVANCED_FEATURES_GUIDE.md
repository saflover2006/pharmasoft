# Complete Implementation Guide - 4 Advanced Features

## ✅ Database Schema - DONE

I've added to your Prisma schema:
- **StockAdjustment** model (tracks inventory changes)
- **Supplier** model (supplier management)

Run `npx prisma db push` then `npx prisma generate` to apply changes.

---

## 🎯 FEATURE 1: Stock Adjustments (20min)

### Files to Create:

**1. `StockAdjustments.tsx` Component:**
- Modal to adjust stock for a product
- Reasons: Damaged, Expired, Theft, Count Error, Supplier Return
- Add or Remove quantity
- Notes field
- Shows current stock
- Admin only

**2. API Endpoint in `server/index.ts`:**
```typescript
// Create stock adjustment
app.post('/api/stock-adjustments', async (req, res) => {
  const { productId, quantity, reason, notes, userId } = req.body;
  
  const adjustment = await prisma.stockAdjustment.create({
    data: { productId, quantity, reason, notes, userId }
  });
  
  // Update product stock
  await prisma.product.update({
    where: { id: productId },
    data: { current_stock: { increment: quantity } }
  });
  
  res.json({ success: true, data: adjustment });
});

// Get adjustments history
app.get('/api/stock-adjustments', async (req, res) => {
  const productId = req.query.productId ? Number(req.query.productId) : null;
  
  const adjustments = await prisma.stockAdjustment.findMany({
    where: productId ? { productId } : undefined,
    include: { product: true, user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  
  res.json({ success: true, data: adjustments });
});
```

---

## 🎯 FEATURE 2: Profit Analysis (25min)

### Add to Sales Reports:

**Enhance existing `/api/reports/sales` endpoint:**
```typescript
// Add profit calculations
const salesWithProfit = sales.map(sale => {
  const itemsWithProfit = sale.items.map(item => ({
    ...item,
    cost: item.product.purchase_price * item.quantity,
    revenue: item.unit_price * item.quantity,
    profit: (item.unit_price - item.product.purchase_price) * item.quantity,
    margin: ((item.unit_price - item.product.purchase_price) / item.unit_price) * 100
  }));
  
  const totalCost = itemsWithProfit.reduce((sum, i) => sum + i.cost, 0);
  const totalProfit = sale.total_amount - totalCost;
  const profitMargin = (totalProfit / sale.total_amount) * 100;
  
  return { ...sale, totalCost, totalProfit, profitMargin, itemsWithProfit };
});
```

**Add Profit Tab to SalesReports.tsx:**
- Show profit margin per sale
- Best profit products (not just best sellers)
- Average margin
- Loss-making products (negative margin)

---

## 🎯 FEATURE 3: Return/Refund System (30min)

### Database Addition:

```prisma
model Return {
  id          Int      @id @default(autoincrement())
  saleId      Int
  productId   Int
  quantity    Int
  reason      String   // 'defective', 'wrong_item', 'customer_request', 'expired'
  refundAmount Float
  userId      Int      // Who processed the return
  createdAt   DateTime @default(now())
  
  sale        Sale     @relation(fields: [saleId], references: [id])
  product     Product  @relation(fields: [productId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
}
```

### API Endpoints:

```typescript
// Process return
app.post('/api/returns', async (req, res) => {
  const { saleId, productId, quantity, reason, refundAmount, userId } = req.body;
  
  // Create return record
  const returnRecord = await prisma.return.create({
    data: { saleId, productId, quantity, reason, refundAmount, userId }
  });
  
  // Restock product
  await prisma.product.update({
    where: { id: productId },
    data: { current_stock: { increment: quantity } }
  });
  
  res.json({ success: true, data: returnRecord });
});
```

### `ReturnModal.tsx` Component:
- Search by sale ID or receipt number
- Show original sale items
- Select items to return
- Enter return reason
- Calculate refund amount
- Print return receipt

---

## 🎯 FEATURE 4: Supplier Management (35min)

### `SupplierManagement.tsx` Component:
- List all suppliers
- Add/Edit/Delete suppliers
- Supplier details (name, contact, terms)
- Link products to suppliers (future enhancement)

### API Endpoints:

```typescript
// CRUD for suppliers
app.get('/api/suppliers', async (req, res) => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, data: suppliers });
});

app.post('/api/suppliers', async (req, res) => {
  const supplier = await prisma.supplier.create({ data: req.body });
  res.json({ success: true, data: supplier });
});

app.put('/api/suppliers/:id', async (req, res) => {
  const supplier = await prisma.supplier.update({
    where: { id: Number(req.params.id) },
    data: req.body
  });
  res.json({ success: true, data: supplier });
});

app.delete('/api/suppliers/:id', async (req, res) => {
  await prisma.supplier.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});
```

---

## 🚀 Quick Start:

### Priority Order:
1. **Stock Adjustments** - Most critical, easiest
2. **Profit Analysis** - Add to existing reports
3. **Supplier Management** - Standalone feature
4. **Returns** - Most complex, do last

### Each Feature Takes:
- Schema updates: 5 min
- API endpoints: 10 min
- UI component: 15-20 min
- Integration: 5 min

**Total Time: ~2 hours for all 4**

Would you like me to implement all 4, or focus on Stock Adjustments first?
