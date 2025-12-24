// Script de MISE À JOUR CNAM Tunisie
// Usage: node import-update.js
// Met à jour les prix et infos CNAM sans créer de doublons

const fs = require('fs');

const CSV_FILE = 'medicaments-cnam.csv';
const API_URL = 'http://localhost:3000/api/products';

// Parser CSV (identique import-cnam.js)
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

function mapCNAMProduct(row) {
    const getField = (possibleNames) => {
        for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== '') {
                return row[name];
            }
        }
        return '';
    };

    const code = getField(['Code', 'CODE', 'Code CNAM', 'N° ENREGISTREMENT']);
    const nom = getField(['Dénomination', 'DENOMINATION', 'Nom', 'PRODUIT']);
    const dci = getField(['DCI', 'Principe Actif', 'PRINCIPE ACTIF']);
    const prix = getField(['Prix Public TTC', 'PRIX PUBLIC TTC', 'Prix']);
    const taux = getField(['Taux', 'TAUX', 'Taux Remboursement']);

    const cleanPrice = (prix || '0').replace(/[^\d.,]/g, '').replace(',', '.');
    const cleanTaux = (taux || '0').replace(/[^\d]/g, '');
    const isVEI = nom.includes('VEI') || nom.includes('V.E.I');

    return {
        barcode: code || `CNAM${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        commercial_name: nom.substring(0, 200),
        dci_name: dci.substring(0, 200),
        public_price: parseFloat(cleanPrice) || 0,
        purchase_price: (parseFloat(cleanPrice) || 0) * 0.75,
        vat_rate: 7.0,
        cnam_reimbursable: true,
        cnam_rate: parseInt(cleanTaux) || 85,
        requires_prescription: isVEI,
    };
}

// Récupérer produits existants
async function getExistingProducts() {
    try {
        const response = await fetch(`${API_URL}?limit=10000`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.success ? data.data.products : [];
    } catch {
        return [];
    }
}

// Import/Update
async function importUpdate() {
    try {
        console.log('🔄 MISE À JOUR LISTE CNAM');
        console.log('=========================\n');

        console.log('📂 Lecture du fichier...');
        const content = fs.readFileSync(CSV_FILE, 'utf-8');
        const { products } = parseCSV(content);

        console.log(`📊 Trouvé ${products.length} médicaments dans CSV\n`);

        console.log('🔍 Récupération produits existants...');
        const existing = await getExistingProducts();
        console.log(`💾 ${existing.length} produits en base\n`);

        // Index par barcode
        const existingMap = new Map();
        existing.forEach(p => existingMap.set(p.barcode, p));

        console.log('🚀 Import/Update en cours...\n');

        let created = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < products.length; i++) {
            try {
                const product = mapCNAMProduct(products[i]);

                if (!product.commercial_name || product.commercial_name.length < 3) {
                    skipped++;
                    continue;
                }

                const existingProduct = existingMap.get(product.barcode);

                if (existingProduct) {
                    // UPDATE: Prix et infos CNAM
                    const updateData = {
                        public_price: product.public_price,
                        purchase_price: product.purchase_price,
                        dci_name: product.dci_name,
                        cnam_reimbursable: product.cnam_reimbursable,
                        cnam_rate: product.cnam_rate,
                        requires_prescription: product.requires_prescription,
                    };

                    const response = await fetch(`${API_URL}/${existingProduct.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });

                    if (response.ok) {
                        updated++;
                    } else {
                        errors++;
                    }
                } else {
                    // CREATE: Nouveau produit
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...product,
                            current_stock: 0,
                            low_stock_threshold: 5
                        })
                    });

                    if (response.ok) {
                        created++;
                    } else {
                        errors++;
                    }
                }

                if ((i + 1) % 10 === 0 || i === products.length - 1) {
                    process.stdout.write(`\r✓ ${created} créés, ${updated} mis à jour, ${skipped} ignorés (${Math.round((i + 1) / products.length * 100)}%)`);
                }

            } catch (err) {
                errors++;
            }
        }

        console.log('\n\n✅ MISE À JOUR TERMINÉE!');
        console.log('=======================\n');
        console.log(`📊 Résumé:`);
        console.log(`   Total CSV:        ${products.length}`);
        console.log(`   + Créés:          ${created} nouveaux`);
        console.log(`   ↻ Mis à jour:     ${updated} produits`);
        console.log(`   ⊘ Ignorés:        ${skipped}`);
        console.log(`   ✗ Erreurs:        ${errors}`);
        console.log('');
        console.log('💡 Mise à jour:');
        console.log('   - Prix actualisés');
        console.log('   - Taux CNAM mis à jour');
        console.log('   - DCI complétés');
        console.log('   - Stock CONSERVÉ (non modifié)');
        console.log('');
        console.log('🎉 Vérifiez dans PharmaBest → Products!');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.log('\n💡 Vérifiez:');
        console.log('   1. medicaments-cnam.csv existe');
        console.log('   2. Serveur actif (http://localhost:3000)');
        console.log('   3. Format CSV UTF-8');
    }
}

importUpdate();
