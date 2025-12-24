# CNAM - Code à Ajouter au Formulaire ProductManagement

## 📋 Instructions:

Ouvrez `ProductManagement.tsx` et cherchez la fin du formulaire (après les champs "Batch Number" ou "Low Stock Threshold").

Ajoutez cette section CNAM juste avant les boutons "Cancel" et "Save":

---

## 🇹🇳 CODE À COPIER-COLLER:

```tsx
{/* ========== CNAM SECTION ========== */}
<div className="col-span-2 border-t border-dark-border pt-6 mt-4">
    <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
        🇹🇳 Remboursement CNAM (Tunisie)
    </h3>
</div>

{/* DCI Name */}
<div>
    <label className="label">DCI (Dénomination Commune Internationale)</label>
    <input
        type="text"
        value={formData.dci_name || ''}
        onChange={(e) => setFormData({ ...formData, dci_name: e.target.value })}
        className="w-full"
        placeholder="Ex: Paracétamol, Amoxicilline..."
    />
    <p className="text-xs text-gray-500 mt-1">Nom international du principe actif</p>
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
                cnam_rate: isReimbursable ? 85 : undefined
            });
        }}
        className="w-full"
    >
        <option value="no">❌ Non - Vente Libre</option>
        <option value="yes">✅ Oui - Remboursable</option>
    </select>
</div>

{/* Taux Remboursement (si remboursable) */}
{formData.cnam_reimbursable && (
    <div>
        <label className="label">Taux Remboursement CNAM</label>
        <select
            value={formData.cnam_rate || 85}
            onChange={(e) => setFormData({ ...formData, cnam_rate: parseFloat(e.target.value) })}
            className="w-full"
        >
            {CNAM_RATES.map(rate => (
                <key={rate.value} value={rate.value}>
                    {rate.label}
                </option>
            ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
            Part patient: {100 - (formData.cnam_rate || 85)}%
        </p>
    </div>
)}

{/* Ordonnance Obligatoire */}
<div>
    <label className="label">Ordonnance Obligatoire</label>
    <select
        value={formData.requires_prescription ? 'yes' : 'no'}
        onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.value === 'yes' })}
        className="w-full"
    >
        <option value="no">Non</option>
        <option value="yes">Oui - ℞ Prescription Requise</option>
    </select>
</div>

{/* Classe Thérapeutique */}
<div>
    <label className="label">Classe Thérapeutique</label>
    <select
        value={formData.therapeutic_class || ''}
        onChange={(e) => setFormData({ ...formData, therapeutic_class: e.target.value })}
        className="w-full"
    >
        <option value="">Sélectionner une classe...</option>
        {THERAPEUTIC_CLASSES.map(cls => (
            <option key={cls.value} value={cls.value}>
                {cls.label}
            </option>
        ))}
    </select>
</div>

{/* Preview CNAM (si remboursable) */}
{formData.cnam_reimbursable && formData.cnam_rate && formData.public_price > 0 && (
    <div className="col-span-2 p-4 bg-success/10 border border-success/30 rounded-lg">
        <div className="text-sm font-semibold text-success mb-2">
            📊 Calcul Remboursement CNAM:
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
                <div className="text-gray-400">Prix Public:</div>
                <div className="font-bold text-gray-100">{formData.public_price.toFixed(3)} TND</div>
            </div>
            <div>
                <div className="text-gray-400">Part CNAM ({formData.cnam_rate}%):</div>
                <div className="font-bold text-success">
                    {(formData.public_price * formData.cnam_rate / 100).toFixed(3)} TND
                </div>
            </div>
            <div>
                <div className="text-gray-400">Part Patient ({100 - formData.cnam_rate}%):</div>
                <div className="font-bold text-warning">
                    {(formData.public_price * (100 - formData.cnam_rate) / 100).toFixed(3)} TND
                </div>
            </div>
        </div>
    </div>
)}
{/* ========== FIN SECTION CNAM ========== */}
```

---

## 📍 OÙ METTRE CE CODE:

### Dans ProductManagement.tsx:

1. Faites `Ctrl+F` et cherchez: `"Cancel"`
2. Remontez jusqu'à trouver la dernière `</div>` avant les boutons
3. **Collez le code CNAM juste avant les boutons Cancel/Save**

### Exemple de Structure:

```tsx
{/* Vos champs existants... */}
<div>
    <label>Low Stock Threshold</label>
    <input... />
</div>

{/* 👇 AJOUTEZ ICI LE CODE CNAM 👇 */}

{/* Boutons */}
<div className="flex space-x-3">
    <button type="button">Cancel</button>
    <button type="submit">Save</button>
</div>
```

---

## ✅ APRÈS AVOIR AJOUTÉ:

### Le formulaire aura:

✅ **5 Nouveaux Champs CNAM:**
1. DCI (nom international)
2. Remboursable CNAM (Oui/Non)
3. Taux remboursement (85%, 100%)
4. Ordonnance obligatoire
5. Classe thérapeutique

✅ **Preview en temps réel:**
- Calcul automatique part CNAM/patient
- Affichage visuel avec couleurs

✅ **Champs conditionnels:**
- Taux s'affiche seulement si remboursable
- Preview seulement si prix > 0

---

## 🧪 POUR TESTER:

1. Rafraîchir le navigateur
2. Inventory → Add Product
3. **Voir la nouvelle section CNAM** 🇹🇳
4. Remplir un produit avec CNAM:
   - Nom: DOLIPRANE 1000mg
   - DCI: Paracétamol  
   - Prix: 2.500 TND
   - **Remboursable: Oui**
   - **Taux: 85%**
   - Ordonnance: Non
   - Classe: Antalgique

5. **Regarder le preview automatique:**
   - Prix: 2.500 TND
   - CNAM: 2.125 TND (85%)
   - Patient: 0.375 TND (15%)

---

## 🎯 RÉSULTAT:

Après ce ajout, **ProductManagement sera 100% CNAM-ready!**

Vous pourrez:
- ✅ Marquer produits remboursables
- ✅ Définir taux remboursement
- ✅ Voir calculs en direct
- ✅ Classifier par classe thérapeutique
- ✅ Gérer ordonnances

**C'est la dernière pièce du puzzle CNAM!** 🎉

---

## 📝 NOTES:

- Le code utilise déjà les imports ajoutés (`THERAPEUTIC_CLASSES`, `CNAM_RATES`)
- Aucun autre fichier à modifier
- Les données seront sauvegardées automatiquement
- Compatible avec la base de données déjà mise à jour

**Bon ajout!** 🇹🇳✨
