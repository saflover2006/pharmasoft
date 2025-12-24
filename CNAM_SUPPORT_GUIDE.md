# Support CNAM Tunisie - Guide d'Implémentation

## ✅ Ce qu'on va Ajouter:

### 1. **Champs CNAM dans Produits:**
- `cnam_reimbursable` (Remboursable: Oui/Non)
- `cnam_rate` (Taux: 85%, 100%, etc.)
- `requires_prescription` (Nécessite ordonnance)
- `therapeutic_class` (Classe thérapeutique)

### 2. **Calculs Automatiques:**
- Part CNAM (montant remboursé)
- Part Patient (ticket modérateur)
- Total à payer par patient

### 3. **Affichage & Rapports:**
- Badge "CNAM" sur produits
- Détail remboursement sur ticket
- Rapport mensuel pour CNAM
- Statistiques CNAM vs Non-CNAM

---

## 📋 ÉTAPE 1: Mise à Jour Base de Données

### Modifier `schema.prisma`:

```prisma
model Product {
  id                  Int        @id @default(autoincrement())
  barcode             String     @unique
  commercial_name     String
  dci_name            String?    // Dénomination Commune Internationale
  public_price        Float
  purchase_price      Float
  vat_rate            Float
  current_stock       Int        @default(0)
  low_stock_threshold Int        @default(10)
  expiry_date         DateTime?
  batch_number        String?
  
  // CNAM Fields (NEW)
  cnam_reimbursable   Boolean    @default(false)
  cnam_rate           Float?     // 85, 100, etc. (null si non remboursable)
  requires_prescription Boolean  @default(false)
  therapeutic_class   String?    // Antibiotique, Antalgique, etc.
  cnam_reference_price Float?    // Prix référence CNAM
  
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt
  
  saleItems           SaleItem[]
  stockAdjustments    StockAdjustment[]
}
```

### Commandes:
```bash
cd packages/database
npx prisma db push
npx prisma generate
```

---

## 📋 ÉTAPE 2: Mise à Jour ProductManagement

### Ajouter Champs CNAM au Formulaire:

Dans `ProductManagement.tsx`, après les champs existants:

```tsx
{/* CNAM Section */}
<div className="col-span-2 border-t border-dark-border pt-4">
    <h3 className="text-lg font-bold text-gray-100 mb-3">
        🏥 Remboursement CNAM
    </h3>
</div>

{/* Remboursable CNAM */}
<div>
    <label className="label">Remboursable CNAM</label>
    <select
        value={formData.cnam_reimbursable ? 'yes' : 'no'}
        onChange={(e) => {
            const isReimbursable = e.target.value === 'yes';
            setFormData({
                ...formData,
                cnam_reimbursable: isReimbursable,
                cnam_rate: isReimbursable ? 85 : null
            });
        }}
        className="w-full"
    >
        <option value="no">Non - Vente Libre</option>
        <option value="yes">Oui - Remboursable</option>
    </select>
</div>

{/* Taux Remboursement */}
{formData.cnam_reimbursable && (
    <div>
        <label className="label">Taux Remboursement CNAM</label>
        <select
            value={formData.cnam_rate || 85}
            onChange={(e) => setFormData({...formData, cnam_rate: parseFloat(e.target.value)})}
            className="w-full"
        >
            <option value="85">85% (Normal)</option>
            <option value="100">100% (Maladies chroniques)</option>
            <option value="70">70% (Autres)</option>
        </select>
    </div>
)}

{/* Ordonnance Obligatoire */}
<div>
    <label className="label">Ordonnance Obligatoire</label>
    <select
        value={formData.requires_prescription ? 'yes' : 'no'}
        onChange={(e) => setFormData({...formData, requires_prescription: e.target.value === 'yes'})}
        className="w-full"
    >
        <option value="no">Non</option>
        <option value="yes">Oui</option>
    </select>
</div>

{/* Classe Thérapeutique */}
<div>
    <label className="label">Classe Thérapeutique</label>
    <select
        value={formData.therapeutic_class || ''}
        onChange={(e) => setFormData({...formData, therapeutic_class: e.target.value})}
        className="w-full"
    >
        <option value="">Sélectionner...</option>
        <option value="Antalgique">Antalgique</option>
        <option value="Antibiotique">Antibiotique</option>
        <option value="Anti-inflammatoire">Anti-inflammatoire</option>
        <option value="Antidiabétique">Antidiabétique</option>
        <option value="Antihypertenseur">Antihypertenseur</option>
        <option value="Cardiovasculaire">Cardiovasculaire</option>
        <option value="Gastro-intestinal">Gastro-intestinal</option>
        <option value="Respiratoire">Respiratoire</option>
        <option value="Dermatologique">Dermatologique</option>
        <option value="Autre">Autre</option>
    </select>
</div>
```

---

## 📋 ÉTAPE 3: Affichage Badge CNAM

### Dans Liste Produits (`ProductManagement.tsx`):

Après le nom du produit:

```tsx
<div>
    <span className="font-semibold text-gray-200">{product.commercial_name}</span>
    {product.cnam_reimbursable && (
        <span className="ml-2 px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">
            CNAM {product.cnam_rate}%
        </span>
    )}
    {product.requires_prescription && (
        <span className="ml-1 px-2 py-0.5 bg-warning/20 text-warning text-xs rounded-full">
            ℞ Ordonnance
        </span>
    )}
</div>
```

### Dans Recherche Produits (`SearchBar.tsx`):

