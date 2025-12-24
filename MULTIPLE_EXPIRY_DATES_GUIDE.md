# 📅 Gestion Dates de Péremption Multiples - Guide Complet

## 🎯 Problème

**Réalité en pharmacie:**
Un même médicament peut avoir plusieurs lots avec dates d'expiration différentes.

**Exemple:**
```
DOLIPRANE 1000MG - Stock Total: 150 unités
  - Lot A: 50 unités → Expire 30/06/2025
  - Lot B: 60 unités → Expire 31/12/2025
  - Lot C: 40 unités → Expire 28/02/2026
```

**Système actuel PharmaBest:**
- 1 produit = 1 date expiration
- Pas de suivi par lot automatique

---

## ✅ Solutions Pratiques

### **Solution 1: Gestion FEFO Simple** ⭐ RECOMMANDÉ

**FEFO = First Expiry, First Out (Premier périmé, premier sorti)**

#### **Principe:**
1. **Dans PharmaBest**: Stocker TOUJOURS la date la plus ancienne
2. **En pratique**: Vendre les lots dans l'ordre d'expiration
3. **Mise à jour**: Quand lot épuisé, mettre à jour avec date suivante

#### **Procédure:**

##### **À la Réception:**
```
1. Recevoir nouveau lot
2. Comparer date expiration avec celle dans le système
3. SI nouvelle date < date système:
   → Modifier produit avec nouvelle date
4. SINON:
   → Garder date actuelle (la plus ancienne)
5. Ajouter stock normalement
6. IMPORTANT: Noter lot en Stock Adjustment → Notes
```

##### **À la Vente:**
```
1. POS affiche date expiration (la plus ancienne)
2. Physiquement: Prendre produit avec date la plus proche
3. Quand lot épuisé:
   → Modifier produit avec date du lot suivant
```

#### **Exemple Complet:**

**Jour 1: Réception Lot A**
```
Product: DOLIPRANE 1000MG
Expiry Date: 30/06/2025
Stock: +50
Notes: LOT-A / Exp: 30/06/2025
```

**Jour 5: Réception Lot B**
```
Lot B expire 31/12/2025 (APRÈS Lot A)
→ PAS de changement date expiration
Product expiry reste: 30/06/2025
Stock: +60
Notes: LOT-B / Exp: 31/12/2025
```

**Jour 10: Réception Lot C (URGENT)**
```
Lot C expire 15/05/2025 (AVANT Lot A!)
→ MODIFIER date expiration produit!

Product expiry UPDATE: 15/05/2025
Stock: +30
Notes: LOT-C URGENT / Exp: 15/05/2025
```

**Après vente Lot C:**
```
Lot C épuisé
→ Modifier expiry date: 30/06/2025 (Lot A)
```

---

### **Solution 2: Registre de Lots Manuel** 📋

Tenir un registre Excel/papier parallèle.

#### **Template Excel:**

| Produit | Lot | Qté | Exp | Reçu | Stock Actuel | Priorité |
|---------|-----|-----|-----|------|--------------|----------|
| DOLIPRANE 1000 | A | 50 | 30/06/25 | 15/01 | 20 | 🔴 1 |
| DOLIPRANE 1000 | B | 60 | 31/12/25 | 20/01 | 60 | 🟡 2 |
| DOLIPRANE 1000 | C | 40 | 28/02/26 | 22/01 | 40 | 🟢 3 |

#### **Codes Couleur:**
- 🔴 **Rouge**: < 3 mois - VENDRE EN PRIORITÉ
- 🟡 **Jaune**: 3-6 mois - Surveiller
- 🟢 **Vert**: > 6 mois - OK

#### **Utilisation:**
1. Mettre à jour registre à chaque réception
2. Cocher lots vendus
3. Vérifier périméption chaque semaine
4. PharmaBest: Date la plus ancienne uniquement

---

### **Solution 3: Notes dans Stock Adjustments** 📝

Utiliser le champ "Notes" pour tracer les lots.

#### **À la Réception:**
```
Product Management → Stock Adjustment
Quantity: +50
Reason: Reception
Notes: 
LOT: A12345
EXP: 30/06/2025
FOURNISSEUR: XYZ Pharma
FACTURE: F2025-001
```

#### **Avantages:**
✅ Historique complet
✅ Traçabilité lots
✅ Audit trail
✅ Déjà dans le système!

#### **Consultation:**
Stock Adjustments History → Voir tous les lots reçus

---

