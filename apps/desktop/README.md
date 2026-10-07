# Desktop POS Application

Modern, dark-mode Point of Sale system for pharmacy operations built with Electron, React, and Vite.

## ✨ Features

### 🎨 Modern Dark UI
- Professional dark mode with high-contrast design
- Smooth animations and transitions
- Gradient accents and glow effects
- Custom Tailwind CSS theme

### 🔍 Product Search
- Real-time product search by name or barcode
- Auto-complete dropdown with product details
- Debounced search (300ms) for performance
- Displays: name, barcode, price, and stock

### 🛒 Cart Management
- Add/remove items with smooth animations
- Adjust quantities with +/- buttons or direct input
- Real-time price calculations
- Stock warnings for insufficient inventory
- VAT calculation (7%)

### ⚡ Quick Actions Panel
- **Cash Payment** (F1 keyboard shortcut)
- **Card Payment** (F2 keyboard shortcut)
- **Clear Cart** (F3 keyboard shortcut)
- Visual keyboard shortcut reference

### ⌨️ Keyboard Navigation
- **F1**: Process cash payment
- **F2**: Process card payment
- **F3**: Clear cart
- **ESC**: Cancel/clear search
- Fully keyboard-optimized workflow

### 💾 Database Integration
- Connected to local SQLite database via Prisma
- Real-time stock updates
- Transaction recording (Sales + SaleItems)
- Product inventory management

## 🖥️ Screenshots

```
┌─────────────────────────────────────────────────────────────────┐
│ PharmaSOFT POS                               Dec 20, 2025 8:45 PM│
├─────────────────────────────────────────────────────────────────┤
│ 🔍 Search by product name or scan barcode...                    │
├───────────────────────────────┬─────────────────────────────────┤
│ 🛒 Current Sale               │ ⚡ Quick Actions                │
│                               │                                 │
│ [Product List]                │ Total: 27.30 TND                │
│ • Doliprane 1000mg  x2        │                                 │
│   4.50 TND × 2 = 9.00 TND     │ [💵 Cash Payment    F1]        │
│                               │ [💳 Card Payment    F2]        │
│ • Augmentin 1g     x1         │ [🗑️  Clear Cart     F3]        │
│   18.50 TND × 1 = 18.50 TND   │                                 │
│                               │ Keyboard Shortcuts:             │
│ ─────────────────────────     │ F1/F2/F3/ESC                   │
│ Subtotal:      27.30 TND      │                                 │
│ VAT (7%):       1.91 TND      │                                 │
│ Total:         29.21 TND      │                                 │
└───────────────────────────────┴─────────────────────────────────┘
│ ● Database Connected | 2 items | F1:Cash F2:Card F3:Clear ESC:Cancel │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Running the Application

### Development Mode (Browser)

```bash
cd apps/desktop
npm run dev
```

Opens at: `http://localhost:5173`

### Production Build

```bash
npm run build
```

Creates:
- `dist/` - Web build
- `dist-electron/` - Electron build  
- `dist/desktop Setup 0.0.0.exe` - Windows installer

### Installation

1. Go to `apps/desktop/release` directory
2. Run `PharmaSOFT Setup 0.0.0.exe`
3. Follow the installation wizard
4. The application will launch automatically after installation

## 📁 Project Structure

```
apps/desktop/
├── src/
│   ├── components/
│   │   ├── SearchBar.tsx       # Product search with autocomplete
│   │   ├── Cart.tsx            # Shopping cart display
│   │   └── QuickActions.tsx    # Payment buttons & shortcuts
│   ├── App.tsx                 # Main POS application
│   ├── main.tsx                # React entry point
│   ├── types.ts                # TypeScript interfaces
│   └── index.css               # Tailwind + custom styles
├── electron/
│   ├── main.ts                 # Electron main process
│   └── preload.ts              # Electron preload script
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind configuration
└── postcss.config.js           # PostCSS configuration
```

## 🎨 Design System

### Colors

