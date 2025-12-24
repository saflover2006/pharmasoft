# 📋 Guide Rapide - Import Médicaments PCT Tunisie

## 🚀 Import Initial (Première Fois)

```bash
# 1. Télécharger la liste PCT en CSV
# 2. Nommer: medicaments-cnam.csv
# 3. Placer dans: c:\Users\Rimen\projects\pharmasoft\

# 4. Lancer l'import
cd c:\Users\Rimen\projects\pharmasoft
node import-cnam.js
```

**Résultat**: Tous les médicaments sont créés dans la base de données.

---

## 🔄 Mise à Jour (Mensuelle/Trimestrielle)

```bash
# 1. Télécharger la nouvelle liste PCT
# 2. Remplacer medicaments-cnam.csv

# 3. Lancer la mise à jour
node import-update.js
```

**Résultat**: 
- ✅ Prix mis à jour
- ✅ Taux CNAM actualisés
- ✅ Nouveaux médicaments ajoutés
- ✅ **Stock conservé** (pas touché!)

---

## 📥 Où Télécharger la Liste Complète

### 1. PCT Tunisie (OFFICIEL)
🔗 https://www.pct.com.tn/nomenclature
- **Contenu**: ~8,000 médicaments
- **Format**: Excel/CSV
- **Mise à jour**: Mensuelle

### 2. CNAM Tunisie
🔗 https://www.cnam.nat.tn/liste-medicaments
- **Contenu**: ~4,500 médicaments remboursables
- **Format**: Excel/PDF
- **Mise à jour**: Trimestrielle

### 3. Ministère de la Santé
🔗 https://www.santetunisie.rns.tn/
- Section "Médicaments autorisés"

---

## 📝 Conversion Excel → CSV

### Méthode Simple (Excel/LibreOffice)
1. Ouvrir le fichier `.xlsx`
2. **Fichier** → **Enregistrer sous**
3. Type: **CSV UTF-8 (délimité par des virgules)**
4. Nom: `medicaments-cnam.csv`
5. Enregistrer dans le dossier PharmaSoft

---

## 🔧 Scripts Disponibles

| Script | Usage | Fonction |
|--------|-------|----------|
| `import-cnam.js` | Premier import | Crée tous les produits |
| `import-update.js` | Mises à jour | Met à jour prix/infos |

---

## ✅ Calendrier de Mise à Jour Recommandé

- **Mensuel**: Mise à jour prix (important!)
- **Trimestriel**: Nouveaux médicaments + taux CNAM
- **Annuel**: Import complet de vérification

---

## 🎯 Ce Qui Est Importé

✅ Code/Barcode du médicament
✅ Nom commercial complet
✅ DCI (Principe actif)
✅ Prix public TTC (TND)
✅ Prix d'achat (calculé 75%)
✅ Taux remboursement CNAM (35%, 85%, 100%)
✅ Ordonnance requise (VEI)
✅ TVA médicaments (7%)

---

## 📊 Statistiques

- **Total médicaments enregistrés**: ~8,000
- **Remboursables CNAM**: ~4,500
- **Dernière maj PCT**: Vérifier sur pct.com.tn

---

## 🆘 Support

**Problème?** Voir `IMPORT_GUIDE.md` pour guide détaillé.

**Contact PCT**: contact@pct.com.tn
