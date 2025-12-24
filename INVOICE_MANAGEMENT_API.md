# Invoice Management API Documentation

## Overview

The Invoice Management API provides comprehensive invoice generation, tracking, and management capabilities for the PharmaBest POS system with full CNAM support and sequential numbering.

## 📋 Features Implemented

### ✅ Backend API Endpoints

#### 1. **GET /api/invoices**
Get all invoices with pagination, search, and filtering.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50)
- `customerId` (number, optional): Filter by customer ID
- `invoiceType` ('all' | 'detailed' | 'receipt' | 'cnam' | 'proforma', optional): Filter by type
- `isPaid` (boolean, optional): Filter by payment status
- `search` (string, optional): Search by invoice number, customer name, or notes

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "invoiceNumber": "INV-2024-0001",
      "invoiceType": "detailed",
      "invoiceDate": "2024-12-24T10:00:00Z",
      "customerName": "John Doe",
      "subtotal": 250.50,
      "totalAmount": 250.50,
      "cnamAmount": 212.925,
      "patientAmount": 37.575,
      "isPaid": true,
      "customer": { ... },
      "items": [ ... ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### 2. **GET /api/invoices/:id**
Get invoice by ID with full details including items, customer, and creator.

**URL Parameters:**
- `id` (number): Invoice ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoiceNumber": "INV-2024-0001",
    "invoiceType": "detailed",
    "invoiceDate": "2024-12-24T10:00:00Z",
    
    "customerName": "John Doe",
    "customerPhone": "+216 12 345 678",
    "customerEmail": "john@example.com",
    "customerAddress": "123 Main St, Tunis",
    "customerType": "individual",
    
    "subtotal": 250.50,
    "taxAmount": 0,
    "discountAmount": 0,
    "totalAmount": 250.50,
    "cnamAmount": 212.925,
    "patientAmount": 37.575,
    
    "paymentMethod": "cash",
    "isPaid": true,
    "paidAt": "2024-12-24T10:00:00Z",
    
    "notes": "Invoice for December medications",
    "isPrinted": false,
    "printedAt": null,
    
    "items": [
      {
        "id": 1,
        "productName": "Paracetamol 500mg",
        "productBarcode": "1234567890123",
        "quantity": 2,
        "unitPrice": 5.250,
        "totalPrice": 10.500,
        "cnamReimbursable": true,
        "cnamRate": 85,
        "cnamAmount": 8.925,
        "patientAmount": 1.575,
        "requiresPrescription": false,
        "therapeuticClass": "Antalgique",
        "dciName": "Paracetamol"
      }
    ],
    
    "customer": { ... },
    "createdBy": {
      "id": 1,
      "username": "admin",
      "full_name": "Admin User"
    },
    "sale": {
      "id": 123,
      "timestamp": "2024-12-24T10:00:00Z",
      "payment_method": "cash"
    }
  }
}
```

#### 3. **POST /api/invoices**
Create a new invoice with automatic sequential numbering and CNAM calculations.

**Request Body:**
```json
{
  "customerId": 1,
  "saleId": 123,
  "invoiceType": "detailed",
  "paymentMethod": "cash",
  "isPaid": true,
  "userId": 1,
  "notes": "Invoice for December medications",
  "items": [
    {
      "productName": "Paracetamol 500mg",
      "productBarcode": "1234567890123",
      "quantity": 2,
      "unitPrice": 5.250,
      "cnamReimbursable": true,
      "cnamRate": 85,
      "requiresPrescription": false,
      "therapeuticClass": "Antalgique",
      "dciName": "Paracetamol"
    }
  ]
}
```

**Automatic Calculations:**
- Invoice number generated (format: INV-YYYY-####)
- Item totals calculated
- CNAM amounts calculated per item
- Patient portions calculated
- Subtotals and totals aggregated

**Validation:**
- Customer ID required and must exist
- At least one item required
- User ID required
- All items validated for completeness

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoiceNumber": "INV-2024-0001",
    ...
  }
}
```

#### 4. **PATCH /api/invoices/:id/payment**
Update invoice payment status.

**URL Parameters:**
- `id` (number): Invoice ID

**Request Body:**
```json
{
  "isPaid": true,
  "paidAt": "2024-12-24T10:00:00Z",
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isPaid": true,
    "paidAt": "2024-12-24T10:00:00Z",
    "paymentMethod": "card",
    ...
  }
}
```

