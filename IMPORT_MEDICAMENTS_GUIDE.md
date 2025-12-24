# 📥 IMPORT MÉDICAMENTS REMBOURSABLES - GUIDE COMPLET

## 🎯 OBJECTIF
Importer votre fichier de médicaments remboursables (PCT/CNAM) dans PharmaSOFT

---

## 📋 ÉTAPE 1: Préparer Votre Fichier

### Format Requis: CSV ou Excel

Votre fichier doit avoir ces colonnes (ajustez selon votre fichier):

```csv
Code,Nom_Commercial,DCI,Prix_Public,Prix_Achat,CNAM,Taux,Ordonnance,Classe
3400123456,DOLIPRANE 1000MG,Paracétamol,2.500,1.800,OUI,85,NON,Antalgique
3400789012,AMOXIL 500MG,Amoxicilline,8.500,6.200,OUI,100,OUI,Antibiotique
```

### Colonnes Minimales Requises:
- **Code** (Code-barres/Code produit)
- **Nom_Commercial** (Nom du médicament)
- **Prix_Public** (Prix de vente)

### Colonnes CNAM Optionnelles:
- **DCI** (Nom international)
- **CNAM** (OUI/NON ou 1/0)
- **Taux** (85, 100, 70, 50)
- **Ordonnance** (OUI/NON)
- **Classe** (Antalgique, Antibiotique, etc.)

---

## 🔧 ÉTAPE 2: Convertir en CSV

### Si votre fichier est en Excel (.xlsx):

1. Ouvrez avec Excel
2. **Fichier → Enregistrer sous**
3. Type: **CSV (délimité par des virgules)**
4. Encodage: **UTF-8** (important!)
5. Sauvegardez

### Si c'est un PDF (liste PCT):

**Malheureusement**, il faudra:
1. Extraire le texte (outil OCR)
2. Reformater en Excel
3. Puis convertir en CSV

---

## 💻 ÉTAPE 3: Script d'Import

### Option A: Import API Simple (Recommandé)

Créez ce fichier: `import-products.js`

```javascript
const fs = require('fs');
const csv = require('csv-parser');

const API_URL = 'http://localhost:3000/api/products';

// Lire et importer le CSV
fs.createReadStream('medicaments.csv')
  .pipe(csv())
  .on('data', async (row) => {
    try {
      // Mapper vos colonnes aux champs PharmaSOFT
      const product = {
        barcode: row.Code || row.code || row.CODE,
        commercial_name: row.Nom_Commercial || row.nom || row.NOM,
        dci_name: row.DCI || row.dci || '',
        public_price: parseFloat(row.Prix_Public || row.prix || 0),
        purchase_price: parseFloat(row.Prix_Achat || row.achat || 0),
        vat_rate: 7.0, // TVA Tunisie
        current_stock: 0,
        low_stock_threshold: 5,
        
        // CNAM Fields
        cnam_reimbursable: (row.CNAM || row.cnam || 'NON').toUpperCase() === 'OUI',
        cnam_rate: parseFloat(row.Taux || row.taux || 85),
        requires_prescription: (row.Ordonnance || row.ordonnance || 'NON').toUpperCase() === 'OUI',
        therapeutic_class: row.Classe || row.classe || '',
      };

      // Envoyer à l'API
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });

      if (response.ok) {
        console.log('✓', product.commercial_name);
      } else {
        console.log('✗', product.commercial_name, await response.text());
      }
    } catch (error) {
      console.error('Erreur:', row, error.message);
    }
  })
  .on('end', () => {
    console.log('✅ Import terminé!');
  });
```

**Pour l'utiliser:**
```bash
npm install csv-parser
node import-products.js
```

---

## 📊 ÉTAPE 4: Template Excel

Voici un template que vous pouvez utiliser:

| Code | Nom_Commercial | DCI | Prix_Public | Prix_Achat | CNAM | Taux | Ordonnance | Classe |
|------|----------------|-----|-------------|------------|------|------|------------|--------|
| 3400123456 | DOLIPRANE 1000MG | Paracétamol | 2.500 | 1.800 | OUI | 85 | NON | Antalgique |
| 3400789012 | AMOXIL 500MG | Amoxicilline | 8.500 | 6.200 | OUI | 100 | OUI | Antibiotique |
| 3400555666 | ASPIRINE 500MG | Acide acétylsalicylique | 1.500 | 1.100 | NON | 0 | NON | Antalgique |
| 3400777888 | DIABETA 5MG | Glibenclamide | 12.500 | 9.200 | OUI | 100 | OUI | Antidiabétique |

