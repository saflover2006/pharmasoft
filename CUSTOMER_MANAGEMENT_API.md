# Customer Management API Documentation

## Overview

The Customer Management API provides comprehensive CRUD operations for managing customers in the PharmaBest POS system. This is a foundational component of the invoicing system.

## 📋 Features Implemented

### ✅ Backend API Endpoints

#### 1. **GET /api/customers**
Get all customers with pagination, search, and filtering.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50)
- `search` (string, optional): Search by name, phone, email, or address
- `customerType` ('individual' | 'company' | 'all', optional): Filter by customer type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "phone": "+216 12 345 678",
      "email": "john@example.com",
      "address": "123 Main St, Tunis",
      "customerType": "individual",
      "taxId": null,
      "cnamNumber": null,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z",
      "_count": {
        "invoices": 5
      }
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

#### 2. **GET /api/customers/search**
Lightweight search for autocomplete functionality.

**Query Parameters:**
- `q` (string, required): Search query (min 2 chars)
- `limit` (number, optional): Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "phone": "+216 12 345 678",
      "email": "john@example.com",
      "customerType": "individual",
      "address": "123 Main St, Tunis"
    }
  ]
}
```

#### 3. **POST /api/customers**
Create a new customer.

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+216 12 345 678",
  "email": "john@example.com",
  "address": "123 Main St, Tunis",
  "customerType": "individual",
  "taxId": null,
  "cnamNumber": null
}
```

**Validation:**
- `name`: Required, cannot be empty
- `phone`: Optional, must be unique if provided
- `email`: Optional, must be unique if provided
- `customerType`: 'individual' or 'company' (default: 'individual')

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "phone": "+216 12 345 678",
    "email": "john@example.com",
    "address": "123 Main St, Tunis",
    "customerType": "individual",
    "taxId": null,
    "cnamNumber": null,
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z"
  }
}
```

#### 4. **GET /api/customers/:id**
Get customer by ID with related invoices.

**URL Parameters:**
- `id` (number): Customer ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "phone": "+216 12 345 678",
    "email": "john@example.com",
    "address": "123 Main St, Tunis",
    "customerType": "individual",
    "taxId": null,
    "cnamNumber": null,
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z",
    "invoices": [
      {
        "id": 1,
        "invoiceNumber": "INV-2024-0001",
        "invoiceType": "detailed",
        "totalAmount": 250.50,
        "invoiceDate": "2024-01-01T10:00:00Z",
        "isPaid": true
      }
    ],
    "_count": {
      "invoices": 5
    }
  }
}
```

#### 5. **PUT /api/customers/:id**
Update customer information.

**URL Parameters:**
- `id` (number): Customer ID

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone": "+216 12 345 679",
  "email": "john.updated@example.com",
  "address": "456 New St, Tunis",
  "customerType": "company",
  "taxId": "TN123456",
  "cnamNumber": "CNAM789"
}
```

**Validation:**
- Cannot update to empty name
- Phone must be unique (excluding current customer)
- Email must be unique (excluding current customer)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe Updated",
    ...
  }
}
```

#### 6. **DELETE /api/customers/:id**
Delete customer (only if no invoices exist).

**URL Parameters:**
- `id` (number): Customer ID

**Response (Success):**
```json
{
  "success": true,
  "data": true
}
```

**Response (Error - has invoices):**
```json
{
  "success": false,
  "error": {
    "message": "Cannot delete customer with 5 invoice(s). Archive customer instead."
  }
}
```

#### 7. **POST /api/customers/find-or-create**
Find existing customer or create new one (for POS checkout).

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+216 12 345 678",
  "email": "john@example.com"
}
```

**Logic:**
1. Search by phone (if provided)
2. Search by email (if provided)
3. Search by exact name match
4. Create new customer if not found

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    ...
  }
}
```

### ✅ Frontend Components

#### **CustomerManagement Component**

Full-featured customer management interface with:

- **List View:**
  - Pagination (50 customers per page)
  - Search by name, phone, email, or address
  - Filter by customer type (All, Individual, Company)
  - Display invoice count for each customer
  - Edit and delete actions

