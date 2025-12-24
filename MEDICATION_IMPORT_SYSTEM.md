# ✅ PharmaBest - Système d'Import Médicaments PCT

## 🎯 Résumé

Votre système PharmaBest peut maintenant importer et mettre à jour automatiquement **toute la liste officielle des médicaments PCT Tunisie** (~8,000 produits).

---

## 📁 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `import-cnam.js` | Import initial (créer produits) ✅ |
| `import-update.js` | Mise à jour régulière (MAJ prix) 🆕 |
| `import-medicaments.bat` | Assistant interactif Windows 🆕 |
| `IMPORT_GUIDE.md` | Guide complet détaillé 📚 |
| `IMPORT_QUICK_GUIDE.md` | Guide rapide 📋 |
| `medicaments-cnam.csv` | 25 médicaments test ✅ |

---

## 🚀 Comment Utiliser

### Méthode 1: Assistant Windows (Recommandé)

```bash
# Double-cliquer sur:
import-medicaments.bat
```

Menu interactif qui guide à travers:
1. Premier import
2. Mise à jour
3. Accès au guide

### Méthode 2: Ligne de Commande

```bash
# Premier import
node import-cnam.js

# Mises à jour
node import-update.js
```

---

## 📥 Obtenir la Liste Complète PCT

### Étape 1: Télécharger
🔗 https://www.pct.com.tn/nomenclature

Ou alternatives:
- https://www.cnam.nat.tn/liste-medicaments
- https://www.santetunisie.rns.tn/

### Étape 2: Convertir en CSV

**Avec Excel:**
1. Ouvrir le fichier `.xlsx`
2. Fichier → Enregistrer sous
3. Type: **CSV UTF-8**
4. Nom: `medicaments-cnam.csv`

**Avec Google Sheets:**
1. Importer le fichier
2. Fichier → Télécharger → CSV
3. Renommer: `medicaments-cnam.csv`

### Étape 3: Importer

Placer `medicaments-cnam.csv` dans:
```
c:\Users\Rimen\projects\pharmasoft\medicaments-cnam.csv
```

Puis lancer:
```bash
node import-cnam.js
```

---

## 🔄 Calendrier de Mise à Jour

| Fréquence | Raison | Commande |
|-----------|--------|----------|
| **Mensuel** | Mise à jour prix | `node import-update.js` |
| **Trimestriel** | Nouveaux médicaments + CNAM | `node import-update.js` |
| **Annuel** | Vérification complète | `node import-cnam.js` |

---

## ✨ Fonctionnalités

### Import Initial (`import-cnam.js`)
✅ Crée tous les produits
✅ Configure prix, DCI, CNAM
✅ Détecte médicaments VEI (ordonnance)
✅ Calcule prix d'achat (75% public)
✅ Ignore doublons automatiquement

### Mise à Jour (`import-update.js`)
✅ **Met à jour** les produits existants
✅ Actualise prix
✅ Met à jour taux CNAM
✅ Ajoute nouveaux médicaments
✅ **Conserve le stock** actuel
✅ Ne crée pas de doublons

---

## 📊 Données Importées

Pour chaque médicament:
- ✅ Code/Barcode officiel
- ✅ Nom commercial complet
- ✅ DCI (Principe actif)
- ✅ Prix public TTC (TND)
- ✅ Prix d'achat estimé
- ✅ Taux remboursement CNAM (35%, 85%, 100%)
- ✅ Ordonnance requise (VEI)
- ✅ TVA médicaments (7%)

---

## 🎯 Statistiques PCT Tunisie

- **Médicaments enregistrés**: ~8,000
- **Remboursables CNAM**: ~4,500
- **Taux remboursement**: 35%, 85%, 100%
- **TVA médicaments**: 7%

---

## 💡 Conseils

### Stock
Import met `stock = 0` par défaut. Ajustez dans:
**PharmaBest → Products → Stock Adjustment**

### Prix d'Achat
Calculé automatiquement à **75%** du prix public.
Modifiez selon vos fournisseurs dans:
**PharmaBest → Products → Edit**

### Classes Thérapeutiques
Non remplies automatiquement.
Complétez manuellement si besoin.

---

## 🆘 Support

**Questions?** Consultez:
- `IMPORT_GUIDE.md` - Guide détaillé
- `IMPORT_QUICK_GUIDE.md` - Référence rapide

**Problèmes d'import?**
- ✅ Vérifier serveur actif (http://localhost:3000)
- ✅ Vérifier format CSV UTF-8
- ✅ Vérifier colonnes du fichier

---

## 🎉 Prochaines Étapes

1. **Télécharger** la liste PCT complète
2. **Importer** avec `import-cnam.js`
3. **Ajuster** les stocks dans PharmaBest
4. **Vendre** avec données CNAM complètes!

---

## 📞 Contacts Utiles

- **PCT Tunisie**: https://www.pct.com.tn
- **CNAM**: https://www.cnam.nat.tn
- **Ministère Santé**: https://www.santetunisie.rns.tn

---

✅ **Votre système est prêt pour gérer TOUS les médicaments de Tunisie!** 🇹🇳
