# @repo/database

Database layer for PharmaSOFT using Prisma ORM with SQLite.

## 📊 Database Schema

### Models

#### Product
Represents pharmaceutical products in the inventory.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Int | Auto-incrementing primary key |
| `barcode` | String | Unique barcode identifier |
| `commercial_name` | String | Product commercial name |
| `public_price` | Float | Retail price (TND) |
| `purchase_price` | Float | Wholesale price (TND) |
| `vat_rate` | Float | VAT rate in percentage (e.g., 7.0) |
| `current_stock` | Int | Current inventory count |
| `createdAt` | DateTime | Record creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

#### Sale
Represents a sales transaction.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Int | Auto-incrementing primary key |
| `timestamp` | DateTime | Transaction timestamp |
| `total_amount` | Float | Total sale amount (TND) |
| `payment_method` | String | Payment method (cash, card, check) |
| `createdAt` | DateTime | Record creation timestamp |

#### SaleItem
Junction table linking Sales and Products.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Int | Auto-incrementing primary key |
| `quantity` | Int | Quantity sold |
| `unit_price` | Float | Price per unit at time of sale |
| `saleId` | Int | Foreign key to Sale |
| `productId` | Int | Foreign key to Product |

### Relationships

- A `Sale` can have multiple `SaleItems` (one-to-many)
- A `Product` can be in multiple `SaleItems` (one-to-many)
- Each `SaleItem` belongs to one `Sale` and one `Product` (many-to-one)

## 🚀 Usage

### Generate Prisma Client

```bash
npm run generate
```

### Push Schema to Database

```bash
npm run push
```

### Seed Database

Populate with 20 sample pharmaceutical products:

```bash
npm run seed
```

### Push Schema + Seed

Do both in one command:

```bash
npm run db:seed
```

### Open Prisma Studio

Visual database browser:

```bash
npm run studio
```

## 📦 Sample Products

The seed script creates 20 realistic pharmaceutical products including:

- **Pain Relief**: Doliprane, Aspirine, Ibuprofène, Tramadol
- **Antibiotics**: Clamoxyl, Augmentin, Amoxicilline
- **Respiratory**: Ventoline, Symbicort, Seretide, Toplexil
- **Digestive**: Oméprazole
- **Allergy**: Loratadine, Aérius
- **Chronic Disease**: Atorvastatine, Metformine, Insuline
- **Supplements**: Vitamine D3, Fer + Acide Folique

All products have:
- Unique barcodes
- Realistic Tunisian pricing
- 7% VAT rate (pharmaceutical standard in Tunisia)
- Stock quantities

## 💻 Code Example

```typescript
import { prisma } from '@repo/database';

// Get all products
const products = await prisma.product.findMany();

// Create a sale with items
const sale = await prisma.sale.create({
  data: {
    total_amount: 27.30,
    payment_method: 'cash',
    items: {
      create: [
        {
          quantity: 2,
          unit_price: 4.50,
          productId: 1,
        }
      ]
    }
  },
  include: {
    items: {
      include: {
        product: true
      }
    }
  }
});

// Search products by name
const searchResults = await prisma.product.findMany({
  where: {
    commercial_name: {
      contains: 'Doliprane',
      mode: 'insensitive'
    }
  }
});

// Update stock
await prisma.product.update({
  where: { id: 1 },
  data: {
    current_stock: {
      decrement: 5
    }
  }
});
```

## 🔧 Configuration

### Change Database Provider

Edit `prisma/schema.prisma`:

**PostgreSQL**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**MySQL**:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### Environment Variables

Create `.env` file in the `packages/database` directory:

```env
DATABASE_URL="file:./pharmasoft.db"
# Or for PostgreSQL: postgresql://user:password@localhost:5432/pharmasoft
```

## 📝 Database File Location

SQLite database: `packages/database/prisma/pharmasoft.db`

## 🔍 Viewing Data

Use Prisma Studio for a visual interface:

```bash
npm run studio
```

Opens at: `http://localhost:5555`

## 🔄 Migrations

For production, use migrations instead of `db push`:

```bash
npx prisma migrate dev --name init
```

## ⚠️ Important Notes

1. **Stock Management**: The `current_stock` field should be updated transactionally when creating sales
2. **Price History**: `SaleItem.unit_price` stores the price at time of sale, allowing for price changes without affecting historical data
3. **VAT Calculation**: The `vat_rate` is stored as a percentage for flexibility
4. **Cascading Deletes**: Deleting a `Sale` will delete all associated `SaleItems`
5. **Product Protection**: Products cannot be deleted if they have associated `SaleItems` (Restrict)

## 📚 Learn More

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