## 🔄 Workflow Recommandé

### **Réception Quotidienne:**

```
1. Scanner/Chercher produit
2. Vérifier date expiration actuelle
3. Comparer avec nouveau lot
4. SI lot plus ancien: 
   → Mettre à jour expiry date produit
5. Ajouter stock
6. Notes: LOT + Date exp complète
```

### **Vente Quotidienne:**

```
1. POS affiche date expiration (la plus ancienne)
2. Pharmacien: Prendre physiquement le lot le plus ancien
3. Vendre normalement
```

### **Revue Hebdomadaire:**

```
1. Expiry Alerts → Vérifier produits proches expiration
2. Consulter registre lots (si utilisé)
3. Ajuster expiry dates si lots épuisés
4. Planifier promotions pour lots proches péremption
```

---

## 💡 Bonnes Pratiques Pharmacie

### **Principe FEFO (First Expiry, First Out)**
Toujours vendre le lot qui expire EN PREMIER, même s'il est arrivé en dernier!

### **Organisation Physique:**
```
Rayon:
[Front] ← Lot A (Exp: 06/25) - À vendre en premier
[Middle] ← Lot B (Exp: 12/25)
[Back] ← Lot C (Exp: 02/26) - Stock de réserve
```

### **Signalétique:**
- Étiquette ROUGE: < 3 mois
- Étiquette JAUNE: 3-6 mois
- Vérification mensuelle

---

## 🎯 Exemple Complet Réel

### **Scenario:**

**AMOXIL 500MG**

**15/01/2025 - Réception Lot A:**
```
PharmaBest:
- Product: AMOXIL 500MG
- Expiry: 30/06/2025
- Stock: +100
- Notes: LOT-A2501 / Exp: 30/06/2025
```

**20/01/2025 - Réception Lot B:**
```
Lot B Exp: 31/12/2025 (après Lot A)
PharmaBest:
- Expiry: 30/06/2025 (PAS DE CHANGEMENT)
- Stock: +80
- Notes: LOT-B2502 / Exp: 31/12/2025
```

**25/01/2025 - Vente 60 unités:**
```
Vente: Lot A (le plus ancien)
PharmaBest:
- Stock: -60
Physiquement: Prendre du Lot A
Lot A restant: 40 unités
```

**10/03/2025 - Vente 50 unités:**
```
Vente: Lot A (reste 40) + Lot B (10)
PharmaBest:
- Stock: -50
LOT A ÉPUISÉ!
→ METTRE À JOUR EXPIRY DATE!

Action:
Product Management → Edit
Expiry Date: 31/12/2025 (Lot B)
```

---

## 📊 Suivi Recommandé

### **Tableau de Bord Hebdomadaire:**

| Produit | Lots Actifs | Date la Plus Proche | Action |
|---------|-------------|---------------------|--------|
| DOLIPRANE | 3 | 30/06/2025 | Promo si < 2 mois |
| AMOXIL | 2 | 31/08/2025 | OK |
| VENTOLINE | 1 | 15/04/2025 | URGENT! |

---

## ⚠️ Alertes Automatiques

PharmaBest a **Expiry Alerts** qui affiche:
- Produits expirant dans 60 jours
- Produits déjà expirés

**Important:**
C'est basé sur la date dans le produit → Donc TOUJOURS mettre la plus ancienne!

---

## 🆘 Que Faire Si Lot Périmé?

1. **Ne PAS vendre**
2. **Stock Adjustment:**
   ```
   Quantity: -30 (négatif!)
   Reason: Expired
   Notes: LOT-X / Expired 15/01/2025 / À détruire
   ```
3. **Destruction:** Selon réglementation Tunisie
4. **Comptabilité:** Perte enregistrée

---

## ✅ Résumé

| Méthode | Complexité | Précision | Recommandé Pour |
|---------|------------|-----------|-----------------|
| FEFO Simple | ⭐ Facile | ⭐⭐ Moyenne | Petite pharmacie |
| Registre Lots | ⭐⭐ Moyen | ⭐⭐⭐ Élevée | Moyenne pharmacie |
| Notes Stock Adj | ⭐ Facile | ⭐⭐ Moyenne | Toutes tailles |

**Conseil:** Commencer avec **FEFO Simple** + **Notes Stock Adjustments**

---

## 📞 Support

Template Excel disponible: `BATCH_REGISTER_TEMPLATE.md`

**Besoin d'aide?** Voir guide PharmaBest ou contacter support.
