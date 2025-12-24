// Quick import of sample medications
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const medications = [
    { barcode: '3100001', name: 'Paracetamol 500mg', dci: 'Paracetamol', price: 2.500, cost: 1.800, cnam: true, rate: 85, rx: false, class: 'Antalgique', stock: 100 },
    { barcode: '3100002', name: 'Doliprane 1g', dci: 'Paracetamol', price: 4.200, cost: 3.000, cnam: true, rate: 85, rx: false, class: 'Antalgique', stock: 150 },
    { barcode: '3100003', name: 'Amoxicilline 500mg', dci: 'Amoxicilline', price: 8.500, cost: 6.200, cnam: true, rate: 85, rx: true, class: 'Antibiotique', stock: 80 },
    { barcode: '3100004', name: 'Augmentin 1g', dci: 'Amoxicilline + Acide Clavulanique', price: 15.800, cost: 12.000, cnam: true, rate: 85, rx: true, class: 'Antibiotique', stock: 60 },
    { barcode: '3100005', name: 'Aspirine 100mg', dci: 'Acide Acétylsalicylique', price: 3.200, cost: 2.100, cnam: true, rate: 85, rx: false, class: 'Antiagrégant', stock: 120 },
    { barcode: '3100006', name: 'Ventoline Spray', dci: 'Salbutamol', price: 12.500, cost: 9.500, cnam: true, rate: 100, rx: true, class: 'Bronchodilatateur', stock: 45 },
    { barcode: '3100007', name: 'Seretide 250', dci: 'Fluticasone + Salmétérol', price: 85.000, cost: 68.000, cnam: true, rate: 100, rx: true, class: 'Antiasthmatique', stock: 25 },
    { barcode: '3100008', name: 'Doliprane Sirop', dci: 'Paracetamol', price: 5.800, cost: 4.200, cnam: true, rate: 85, rx: false, class: 'Antalgique Pediatrique', stock: 90 },
    { barcode: '3100009', name: 'Advil 400mg', dci: 'Ibuprofène', price: 6.500, cost: 4.800, cnam: true, rate: 85, rx: false, class: 'Anti-inflammatoire', stock: 110 },
    { barcode: '3100010', name: 'Voltarene 50mg', dci: 'Diclofénac', price: 8.900, cost: 6.500, cnam: true, rate: 85, rx: true, class: 'Anti-inflammatoire', stock: 75 },
    { barcode: '3100011', name: 'Efferalgan Vitamine C', dci: 'Paracetamol + Vitamine C', price: 5.200, cost: 3.800, cnam: false, rate: 0, rx: false, class: 'Antalgique', stock: 95 },
    { barcode: '3100012', name: 'Betadine Solution', dci: 'Povidone Iodée', price: 4.500, cost: 3.200, cnam: false, rate: 0, rx: false, class: 'Antiseptique', stock: 130 },
    { barcode: '3100013', name: 'Gaviscon Suspension', dci: 'Alginate de Sodium', price: 7.800, cost: 5.600, cnam: true, rate: 85, rx: false, class: 'Antiacide', stock: 70 },
    { barcode: '3100014', name: 'Spasfon 80mg', dci: 'Phloroglucinol', price: 9.200, cost: 6.800, cnam: true, rate: 85, rx: false, class: 'Antispasmodique', stock: 85 },
    { barcode: '3100015', name: 'Lyrica 75mg', dci: 'Prégabaline', price: 45.000, cost: 35.000, cnam: true, rate: 100, rx: true, class: 'Antiépileptique', stock: 30 },
    { barcode: '3100016', name: 'Lexomil 6mg', dci: 'Bromazépam', price: 8.500, cost: 6.200, cnam: true, rate: 85, rx: true, class: 'Anxiolytique', stock: 50 },
    { barcode: '3100017', name: 'Deroxat 20mg', dci: 'Paroxétine', price: 32.000, cost: 25.000, cnam: true, rate: 100, rx: true, class: 'Antidépresseur', stock: 40 },
    { barcode: '3100018', name: 'Concor 5mg', dci: 'Bisoprolol', price: 18.500, cost: 14.000, cnam: true, rate: 100, rx: true, class: 'Bêtabloquant', stock: 55 },
    { barcode: '3100019', name: 'Crestor 10mg', dci: 'Rosuvastatine', price: 28.000, cost: 22.000, cnam: true, rate: 85, rx: true, class: 'Hypolipémiant', stock: 45 },
    { barcode: '3100020', name: 'Glucophage 850mg', dci: 'Metformine', price: 6.800, cost: 5.000, cnam: true, rate: 100, rx: true, class: 'Antidiabétique', stock: 95 }
];

async function importProducts() {
    console.log('🚀 Importing 20 sample medications...\n');

    let created = 0;
    let updated = 0;

    for (const med of medications) {
        try {
            const product = await prisma.product.upsert({
                where: { barcode: med.barcode },
                update: {
                    commercial_name: med.name,
                    dci_name: med.dci,
                    public_price: med.price,
                    purchase_price: med.cost,
                    vat_rate: 7,
                    current_stock: med.stock,
                    low_stock_threshold: 10,
                    cnam_reimbursable: med.cnam,
                    cnam_rate: med.rate,
                    requires_prescription: med.rx,
                    therapeutic_class: med.class
                },
                create: {
                    barcode: med.barcode,
                    commercial_name: med.name,
                    dci_name: med.dci,
                    public_price: med.price,
                    purchase_price: med.cost,
                    vat_rate: 7,
                    current_stock: med.stock,
                    low_stock_threshold: 10,
                    cnam_reimbursable: med.cnam,
                    cnam_rate: med.rate,
                    requires_prescription: med.rx,
                    therapeutic_class: med.class
                }
            });

            if (product.createdAt === product.updatedAt) {
                created++;
            } else {
                updated++;
            }

            console.log(`✅ ${med.name}`);
        } catch (error) {
            console.log(`❌ ${med.name}: ${error.message}`);
        }
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`   Created: ${created} products`);
    console.log(`   Updated: ${updated} products`);
    console.log(`   Total: ${medications.length} medications`);

    await prisma.$disconnect();
}

importProducts();
