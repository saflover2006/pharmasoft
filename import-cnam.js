// Script d'import CNAM Tunisie - Liste Officielle
// Usage: node import-cnam.js

const fs = require('fs');

const CSV_FILE = 'medicaments-cnam.csv';
const API_URL = 'http://localhost:3000/api/products';

// Parser CSV avec gestion des guillemets
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const headers = parseCSVLine(lines[0]);
    const products = [];

    console.log('📋 Colonnes détectées:', headers);
    console.log('');

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const product = {};

        headers.forEach((header, index) => {
            product[header] = values[index] || '';
        });

        products.push(product);
    }

    return { headers, products };
}

// Mapping pour fichiers CNAM typiques
function mapCNAMProduct(row) {
    // Détecter les noms de colonnes possibles
    const getField = (possibleNames) => {
        for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== '') {
                return row[name];
            }
        }
        return '';
    };

    const code = getField([
        'Code', 'CODE', 'Code CNAM', 'CODE CNAM', 'Code Produit',
        'N° ENREGISTREMENT', 'NumEnreg'
    ]);

    const nom = getField([
        'Dénomination', 'DENOMINATION', 'Nom', 'NOM', 'Nom Commercial',
        'PRODUIT', 'Désignation', 'DESIGNATION'
    ]);

    const dci = getField([
        'DCI', 'Principe Actif', 'PRINCIPE ACTIF', 'Composition'
    ]);

    const prix = getField([
        'Prix Public TTC', 'PRIX PUBLIC TTC', 'Prix', 'PRIX',
        'Prix Public', 'PPH', 'Tarif'
    ]);

    const taux = getField([
        'Taux', 'TAUX', 'Taux Remboursement', 'TAUX REMBOURSEMENT',
        '% Remb', 'Prise en charge'
    ]);

    // Nettoyer les valeurs
    const cleanPrice = (prix || '0').replace(/[^\d.,]/g, '').replace(',', '.');
    const cleanTaux = (taux || '0').replace(/[^\d]/g, '');

    // Déterminer si ordonnance requise (VEI = Vente Exclusive en Pharmacie)
    const isVEI = nom.includes('VEI') || nom.includes('V.E.I');

    return {
        barcode: code || `CNAM${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        commercial_name: nom.substring(0, 200), // Limite si nom trop long
        dci_name: dci.substring(0, 200),
        public_price: parseFloat(cleanPrice) || 0,
        purchase_price: (parseFloat(cleanPrice) || 0) * 0.75, // Estimation 75%
        vat_rate: 7.0,
        current_stock: 0,
        low_stock_threshold: 5,

        // CNAM - Tous remboursables car liste officielle
        cnam_reimbursable: true,
        cnam_rate: parseInt(cleanTaux) || 85,
        requires_prescription: isVEI,
        therapeutic_class: '', // À compléter manuellement si besoin
    };
}

// Import
async function importCNAM() {
    try {
        console.log('🇹🇳 IMPORT LISTE CNAM OFFICIELLE');
        console.log('=================================\n');

        console.log('📂 Lecture du fichier...');
        const content = fs.readFileSync(CSV_FILE, 'utf-8');
        const { headers, products } = parseCSV(content);

        console.log(`📊 Trouvé ${products.length} médicaments CNAM`);
        console.log('');

        // Afficher exemple
        if (products.length > 0) {
            console.log('🔍 EXEMPLE - Premier médicament:');
            console.log('Données brutes:', products[0]);
            console.log('');
            console.log('Mapping:', mapCNAMProduct(products[0]));
            console.log('');
            console.log('⚠️  VÉRIFIEZ le mapping!');
            console.log('⚠️  Appuyez sur Enter pour continuer ou Ctrl+C pour arrêter');
            console.log('');

            await new Promise(resolve => {
                process.stdin.once('data', resolve);
            });
        }

        console.log('🚀 Import en cours...\n');

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < products.length; i++) {
            try {
                const product = mapCNAMProduct(products[i]);

                // Skip si pas de nom
                if (!product.commercial_name || product.commercial_name.length < 3) {
                    skipped++;
                    continue;
                }

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(product)
                });

                if (response.ok) {
                    imported++;
                    process.stdout.write(`\r✓ ${imported} importés, ${skipped} ignorés, ${errors} erreurs (${Math.round(i / products.length * 100)}%)`);
                } else {
                    const error = await response.text();
                    if (error.includes('Unique constraint')) {
                        skipped++;
                    } else {
                        errors++;
                        if (errors < 10) { // Limiter affichage erreurs
                            console.log(`\n✗ Erreur: ${product.commercial_name.substring(0, 50)}`);
                        }
                    }
                }
            } catch (err) {
                errors++;
            }
        }

        console.log('\n\n✅ IMPORT TERMINÉ!');
        console.log('================\n');
        console.log(`📊 Résumé:`);
        console.log(`   Total lignes:     ${products.length}`);
        console.log(`   ✓ Importés:       ${imported} médicaments`);
        console.log(`   ⊘ Ignorés:        ${skipped} (doublons ou invalides)`);
        console.log(`   ✗ Erreurs:        ${errors}`);
        console.log('');
        console.log('🎉 Vérifiez dans PharmaSOFT → Inventory!');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.log('\n💡 Vérifiez:');
        console.log('   1. Fichier medicaments-cnam.csv existe');
        console.log('   2. Serveur tourne (http://localhost:3000)');
        console.log('   3. Format CSV UTF-8');
    }
}

importCNAM();