```tsx
{product.cnam_reimbursable && (
    <div className="text-xs text-success">
        ✓ CNAM {product.cnam_rate}% - Part patient: {((100 - product.cnam_rate) * product.public_price / 100).toFixed(2)} TND
    </div>
)}
```

---

## 📋 ÉTAPE 4: Calcul CNAM dans Vente

### Créer Utilitaire de Calcul (`utils/cnam.ts`):

```typescript
export interface CNAMCalculation {
    totalPrice: number;
    cnamPortion: number;      // Part remboursée par CNAM
    patientPortion: number;   // Ticket modérateur (part patient)
    cnamRate: number;
}

export function calculateCNAM(
    price: number,
    isCNAMReimbursable: boolean,
    cnamRate: number | null
): CNAMCalculation {
    if (!isCNAMReimbursable || !cnamRate) {
        return {
            totalPrice: price,
            cnamPortion: 0,
            patientPortion: price,
            cnamRate: 0
        };
    }

    const cnamPortion = price * (cnamRate / 100);
    const patientPortion = price - cnamPortion;

    return {
        totalPrice: price,
        cnamPortion,
        patientPortion,
        cnamRate
    };
}

export function calculateCartCNAM(cart: CartItem[]) {
    let totalCNAM = 0;
    let totalPatient = 0;
    let totalPrice = 0;

    cart.forEach(item => {
        const itemPrice = item.product.public_price * item.quantity;
        const calc = calculateCNAM(
            itemPrice,
            item.product.cnam_reimbursable,
            item.product.cnam_rate
        );

        totalCNAM += calc.cnamPortion;
        totalPatient += calc.patientPortion;
        totalPrice += calc.totalPrice;
    });

    return { totalCNAM, totalPatient, totalPrice };
}
```

---

## 📋 ÉTAPE 5: Affichage dans Panier

### Modifier `Cart.tsx`:

Avant le Total, ajouter:

```tsx
{/* CNAM Summary (if applicable) */}
{(() => {
    const cnamCalc = calculateCartCNAM(cart);
    if (cnamCalc.totalCNAM > 0) {
        return (
            <>
                <div className="border-t border-dark-border pt-2 mt-2">
                    <div className="text-sm text-gray-400 mb-2">💳 Remboursement CNAM:</div>
                    <div className="flex justify-between text-success">
                        <span>Part CNAM:</span>
                        <span className="font-bold">{formatPrice(cnamCalc.totalCNAM)}</span>
                    </div>
                    <div className="flex justify-between text-warning">
                        <span>Part Patient (Ticket modérateur):</span>
                        <span className="font-bold">{formatPrice(cnamCalc.totalPatient)}</span>
                    </div>
                </div>
            </>
        );
    }
    return null;
})()}
```

---

## 📋 ÉTAPE 6: Template Import Excel

### Créer `PCT_IMPORT_TEMPLATE.xlsx`:

| Code Produit | Nom Commercial | DCI | Prix Public | Prix Achat | CNAM | Taux % | Ordonnance | Classe |
|-------------|----------------|-----|-------------|------------|------|--------|------------|---------|
| 3400123456  | DOLIPRANE 1g   | Paracétamol | 2.500 | 1.800 | OUI | 85 | NON | Antalgique |
| 3400789012  | AMOXIL 500mg   | Amoxicilline | 8.500 | 6.200 | OUI | 100 | OUI | Antibiotique |
| 3400555666  | VITAMINE C     | Acide ascorbique | 3.200 | 2.100 | NON | - | NON | Autre |

---

## 📋 ÉTAPE 7: Rapport CNAM

### Créer Rapport Mensuel:

```typescript
// Endpoint: GET /api/reports/cnam
app.get('/api/reports/cnam', async (req, res) => {
    const { startDate, endDate } = req.query;

    const sales = await prisma.sale.findMany({
        where: {
            timestamp: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        },
        include: {
            items: {
                include: { product: true }
            }
        }
    });

    let totalCNAM = 0;
    let totalPatient = 0;
    const cnamProducts = [];

    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (item.product.cnam_reimbursable) {
                const calc = calculateCNAM(
                    item.unit_price * item.quantity,
                    true,
                    item.product.cnam_rate
                );
                totalCNAM += calc.cnamPortion;
                totalPatient += calc.patientPortion;
                
                cnamProducts.push({
                    name: item.product.commercial_name,
                    quantity: item.quantity,
                    cnamPortion: calc.cnamPortion,
                    patientPortion: calc.patientPortion
                });
            }
        });
    });

    res.json({
        success: true,
        data: {
            totalCNAM,
            totalPatient,
            cnamProducts,
            period: { startDate, endDate }
        }
    });
});
```

---

## ✅ RÉSULTAT FINAL:

Avec ces modifications, PharmaSOFT aura:

✅ **Gestion complète CNAM**
✅ **Calculs automatiques** part CNAM/patient  
✅ **Badges visuels** sur produits remboursables  
✅ **Rapports conformes** pour déclaration CNAM  
✅ **Import facile** depuis listes PCT  
✅ **Conformité réglementaire** tunisienne  

---

## 🚀 Prochaines Étapes:

1. Mettre à jour schéma Prisma
2. Ajouter champs au formulaire
3. Implémenter calculs CNAM
4. Créer rapport mensuel
5. Tester avec produits CNAM

**Temps estimé: 30-40 minutes**

**Voulez-vous que je commence l'implémentation maintenant?** 🇹🇳
