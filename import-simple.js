// Script d'import simple pour médicaments
// Usage: node import-simple.js

const fs = require('fs');
const path = require('path');

// Configuration
const CSV_FILE = 'medicaments.csv'; // Votre fichier
const API_URL = 'http://localhost:3000/api/products';

// Fonction pour parser CSV simple
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const products = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim());
        const product = {};

        headers.forEach((header, index) => {
            product[header] = values[index];
        });

        products.push(product);
    }

    return products;
}

// Fonction pour mapper les données
function mapProduct(row) {
    return {
        // Ajustez ces noms selon vos colonnes!
        barcode: row.Code || row.code || row.CODE || `AUTO${Date.now()}${Math.random()}`,
        commercial_name: row.Nom || row.nom || row.NOM || row.Nom_Commercial || row.PRODUIT || 'Unknown',
        dci_name: row.DCI || row.dci || '',
        public_price: parseFloat(row.Prix || row.prix || row.PRIX || row.Prix_Public || 0),
        purchase_price: parseFloat(row.Achat || row.achat || row.Prix_Achat || row.public_price * 0.7 || 0),
        vat_rate: 7.0,
        current_stock: 0,
        low_stock_threshold: 5,

        // CNAM
        cnam_reimbursable: (row.CNAM || row.cnam || row.Remboursable || '').toUpperCase().includes('OUI') ||
            (row.CNAM || row.cnam || '').toUpperCase().includes('YES') ||
            (row.Taux || row.taux || '0') !== '0',
        cnam_rate: parseFloat(row.Taux || row.taux || row.TAUX || 0) || 85,
        requires_prescription: (row.Ordonnance || row.ordonnance || '').toUpperCase().includes('OUI'),
        therapeutic_class: row.Classe || row.classe || row.CLASSE || '',
    };
}

// Import principal
async function importProducts() {
    try {
        console.log('📂 Lecture du fichier CSV...');
        const content = fs.readFileSync(CSV_FILE, 'utf-8');
        const rows = parseCSV(content);

        console.log(`📊 Trouvé ${rows.length} produits`);
        console.log('📋 Colonnes détectées:', Object.keys(rows[0] || {}));
        console.log('');

        let imported = 0;
        let errors = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                const product = mapProduct(row);

                // Afficher premier produit pour vérification
                if (i === 0) {
                    console.log('🔍 EXEMPLE - Premier produit:');
                    console.log(JSON.stringify(product, null, 2));
                    console.log('');
                    console.log('⚠️  VÉRIFIEZ que le mapping est correct!');
                    console.log('⚠️  Si non, éditez la fonction mapProduct()');
                    console.log('');
                    console.log('Continuer? (Ctrl+C pour arrêter, Enter pour continuer)');

                    // Pause pour vérification
                    await new Promise(resolve => {
                        process.stdin.once('data', () => {
                            console.log('');
                            console.log('🚀 Import en cours...');
                            resolve();
                        });
                    });
                }

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(product)
                });

                if (response.ok) {
                    imported++;
                    process.stdout.write(`\r✓ Importé: ${imported}/${rows.length} (${Math.round(imported / rows.length * 100)}%)`);
                } else {
                    const error = await response.text();
                    if (!error.includes('Unique constraint')) { // Ignore doublons
                        errors++;
                        console.log(`\n✗ Erreur ligne ${i + 2}: ${product.commercial_name}`);
                        console.log(`  Raison: ${error.substring(0, 100)}`);
                    }
                }
            } catch (err) {
                errors++;
                console.log(`\n✗ Erreur ligne ${i + 2}:`, err.message);
            }
        }

        console.log('\n\n✅ IMPORT TERMINÉ!');
        console.log(`📊 Résumé:`);
        console.log(`   - Total: ${rows.length} lignes`);
        console.log(`   - Importés: ${imported} produits`);
        console.log(`   - Erreurs: ${errors}`);

    } catch (error) {
        console.error('❌ ERREUR:', error.message);
        console.log('\n💡 Conseils:');
        console.log('   - Vérifiez que medicaments.csv existe');
        console.log('   - Vérifiez que le serveur tourne (http://localhost:3000)');
        console.log('   - Vérifiez le format CSV (séparateur virgule)');
    }
}

// Lancer l'import
console.log('🇹🇳 IMPORT MÉDICAMENTS PHARMASOFT');
console.log('================================\n');
importProducts();
