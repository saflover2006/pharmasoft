# 💼 Facturation System - Professional Proposal

## 🎯 Overview

A complete invoicing system for PharmaBest POS, compliant with **Tunisian tax regulations** and pharmacy-specific requirements.

---

## 📋 Types of Invoices

### **1. Facture Détaillée (Detailed Invoice)** ⭐ Most Important
**For:** Corporate clients, hospitals, insurance companies
**When:** Sales > 100 TND or on customer request
**Requirements:**
- Customer full details (name, address, MF/CIN)
- Itemized product list with quantities and prices
- Subtotal, VAT breakdown, total
- Invoice number (sequential)
- Pharmacy stamp and signature

### **2. Ticket de Caisse (Receipt)** 
**For:** Regular retail customers
**When:** Most daily sales
**Requirements:**
- Simplified format
- Total amount only
- VAT included message
- Thermal printer friendly

### **3. Facture CNAM**
**For:** CNAM reimbursement claims
**When:** Patient wants reimbursement
**Requirements:**
- Patient CNAM number
- Prescription details
- Separation of reimbursable/non-reimbursable items
- CNAM rate and amounts
- Doctor's signature space

### **4. Facture Proforma (Quote)**
**For:** Bulk orders, corporate quotes
**When:** Customer requests price estimate
**Requirements:**
- Not a tax invoice
- "PROFORMA" watermark
- Validity period (e.g., 30 days)

---

## 🆔 Invoice Numbering System

### **Recommended Format:**
```
FAC-2025-0001
│   │    │
│   │    └─ Sequential number (resets yearly)
│   └────── Year
└────────── Prefix (FAC = Facture, REC = Receipt, PRO = Proforma)
```

### **Examples:**
- `FAC-2025-0001` → First invoice of 2025
- `FAC-2025-0245` → 245th invoice
- `REC-2025-1234` → Receipt #1234
- `CNAM-2025-0089` → CNAM invoice #89

### **Business Rules:**
✅ Sequential (no gaps allowed by Tunisian law!)
✅ Unique per year
✅ Cannot delete or modify (audit trail)
✅ Separate sequences for different types

---

## 📄 Invoice Content Requirements

### **Mandatory Fields (Tunisian Law):**

#### **Pharmacy Info:**
```
PharmaBest
Adresse: [Your address]
MF: [Matricule Fiscal]
Tél: [Phone]
Email: [Email]
```

#### **Customer Info (if detailed invoice):**
```
Client: [Name]
Adresse: [Address]
MF/CIN: [Tax ID or National ID]
```

#### **Invoice Details:**
```
N° Facture: FAC-2025-0123
Date: 23/12/2025 16:30
Vendeur: [Cashier name]
```

#### **Items Table:**
```
Code    | Désignation          | Qté | P.U.  | Total
--------|---------------------|-----|-------|-------
12345   | DOLIPRANE 1000MG    | 2   | 4.90  | 9.80
56789   | AMOXIL 500MG        | 1   | 8.50  | 8.50
```

#### **Totals:**
```
Sous-total HT:           15.00 TND
TVA (7%):                 1.05 TND
────────────────────────────────
Total TTC:               16.05 TND

Mode de paiement: Espèces
```

---

## 🎨 Design Templates

### **Template 1: Professional A4** (Recommended)
```
┌─────────────────────────────────────┐
│  [LOGO] PharmaBest                  │
│  Adresse, MF, Tél                   │
├─────────────────────────────────────┤
│  FACTURE N° FAC-2025-0001           │
│  Date: 23/12/2025                   │
├─────────────────────────────────────┤
│  Client: Hôpital Charles Nicolle    │
│  MF: 123456ABC                      │
├─────────────────────────────────────┤
│  [Itemized Products Table]          │
├─────────────────────────────────────┤
│  Total HT:    100.00 TND            │
│  TVA 7%:        7.00 TND            │
│  Total TTC:   107.00 TND            │
├─────────────────────────────────────┤
│  Cachet et Signature                │
│  [STAMP]                            │
└─────────────────────────────────────┘
```

### **Template 2: Thermal Receipt** (Current)
```
     PharmaBest POS
    123 Ave Habib Bourguiba
      Tunis - MF: 123456

Date: 23/12/2025 16:30
Caissier: Admin

─────────────────────────
DOLIPRANE 1000MG
2 x 4.90 TND       9.80

AMOXIL 500MG  
1 x 8.50 TND       8.50
─────────────────────────
TOTAL:            18.30 TND
TVA incluse (7%)

Paiement: Espèces
Rendu: 1.70 TND

Merci de votre visite!
```