**Téléchargez:** `PCT_IMPORT_TEMPLATE.xlsx` (créez avec ce format)

---

## 🚀 MÉTHODE RAPIDE: SQL Direct

### Si vous êtes à l'aise avec SQL:

```sql
-- Ouvrir la base de données SQLite
-- Fichier: packages/database/prisma/pharmasoft.db

-- Import depuis CSV (SQLite)
.mode csv
.import medicaments.csv temp_import

-- Insérer dans products
INSERT INTO Product (
  barcode, commercial_name, dci_name,
  public_price, purchase_price, vat_rate,
  current_stock, low_stock_threshold,
  cnam_reimbursable, cnam_rate, requires_prescription, therapeutic_class,
  createdAt, updatedAt
)
SELECT 
  Code,
  Nom_Commercial,
  DCI,
  CAST(Prix_Public AS REAL),
  CAST(Prix_Achat AS REAL),
  7.0,
  0,
  5,
  CASE WHEN CNAM = 'OUI' THEN 1 ELSE 0 END,
  CAST(Taux AS REAL),
  CASE WHEN Ordonnance = 'OUI' THEN 1 ELSE 0 END,
  Classe,
  datetime('now'),
  datetime('now')
FROM temp_import;

-- Nettoyer
DROP TABLE temp_import;
```

---

## 🎯 MÉTHODE MANUELLE (Petites Listes)

### Pour < 50 produits:

1. **Ouvrez PharmaSOFT:** http://localhost:5173
2. **Inventory → Add Product**
3. **Remplissez manuellement** avec votre liste
4. **Copier-coller** depuis Excel pour aller plus vite

**Astuce:** Gardez Excel ouvert à côté et copiez les valeurs

---

## 📱 OPTION FUTURE: Component Upload

### Je peux créer pour vous:

Un composant **"Import Products"** dans l'app avec:
- ✅ Upload fichier CSV/Excel
- ✅ Preview données avant import
- ✅ Mapping colonnes automatique
- ✅ Validation
- ✅ Import batch (1000+ produits)
- ✅ Rapport d'erreurs

**Voulez-vous que je le crée?** (30-40 min)

---

## 🔍 TROUBLESHOOTING

### Problème: Codes-barres existants
**Solution:** L'import échouera sur doublons. Supprimer d'abord ou ignorer erreurs.

### Problème: Encodage caractères (é, è, à)
**Solution:** Sauvegarder CSV en **UTF-8**

### Problème: Prix avec virgules
**Solution:** Remplacer `,` par `.` dans Excel avant export

### Problème: Format dates
**Solution:** Laisser vide pour l'instant ou format: `YYYY-MM-DD`

---

## 📧 ENVOYEZ-MOI VOTRE FICHIER

**Si vous voulez de l'aide:**

1. **Quel format** avez-vous? (Excel, CSV, PDF)
2. **Combien de produits?** (50, 500, 5000?)
3. **Quelle solution** préférez-vous?
   - A) Script automatique
   - B) Component Upload dans l'app
   - C) SQL direct
   - D) Aide manuelle

**Dites-moi et je vous aide!** 🚀

---

## ✅ APRÈS L'IMPORT

### Vérifiez dans l'app:
1. **Inventory** → Voir tous vos produits
2. **Vérifier badges CNAM** 🇹🇳
3. **Tester une vente** avec produit CNAM
4. **Vérifier calculs** part CNAM/patient

---

## 💡 CONSEILS

1. **Commencez petit:** Testez avec 5-10 produits d'abord
2. **Vérifiez format:** Une ligne qui marche = toutes marcheront
3. **Backup:** Sauvegardez `pharmasoft.db` avant import massif
4. **Validation:** Vérifiez prix, codes-barres après import

**Besoin d'aide? Dites-moi où vous en êtes!** 😊