#### 5. **PATCH /api/invoices/:id/print**
Mark invoice as printed.

**URL Parameters:**
- `id` (number): Invoice ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isPrinted": true,
    "printedAt": "2024-12-24T10:30:00Z",
    ...
  }
}
```

#### 6. **GET /api/invoices/stats/summary**
Get invoice statistics for a date range.

**Query Parameters:**
- `startDate` (ISO date string, optional): Start date
- `endDate` (ISO date string, optional): End date

**Response:**
```json
{
  "success": true,
  "data": {
    "totalInvoices": 150,
    "totalAmount": 45250.750,
    "paidInvoices": 140,
    "unpaidInvoices": 10,
    "cnamInvoices": 95
  }
}
```

#### 7. **DELETE /api/invoices/:id**
Delete invoice (only if not printed and not linked to sale).

**URL Parameters:**
- `id` (number): Invoice ID

**Restrictions:**
- Cannot delete printed invoices
- Cannot delete invoices linked to sales
- Deletes invoice items automatically (cascade)

**Response (Success):**
```json
{
  "success": true,
  "data": true
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "message": "Cannot delete printed invoices"
  }
}
```

---

## 🔢 Sequential Invoice Numbering

### Format
```
INV-YYYY-####
```

- **INV**: Fixed prefix
- **YYYY**: Current year (e.g., 2024)
- **####**: Sequential 4-digit number (padded with zeros)

### Examples
- `INV-2024-0001` - First invoice of 2024
- `INV-2024-0042` - 42nd invoice of 2024
- `INV-2025-0001` - First invoice of 2025 (resets annually)

### Logic
1. Query latest invoice for current year
2. Extract number from invoice number
3. Increment by 1
4. Pad with zeros to 4 digits
5. Combine with prefix and year

### Benefits
- Human-readable
- Chronological ordering
- Easy to reference
- Yearly reset for organization
- Legal compliance

---

## 💰 CNAM Calculation System

### Per-Item Calculation

For each invoice item:
```typescript
itemSubtotal = unitPrice × quantity

if (cnamReimbursable && cnamRate > 0) {
  cnamAmount = itemSubtotal × (cnamRate / 100)
  patientAmount = itemSubtotal - cnamAmount
} else {
  cnamAmount = 0
  patientAmount = itemSubtotal
}
```

### Invoice Totals

```typescript
subtotal = sum of all item subtotals
cnamTotal = sum of all item cnamAmounts
patientTotal = sum of all item patientAmounts
totalAmount = subtotal (can add tax/discount if needed)
```

### CNAM Rates (Tunisia)
- **85%** - Standard reimbursement
- **100%** - Chronic diseases (maladies chroniques)
- **70%** - Other medications
- **50%** - Comfort/optional medications
- **35%** - Low reimbursement
- **0%** - Non-reimbursable

---

## 📊 Invoice Types

### 1. **Detailed Invoice** (`detailed`)
- Full itemized breakdown
- Shows all product details
- CNAM calculations per item
- Complete customer information
- Use for: B2B transactions, large purchases

### 2. **Receipt** (`receipt`)
- Simplified format
- Basic item list
- Total amounts only
- Use for: Quick cash sales, walk-in customers

### 3. **CNAM Invoice** (`cnam`)
- CNAM-specific format
- Detailed reimbursement breakdown
- Prescription requirements highlighted
- DCI names and therapeutic classes
- Use for: Insurance submissions

### 4. **Proforma** (`proforma`)
- Quote/estimate format
- Not a final invoice
- No payment status
- Use for: Quotes, advance orders

---

## 🗄️ Database Schema

### Invoice Model
```prisma
model Invoice {
  id                Int       @id @default(autoincrement())
  invoiceNumber     String    @unique
  invoiceType       String    // 'detailed', 'receipt', 'cnam', 'proforma'
  invoiceDate       DateTime
  
  // Customer snapshot
  customerId        Int
  customerName      String
  customerPhone     String?
  customerEmail     String?
  customerAddress   String?
  customerType      String
  customerTaxId     String?
  customerCnamNumber String?
  
  // Financial
  subtotal          Float
  taxAmount         Float     @default(0)
  discountAmount    Float     @default(0)
  totalAmount       Float
  cnamAmount        Float     @default(0)
  patientAmount     Float
  
  // Payment
  paymentMethod     String
  isPaid            Boolean   @default(true)
  paidAt            DateTime?
  
  // Metadata
  notes             String?
  saleId            Int?
  createdById       Int
  isPrinted         Boolean   @default(false)
  printedAt         DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  customer          Customer  @relation(fields: [customerId], references: [id])
  items             InvoiceItem[]
  sale              Sale?     @relation(fields: [saleId], references: [id])
  createdBy         User      @relation(fields: [createdById], references: [id])
}
```

### InvoiceItem Model
```prisma
model InvoiceItem {
  id                  Int       @id @default(autoincrement())
  invoiceId           Int
  productName         String
  productBarcode      String?
  quantity            Int
  unitPrice           Float
  totalPrice          Float
  
  // CNAM details
  cnamReimbursable    Boolean   @default(false)
  cnamRate            Float     @default(0)
  cnamAmount          Float     @default(0)
  patientAmount       Float
  
  // Product details
  requiresPrescription Boolean  @default(false)
  therapeuticClass    String?
  dciName             String?
  
  invoice             Invoice   @relation(fields: [invoiceId], references: [id])
}
```

---

## 🎨 Frontend Service

### InvoiceService (TypeScript)

```typescript
import invoiceService from './services/InvoiceService';