### **Template 3: CNAM Invoice**
```
┌─────────────────────────────────────┐
│  FACTURE CNAM                       │
│  N° CNAM-2025-0012                  │
├─────────────────────────────────────┤
│  Patient: [Name]                    │
│  N° CNAM: 1234567890                │
│  Ordonnance N°: [Prescription #]    │
├─────────────────────────────────────┤
│  Produits Remboursables:            │
│  DOLIPRANE 1000MG    9.80 TND       │
│    Taux: 85%                        │
│    Part CNAM:  8.33 TND             │
│    Part Patient: 1.47 TND           │
│                                     │
│  Produits Non-Remboursables:        │
│  VITAMINE C          5.00 TND       │
├─────────────────────────────────────┤
│  Total: 14.80 TND                   │
│  À payer: 6.47 TND                  │
│  CNAM rembourse: 8.33 TND           │
└─────────────────────────────────────┘
```

---

## 🔧 Feature Implementation Ideas

### **1. Invoice Management Screen**

**Location:** New button "Factures" in header (Admin + Cashier)

**Features:**
- 📋 List all invoices (searchable, filterable)
- 🔍 Search by: Number, Date, Customer, Amount
- 📄 View/Print/Download any invoice
- 📧 Email invoice to customer
- 📊 Invoice statistics (daily, monthly, yearly)

### **2. Create Invoice from Sale**

**During POS checkout:**
```
After payment → Offer choice:

┌──────────────────────────────┐
│  Imprimer Reçu/Facture?      │
├──────────────────────────────┤
│  [🧾 Ticket de Caisse]       │  ← Current thermal receipt
│  [📄 Facture Détaillée]      │  ← New! Full invoice
│  [💳 Facture CNAM]           │  ← New! CNAM format
│  [✖️  Annuler]                │
└──────────────────────────────┘
```

### **3. Customer Management Integration**

**If "Facture Détaillée" selected:**
```
┌──────────────────────────────┐
│  Informations Client         │
├──────────────────────────────┤
│  Chercher client existant:   │
│  [Search box...]             │
│                              │
│  Ou créer nouveau:           │
│  Nom: ____________           │
│  Adresse: _________          │
│  MF/CIN: __________          │
│  Tél: _____________          │
│                              │
│  [Créer & Imprimer Facture]  │
└──────────────────────────────┘
```

### **4. Invoice Generation Options**

**Formats:**
- 📄 **PDF** - For email and archiving
- 🖨️ **Print** - Direct to printer (A4 or thermal)
- 📧 **Email** - Send to customer automatically
- 📱 **SMS** - Send invoice link via SMS (optional)

### **5. Fiscal Compliance**

**Tax Report:**
```
Monthly/Yearly VAT Report:
- Total sales
- VAT collected (7%)
- Invoices issued
- Export to Excel/PDF
```

**Audit Trail:**
```
All invoices logged with:
- Creation timestamp
- User who created it
- Modifications (none allowed!)
- Print/email history
```

---

## 💾 Database Schema

### **New Tables Needed:**