- **Create/Edit Form:**
  - Name (required)
  - Customer type selector (Individual/Company)
  - Phone and email
  - Full address
  - Tax ID and CNAM number (for companies)
  - Validation and error handling

- **Features:**
  - Responsive design
  - Beautiful dark theme UI
  - Real-time search
  - Inline validation
  - Success/error messages
  - Confirmation dialogs for deletion

#### **CustomerService**

TypeScript service class for API interactions:
- Type-safe API calls
- Error handling
- Clean async/await patterns
- Singleton pattern

### ✅ Integration

- **Header Button:** "Customers" button added in the main app header (Admin only)
- **Accessible From:** Main POS interface
- **Role-Based:** Only accessible to admin users
- **State Management:** Integrated with App component

## 🗄️ Database Schema

**Customer Model:**
```prisma
model Customer {
  id            Int       @id @default(autoincrement())
  name          String
  phone         String?   @unique
  email         String?   @unique
  address       String?
  customerType  String    @default("individual") // 'individual' or 'company'
  taxId         String?
  cnamNumber    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  invoices      Invoice[]
  sales         Sale[]
}
```

## 🎨 UI/UX Features

### Customer List
- Clean card-based layout
- Customer type badges (👤 Individual / 🏢 Company)
- Invoice count badges
- Contact information with icons
- Edit and delete action buttons
- Hover effects and transitions

### Search & Filters
- Real-time search across all fields
- Customer type dropdown filter
- Pagination controls
- Total customer count display

### Form Modal
- Clean two-column layout
- Auto-focus on name field
- Conditional fields (Tax ID/CNAM for companies)
- Inline validation
- Success/error feedback
- Responsive design

## 📝 Usage Examples

### Creating a Customer (Frontend)
```typescript
import customerService from '../services/CustomerService';

const createCustomer = async () => {
  try {
    const result = await customerService.create({
      name: 'Pharmacy XYZ',
      phone: '+216 71 123 456',
      email: 'contact@pharmacy-xyz.tn',
      address: 'Avenue Habib Bourguiba, Tunis',
      customerType: 'company',
      taxId: 'TN123456789',
      cnamNumber: 'CNAM-XYZ'
    });
    console.log('Customer created:', result.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

### Searching Customers
```typescript
const searchCustomers = async (query: string) => {
  try {
    const result = await customerService.search(query, 10);
    console.log('Found customers:', result.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

### Getting All Customers with Pagination
```typescript
const getCustomers = async (page: number) => {
  try {
    const result = await customerService.getAll({
      page,
      limit: 50,
      search: '',
      customerType: 'all'
    });
    console.log('Customers:', result.data);
    console.log('Pagination:', result.pagination);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

## 🔐 Security Features

- **Validation:** All inputs validated on backend
- **Unique Constraints:** Phone and email must be unique
- **Referential Integrity:** Cannot delete customers with invoices
- **Role-Based Access:** Only admins can access customer management
- **Error Handling:** Comprehensive error messages

## 🚀 Next Steps

1. **Invoice Management API** - Build invoice CRUD endpoints
2. **Invoice Generator** - Create invoice generation UI
3. **PDF Generation** - Implement professional invoice PDF templates
4. **Integration** - Connect invoicing to POS checkout flow
5. **Reports** - Add customer-based reporting

## 🧪 Testing Checklist

- [ ] Create customer with all fields
- [ ] Create customer with minimal fields (name only)
- [ ] Search customers by name
- [ ] Search customers by phone/email
- [ ] Filter by customer type
- [ ] Navigate pagination
- [ ] Edit customer information
- [ ] Delete customer (without invoices)
- [ ] Attempt to delete customer with invoices
- [ ] Duplicate phone/email validation
- [ ] Empty name validation
- [ ] Company fields (Tax ID, CNAM)

## ⚡ Performance Notes

- Pagination implemented to handle large customer lists
- Search endpoint optimized for autocomplete (limit 10 results)
- Includes invoice count without loading all invoice data
- Proper indexing on phone and email fields (unique constraints)

---

**Created:** December 24, 2024  
**Status:** ✅ Fully Implemented and Integrated  
**Next Phase:** Invoice Management API
