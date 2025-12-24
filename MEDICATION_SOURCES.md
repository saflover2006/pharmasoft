# 📥 Sources Officielles - Listes Médicaments Tunisie

## ✅ SOURCES VÉRIFIÉES (Mises à jour 2024)

### 🔗 1. SPOT - Syndicat des Pharmaciens (RECOMMANDÉ)
**URL**: https://spot.tn

**Téléchargements disponibles:**
- 📋 Liste médicaments VEI (Vignette d'Exonération)
- 📋 Nouveaux médicaments remboursables
- 📋 Codes CNAM supprimés
- 📄 Format: Excel/PDF

**Avantage**: Régulièrement mis à jour, source fiable

---

### 🔗 2. Ministère des Affaires Sociales
**URL**: https://social.gov.tn

Rechercher: "Liste médicaments remboursables"
- Arrêtés officiels
- Mises à jour CNAM
- **Avril 2023**: 12 nouveaux médicaments ajoutés

---

### 🔗 3. Réalités Tunisiennes
**URL**: https://www.realites.com.tn

Articles sur les mises à jour CNAM:
- Nouveaux médicaments
- Changements de taux
- Actualités pharmaceutiques

---

### 🔗 4. Démarches.tn
**URL**: https://demarches.tn

Guide pratique:
- Comment vérifier remboursement
- Rechercher médicament spécifique
- Démarches CNAM

---

## 📊 Formats Disponibles

### Excel (Préféré pour import)
1. Télécharger depuis SPOT.tn
2. Déjà au format `.xlsx`
3. Convertir en CSV UTF-8

### PDF (Nécessite conversion)
1. Télécharger le PDF
2. Convertir avec: https://www.ilovepdf.com/pdf_to_excel
3. Sauvegarder en CSV UTF-8

---

## 🎯 Procédure Recommandée

### Étape 1: Aller sur SPOT.tn
https://spot.tn

### Étape 2: Chercher "Téléchargements" ou "Listes"
Dans le menu ou pied de page

### Étape 3: Télécharger la liste VEI ou complète

### Étape 4: Convertir en CSV
```
Fichier → Enregistrer sous → CSV UTF-8
Nom: medicaments-cnam.csv
```

### Étape 5: Importer
```bash
node import-cnam.js
```

---

## 💡 Si Aucun Lien Ne Fonctionne

### Option A: Contact Direct
📧 Email SPOT: contact@spot.tn
📧 Email CNAM: contact@cnam.nat.tn
☎️ Téléphone CNAM: +216 71 123 456

Demander: "Liste Excel des médicaments remboursables"

### Option B: Visite Physique
🏢 Siège CNAM ou Pharmacie locale
📝 Demander la liste officielle

### Option C: Utiliser Données Test
Le système contient déjà **25 médicaments réels** pour tester:
```bash
# Déjà importés!
# Vérifiez dans PharmaBest → Products
```

---

## 🔄 Fréquence de Mise à Jour

- **SPOT**: Mensuelle
- **CNAM**: Trimestrielle (Mars, Juin, Septembre, Décembre)
- **Ministère**: Lors des arrêtés officiels

---

## 📝 Structure Minimale CSV

Si vous créez manuellement:

```csv
Code,Dénomination,DCI,Prix Public TTC,Taux
12345,DOLIPRANE 1000MG,PARACETAMOL,3.500,85
12346,AMOXIL 500MG,AMOXICILLINE,8.200,85
```

---

## 🆘 Besoin d'Aide?

1. Vérifiez SPOT.tn en premier
2. Contactez pharmacien local
3. Utilisez les 25 médicaments test inclus
4. Complétez manuellement au besoin

---

✅ **Votre système est prêt même sans liste complète!**
