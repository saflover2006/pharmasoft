// FAST Bulk Import - Imports medications in batches
// 100x faster than one-by-one import
// Usage: node import-bulk.js <csv-file>

const fs = require('fs');
const fetch = require('node-fetch');

const CSV_FILE = process.argv[2] || 'medicaments-cnam.csv';
const API_URL = 'http://localhost:3000/api';
const BATCH_SIZE = 50; // Import 50 at a time

// ============================
// CSV PARSER
// ============================

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

// ============================
// PRODUCT MAPPER
// ============================

function mapCNAMProduct(row) {
    // SPOT Tunisia format columns
    const code = row['CODE_PCT'] || row['Code'] || row['CODE'] || '';
    const nom = row['NOM_COMMERCIAL'] || row['Dénomination'] || row['DENOMINATION'] || '';
    const dci = row['DCI'] || row['Principe Actif'] || '';
    const prix = row['PRIX_PUBLIC'] || row['Prix Public TTC'] || row['PRIX PUBLIC TTC'] || '0';
    const categorie = row['CATEGORIE'] || row['Taux'] || '';
    const ap = row['AP'] || '';

    // Clean price
    const cleanPrice = (prix || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.');

    // Determine CNAM rate from category
    let cnam_rate = 0;
    if (categorie === 'E') cnam_rate = 85;  // Essentiel
    else if (categorie === 'V') cnam_rate = 35;  // Vital  
    else if (categorie === 'C') cnam_rate = 100; // Chronic
    else cnam_rate = 0;

    // Check if prescription required (AP = O for Ordonnance)
    const requires_prescription = (ap === 'O' || nom.includes('VEI'));

    const product = {
        barcode: code || `PCT${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        commercial_name: nom.substring(0, 200),
        dci_name: dci.substring(0, 200),
        public_price: parseFloat(cleanPrice) || 0,
        purchase_price: (parseFloat(cleanPrice) || 0) * 0.75,
        vat_rate: 7.0,
        current_stock: 0,
        low_stock_threshold: 5,
        cnam_reimbursable: cnam_rate > 0,
        cnam_rate: cnam_rate,
        requires_prescription: requires_prescription,
        therapeutic_class: ''
    };

    return product;
}

// ============================
// BULK IMPORT
// ============================

async function bulkImport() {
    console.log('\n⚡ FAST BULK IMPORT');
    console.log('===================\n');

    // Read CSV
    console.log('📂 Reading CSV file...');
    const content = fs.readFileSync(CSV_FILE, 'utf-8');
    const { products } = parseCSV(content);

    console.log(`📊 Found ${products.length} medications\n`);

    // Map products
    console.log('🔄 Mapping products...');
    const mappedProducts = products
        .map(mapCNAMProduct)
        .filter(p => p.commercial_name && p.commercial_name.length >= 3);

    console.log(`✅ ${mappedProducts.length} valid products\n`);

    // Import in batches
    console.log(`🚀 Importing in batches of ${BATCH_SIZE}...\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    const startTime = Date.now();

    for (let i = 0; i < mappedProducts.length; i += BATCH_SIZE) {
        const batch = mappedProducts.slice(i, i + BATCH_SIZE);

        try {
            // Import batch
            const promises = batch.map(async (product) => {
                try {
                    const response = await fetch(`${API_URL}/products`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(product)
                    });

                    if (response.ok) {
                        return 'imported';
                    } else {
                        const error = await response.json();
                        if (error.error?.message?.includes('already exists')) {
                            return 'skipped';
                        }
                        return 'error';
                    }
                } catch (err) {
                    return 'error';
                }
            });

            const results = await Promise.all(promises);

            imported += results.filter(r => r === 'imported').length;
            skipped += results.filter(r => r === 'skipped').length;
            errors += results.filter(r => r === 'error').length;

            // Progress
            const progress = Math.min(i + BATCH_SIZE, mappedProducts.length);
            const percent = Math.round((progress / mappedProducts.length) * 100);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            process.stdout.write(`\r✓ Progress: ${progress}/${mappedProducts.length} (${percent}%) | Time: ${elapsed}s | Imported: ${imported} | Skipped: ${skipped}`);

        } catch (err) {
            console.error(`\n❌ Batch error: ${err.message}`);
            errors += batch.length;
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n\n✅ IMPORT COMPLETE!');
    console.log('==================\n');
    console.log(`📊 Summary:`);
    console.log(`   Total:     ${mappedProducts.length} medications`);
    console.log(`   ✓ Imported: ${imported} new`);
    console.log(`   ⊘ Skipped:  ${skipped} (duplicates)`);
    console.log(`   ✗ Errors:   ${errors}`);
    console.log(`   ⏱️  Time:     ${totalTime}s`);
    console.log(`   ⚡ Speed:    ${(mappedProducts.length / totalTime).toFixed(0)} medications/second\n`);
    console.log('🎉 Done! Check PharmaBest Products!\n');
}

// Run
bulkImport().catch(console.error);