// Get all invoices
const invoices = await invoiceService.getAll({
  page: 1,
  limit: 50,
  invoiceType: 'detailed',
  isPaid: true
});

// Create invoice
const invoice = await invoiceService.create({
  customerId: 1,
  invoiceType: 'detailed',
  items: [
    {
      productName: 'Paracetamol 500mg',
      quantity: 2,
      unitPrice: 5.25,
      cnamReimbursable: true,
      cnamRate: 85
    }
  ],
  userId: 1,
  paymentMethod: 'cash'
});

// Update payment status
await invoiceService.updatePaymentStatus(1, {
  isPaid: true,
  paymentMethod: 'card'
});

// Mark as printed
await invoiceService.markAsPrinted(1);

// Get statistics
const stats = await invoiceService.getStats(
  '2024-01-01',
  '2024-12-31'
);
```

---

## 🔐 Security & Validation

### Request Validation
- Customer ID must exist
- Minimum one item required
- User ID required
- Valid invoice type
- Valid payment method

### Business Rules
- Cannot delete printed invoices
- Cannot delete invoices linked to sales
- Invoice numbers are unique and sequential
- Customer snapshot preserved (historical accuracy)
- CNAM calculations validated

### Error Handling
- Detailed error messages
- Proper HTTP status codes
- Validation feedback
- Transaction safety

---

## 🚀 Next Steps

1. **Invoice List Component** - UI to view and search invoices
2. **Invoice Generator Component** - Create invoices from POS
3. **Invoice Detail View** - Full invoice display
4. **PDF Generation** - Print professional invoices
5. **POS Integration** - Link sales to invoices

---

## 📝 Usage Examples

### Creating an Invoice from a Sale
```typescript
// After completing a sale
const invoice = await invoiceService.create({
  customerId: customer.id,
  saleId: sale.id,
  invoiceType: 'detailed',
  items: saleItems.map(item => ({
    productName: item.product.commercial_name,
    productBarcode: item.product.barcode,
    quantity: item.quantity,
    unitPrice: item.product.public_price,
    cnamReimbursable: item.product.cnam_reimbursable,
    cnamRate: item.product.cnam_rate,
    requiresPrescription: item.product.requires_prescription,
    therapeuticClass: item.product.therapeutic_class,
    dciName: item.product.dci_name
  })),
  userId: currentUser.id,
  paymentMethod: sale.payment_method,
  isPaid: true
});
```

### Getting Customer Invoices
```typescript
const customerInvoices = await invoiceService.getAll({
  customerId: customer.id,
  page: 1,
  limit: 20
});
```

### Marking Invoice as Paid
```typescript
await invoiceService.updatePaymentStatus(invoice.id, {
  isPaid: true,
  paidAt: new Date().toISOString(),
  paymentMethod: 'card'
});
```

---

**Created:** December 24, 2024  
**Status:** ✅ Backend API Complete  
**Next Phase:** Invoice UI Components