```sql
-- Invoices table
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_type TEXT NOT NULL, -- 'detailed', 'receipt', 'cnam', 'proforma'
    sale_id INTEGER REFERENCES sales(id),
    customer_id INTEGER REFERENCES customers(id),
    customer_name TEXT,
    customer_address TEXT,
    customer_tax_id TEXT,
    customer_phone TEXT,
    subtotal REAL NOT NULL,
    vat_amount REAL NOT NULL,
    total REAL NOT NULL,
    cnam_amount REAL,
    patient_amount REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    printed_at DATETIME,
    emailed_at DATETIME
);

-- Invoice items (for detailed invoices)
CREATE TABLE invoice_items (
    id INTEGER PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    product_id INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_code TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    cnam_rate REAL,
    cnam_amount REAL
);

-- Customers (enhanced)
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    tax_id TEXT, -- MF or CIN
    phone TEXT,
    email TEXT,
    cnam_number TEXT,
    customer_type TEXT, -- 'individual', 'corporate', 'hospital'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎯 User Interface Design

### **Invoice List Screen:**

```
┌────────────────────────────────────────────────────────┐
│  📄 Gestion des Factures                               │
├────────────────────────────────────────────────────────┤
│  🔍 [Search...]   📅 [Date Range]   📊 [Type ▼]       │
│                                                         │
│  N° Facture   Date       Client           Total  Type  │
│  ─────────────────────────────────────────────────────│
│  FAC-2025-0123  23/12  Hôpital CN     107.00  Det.   │
│  FAC-2025-0122  23/12  Pharmacie ABC   45.50  Det.   │
│  REC-2025-1234  23/12  Client Anonyme  18.30  Reçu   │
│  CNAM-2025-0012 22/12  Ahmed Ben Ali   14.80  CNAM   │
│                                                         │
│  [Nouvelle Facture]  [Exporter Excel]  [Imprimer]     │
└────────────────────────────────────────────────────────┘
```

### **Invoice Detail View:**

```
┌────────────────────────────────────────────────────────┐
│  📄 Facture FAC-2025-0123                              │
├────────────────────────────────────────────────────────┤
│  Client: Hôpital Charles Nicolle                       │
│  Date: 23/12/2025 14:30                                │
│  Vendeur: Admin                                        │
│                                                         │
│  Code     Produit              Qté  P.U.   Total       │
│  ──────────────────────────────────────────────────   │
│  12345    DOLIPRANE 1000MG     2    4.90    9.80      │
│  56789    AMOXIL 500MG         1    8.50    8.50      │
│                                                         │
│                              Sous-total:  18.30 TND    │
│                              TVA (7%):     1.28 TND    │
│                              Total:       19.58 TND    │
│                                                         │
│  [🖨️ Imprimer]  [📧 Envoyer Email]  [📄 PDF]  [✖️ Fermer] │
└────────────────────────────────────────────────────────┘
```

---

## 📊 Reports Integration

### **New Reports:**

1. **Registre des Factures** (Invoice Register)
   - All invoices by date
   - Legal requirement in Tunisia

2. **Rapport TVA** (VAT Report)
   - Monthly VAT collected
   - For tax declaration

3. **Factures Impayées** (Unpaid Invoices)
   - For corporate clients with credit terms

4. **Top Clients** (Best Customers)
   - By invoice volume/amount

---

## 🚀 Implementation Phases

### **Phase 1: Basic (Week 1)** ⭐ START HERE
- ✅ Database schema
- ✅ Invoice number generation
- ✅ Convert sale to detailed invoice
- ✅ PDF generation (A4 template)
- ✅ Print invoice

### **Phase 2: Management (Week 2)**
- ✅ Invoice list screen
- ✅ Search and filter
- ✅ View invoice details
- ✅ Reprint invoices

### **Phase 3: Customers (Week 3)**
- ✅ Customer database
- ✅ Customer selection during sale
- ✅ Customer history

### **Phase 4: CNAM (Week 4)**
- ✅ CNAM invoice template
- ✅ CNAM calculations
- ✅ Prescription tracking

### **Phase 5: Advanced (Week 5)**
- ✅ Email invoices
- ✅ Proforma quotes
- ✅ Credit notes (avoir)
- ✅ Monthly reconciliation

---

## 💡 Quick Wins

### **Immediate Value:**

1. **Professional Image** 📈
   - Proper invoices → More corporate clients
   - Better credibility

2. **Legal Compliance** ⚖️
   - Avoid tax penalties
   - Proper audit trail

3. **Customer Satisfaction** 😊
   - Easy reimbursement (CNAM)
   - Professional documentation

4. **Better Accounting** 💼
   - Track receivables
   - Easier tax declarations

---

## 📝 Summary - My Recommendation

### **Start With:**

1. **Detailed Invoice PDF** (A4 format)
   - Most requested by corporate clients
   - Easy to implement

2. **Invoice List & Search**
   - View and reprint old invoices
   - Essential for customer service

3. **Customer Database**
   - Store client info
   - Faster invoice creation

### **Add Later:**

4. CNAM invoices (if you have CNAM clients)
5. Email functionality
6. Credit notes system

---

## 🎯 Next Steps

**Would you like me to:**

1. ✅ **Implement Phase 1** (Basic invoicing)?
2. 📄 Create detailed invoice PDF template?
3. 👥 Build customer management screen?
4. 📊 Add invoice reports?

**Let me know which features you want first, and I'll start building!** 💪

---

**This system will make PharmaBest fully professional and tax-compliant!** 🇹🇳✨
