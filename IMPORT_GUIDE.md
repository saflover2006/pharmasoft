# 🇹🇳 Guide d'Import - Liste Complète PCT Tunisie

## 📥 Où Télécharger la Liste Officielle

### Option 1: Site PCT (Recommandé)
**URL**: https://www.pct.com.tn/nomenclature
- Télécharger le fichier Excel/CSV
- Contient TOUS les médicaments enregistrés en Tunisie
- Mis à jour régulièrement par le gouvernement

### Option 2: CNAM Tunisie
**URL**: https://www.cnam.nat.tn/liste-medicaments
- Liste des médicaments remboursables
- Format Excel ou PDF (convertir en CSV)

### Option 3: Ministère de la Santé
**URL**: https://www.santetunisie.rns.tn/
- Section "Médicaments autorisés"

---

## 🔧 Préparation du Fichier CSV

### Format Attendu

Le CSV doit avoir ces colonnes (ordre flexible):

```csv
Code,Dénomination,DCI,Prix Public TTC,Taux
12345,DOLIPRANE 1000MG,PARACETAMOL,3.500,85
...
```

### Colonnes Reconnues Automatiquement

**Code/Barcode:**
- `Code`, `CODE`, `Code CNAM`, `N° ENREGISTREMENT`, `NumEnreg`

**Nom Commercial:**
- `Dénomination`, `DENOMINATION`, `Nom`, `NOM`, `Produit`, `PRODUIT`

**DCI (Principe Actif):**
- `DCI`, `Principe Actif`, `PRINCIPE ACTIF`, `Composition`

**Prix:**
- `Prix Public TTC`, `PRIX PUBLIC TTC`, `Prix`, `PPH`, `Tarif`

**Taux Remboursement:**
- `Taux`, `TAUX`, `Taux Remboursement`, `% Remb`

---

## 📝 Conversion Excel → CSV

### Avec Excel/LibreOffice:
1. Ouvrir le fichier `.xlsx`
2. Fichier → Enregistrer sous
3. Type: **CSV UTF-8 (délimité par des virgules)**
4. Nom: `medicaments-cnam.csv`
5. Enregistrer dans `c:\Users\Rimen\projects\pharmasoft\`

### Avec Google Sheets:
1. Ouvrir le fichier
2. Fichier → Télécharger → CSV
3. Renommer en `medicaments-cnam.csv`
4. Placer dans le dossier PharmaSoft

---

## 🚀 Import Initial

```bash
# Dans le dossier pharmasoft
cd c:\Users\Rimen\projects\pharmasoft
node import-cnam.js
```

---

## 🔄 Mises à Jour Régulières

### Fréquence Recommandée
- **Mensuelle**: Prix et nouveaux médicaments
- **Trimestrielle**: Changements CNAM
- **Annuelle**: Liste complète

### Processus de Mise à Jour
1. Télécharger la nouvelle liste PCT
2. Convertir en CSV
3. Remplacer `medicaments-cnam.csv`
4. Lancer: `node import-update.js` (création en cours)

---

## ⚠️ Notes Importantes

### Stock
- Import met `current_stock = 0` par défaut
- Ajuster manuellement dans PharmaBest → Products

### Prix d'Achat
- Calculé automatiquement: 75% du prix public
- À ajuster selon vos fournisseurs

### Classes Thérapeutiques
- Non remplies automatiquement
- À compléter manuellement si besoin

---

## 📊 Statistiques PCT Tunisie (2024)

- **~8,000** médicaments enregistrés
- **~4,500** remboursables CNAM
- **Taux**: 35%, 85%, 100%
- **TVA Médicaments**: 7%

---

## 🆘 Besoin d'Aide?

**Problèmes courants:**
- CSV mal formaté → Vérifier encodage UTF-8
- Colonnes non reconnues → Voir liste ci-dessus
- Doublons → Normal, seront ignorés
- Erreurs API → Vérifier serveur actif

**Contact support PCT:**
- ☎️ +216 71 123 456 (à vérifier)
- 📧 contact@pct.com.tn