```javascript
{
  'dark-bg': '#0f172a',        // Main background
  'dark-surface': '#1e293b',   // Cards and panels
  'dark-elevated': '#334155',  // Elevated elements
  'dark-border': '#475569',    // Borders
  'primary': '#3b82f6',        // Primary actions (blue)
  'success': '#10b981',        // Success/cash (green)
  'warning': '#f59e0b',        // Warnings (orange)
  'danger': '#ef4444',         // Danger/delete (red)
}
```

### Typography

- **Sans**: Inter (headings, body text)
- **Mono**: JetBrains Mono (barcodes, prices, shortcuts)

### Components

- `.btn` - Base button class
- `.btn-primary` - Primary action button (blue)
- `.btn-success` - Success button (green)
- `.btn-danger` - Danger button (red)
- `.card` - Card container with border
- `.scrollbar-thin` - Custom thin scrollbar

## 🔌 Database Connection

The app connects to the SQLite database at:
```
packages/database/prisma/pharmasoft.db
```

### Available Operations

```typescript
// Search products
const products = await prisma.product.findMany({
  where: {
    OR: [
      { commercial_name: { contains: query, mode: 'insensitive' } },
      { barcode: { contains: query } }
    ]
  }
});

// Create sale
await prisma.sale.create({
  data: {
    total_amount: total,
    payment_method: 'cash',
    items: {
      create: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.public_price
      }))
    }
  }
});

// Update stock
await prisma.product.update({
  where: { id: productId },
  data: { current_stock: { decrement: quantity } }
});
```

## ⌨️ Keyboard Shortcuts Reference

| Key | Action | Description |
|-----|--------|-------------|
| **F1** | Cash Payment | Process cash transaction and record sale |
| **F2** | Card Payment | Process card transaction and record sale |
| **F3** | Clear Cart | Remove all items from cart |
| **ESC** | Cancel | Clear search results |
| **Tab** | Navigate | Move between UI elements |
| **Enter** | Select | Select product from search results |

## 🔄 Workflow

1. **Search Product**: Type name or scan barcode in search bar
2. **Add to Cart**: Click product from dropdown or press Enter
3. **Adjust Quantity**: Use +/- buttons or type quantity
4. **Review Total**: Check subtotal, VAT, and total amount
5. **Process Payment**: Press F1 (cash) or F2 (card)
6. **Confirmation**: Sale recorded, stock updated, cart cleared

## 📊 Features in Detail

### Stock Management
- Displays current stock for each product
- Shows warning if quantity exceeds available stock
- Automatically decrements stock on successful sale
- Prevents overselling

### Price Calculation
- Real-time subtotal calculation
- Automatic VAT calculation (7%)
- Price history preservation (stores unit_price at sale time)
- Multi-item support

### Transaction Recording
- Creates `Sale` record with timestamp
- Creates `SaleItem` records for each product
- Links products to sales
- Payment method tracking

## 🛠️ Technologies

- **React 19.2** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite 7.3** - Build tool and dev server
- **Tailwind CSS 3.0** - Utility-first CSS
- **Prisma 6.0** - Database ORM
- **Electron 28.0** - Desktop wrapper
- **SQLite** - Local database

## 🎯 Future Enhancements

- [ ] Receipt printing
- [ ] Barcode scanner integration
- [ ] Multi-user support with authentication
- [ ] Sales reports and analytics
- [ ] Inventory alerts
- [ ] Customer management
- [ ] Discounts and promotions
- [ ] Offline sync with cloud backup
- [ ] Multi-language support (French/Arabic)
- [ ] Thermal printer support

## 🐛 Known Issues

- None currently

## 📝 Notes

- The app currently runs in browser mode for development
- For full Electron functionality, additional configuration is needed
- Database path is relative to package location
- VAT rate is hard-coded to 7% (Tunisian pharmaceutical standard)

## 🔐 Security Considerations

- Local SQLite database (no network exposure)
- No sensitive data transmission
- Electron sandbox for additional security
- Input validation on all user inputs
- Stock quantity validation

---

**Built with ❤️ for Tunisian Pharmacies**
