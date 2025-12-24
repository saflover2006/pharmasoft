// Professional PDF Invoice Generator for Tunisia Pharmacy
// Enhanced design with better styling and layout

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceItem {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    cnamReimbursable: boolean;
    cnamRate: number;
    cnamAmount: number;
    patientAmount: number;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    invoiceType: string;
    invoiceDate: string;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    customerAddress: string | null;
    customerCnamNumber: string | null;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    cnamAmount: number;
    patientAmount: number;
    paymentMethod: string;
    isPaid: boolean;
    notes: string | null;
    items: InvoiceItem[];
}

export function generateInvoicePDF(invoice: Invoice, pharmacyInfo?: any) {
    const doc = new jsPDF();

    // Pharmacy details
    const pharmacy = pharmacyInfo || {
        name: 'PharmaBest',
        address: 'Avenue Habib Bourguiba, Tunis 1000, Tunisia',
        phone: '+216 71 123 456',
        email: 'contact@pharmabest.tn',
        taxId: '1234567/A/M/000'
    };

    // Colors
    const primaryColor: [number, number, number] = [41, 128, 185]; // Blue
    const successColor: [number, number, number] = [39, 174, 96]; // Green
    const warningColor: [number, number, number] = [230, 126, 34]; // Orange
    const darkGray: [number, number, number] = [52, 73, 94];
    const lightGray: [number, number, number] = [236, 240, 241];

    let yPos = 15;

    // Header with colored background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');

    // Pharmacy name in white
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(pharmacy.name, 105, 20, { align: 'center' });

    // Pharmacy details in white
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(pharmacy.address, 105, 28, { align: 'center' });
    doc.text(`Tél: ${pharmacy.phone} | Email: ${pharmacy.email}`, 105, 33, { align: 'center' });
    doc.text(`MF: ${pharmacy.taxId}`, 105, 38, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos = 55;

    // Invoice title box
    const invoiceTitle = invoice.invoiceType === 'cnam' ? 'FACTURE CNAM' :
        invoice.invoiceType === 'proforma' ? 'FACTURE PROFORMA' :
            invoice.invoiceType === 'receipt' ? 'REÇU' : 'FACTURE DÉTAILLÉE';

    doc.setFillColor(...lightGray);
    doc.rect(15, yPos - 7, 180, 12, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(invoiceTitle, 105, yPos, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    yPos += 15;

    // Two-column layout for invoice and customer info
    const leftCol = 20;
    const rightCol = 120;

    // Left column - Invoice details in a box
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.rect(leftCol - 5, yPos - 5, 85, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Informations Facture', leftCol, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('N° Facture:', leftCol, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.invoiceNumber, leftCol + 25, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Date:', leftCol, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(invoice.invoiceDate).toLocaleDateString('fr-TN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }), leftCol + 25, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Paiement:', leftCol, yPos);
    doc.setFont('helvetica', 'bold');
    const paymentStatus = invoice.isPaid ?
        `✓ Payé (${invoice.paymentMethod})` :
        '✗ Non payé';
    doc.setTextColor(...(invoice.isPaid ? successColor : warningColor));
    doc.text(paymentStatus, leftCol + 25, yPos);
    doc.setTextColor(0, 0, 0);

    // Right column - Customer details in a box
    yPos = 80;
    doc.setDrawColor(...primaryColor);
    doc.rect(rightCol - 5, yPos - 5, 75, 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.text('Client', rightCol, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(invoice.customerName, rightCol, yPos);

    if (invoice.customerPhone) {
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(`☎ ${invoice.customerPhone}`, rightCol, yPos);
    }

    if (invoice.customerCnamNumber) {
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text(`CNAM: ${invoice.customerCnamNumber}`, rightCol, yPos);
        doc.setTextColor(0, 0, 0);
    }

    // Items table with modern styling
    yPos = 120;

    const tableData = invoice.items.map(item => {
        const row = [
            item.productName,
            item.quantity.toString(),
            item.unitPrice.toFixed(3),
            item.totalPrice.toFixed(3)
        ];

        if (invoice.invoiceType === 'cnam' && item.cnamReimbursable) {
            row.push(`${item.cnamRate}%`);
            row.push(item.cnamAmount.toFixed(3));
            row.push(item.patientAmount.toFixed(3));
        }

        return row;
    });

    const columns = invoice.invoiceType === 'cnam'
        ? ['Produit', 'Qté', 'P.U.', 'Total', 'CNAM %', 'Part CNAM', 'Part Patient']
        : ['Produit', 'Qté', 'Prix Unitaire', 'Total TTC'];

    autoTable(doc, {
        startY: yPos,
        head: [columns],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: [249, 249, 249]
        },
        columnStyles: invoice.invoiceType === 'cnam' ? {
            0: { cellWidth: 65, halign: 'left' },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
            4: { cellWidth: 18, halign: 'center', textColor: primaryColor },
            5: { cellWidth: 25, halign: 'right', textColor: successColor, fontStyle: 'bold' },
            6: { cellWidth: 25, halign: 'right', textColor: warningColor, fontStyle: 'bold' }
        } : {
            0: { cellWidth: 95, halign: 'left' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
    });

    // Totals section with boxes
    yPos = (doc as any).lastAutoTable.finalY + 15;

    const totalsX = 140;
    const labelX = totalsX - 10;
    const boxWidth = 65;

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sous-total HT:', labelX, yPos, { align: 'right' });
    doc.text(`${invoice.subtotal.toFixed(3)} TND`, totalsX + 45, yPos, { align: 'right' });

    if (invoice.discountAmount > 0) {
        yPos += 6;
        doc.setTextColor(...warningColor);
        doc.text('Remise:', labelX, yPos, { align: 'right' });
        doc.text(`-${invoice.discountAmount.toFixed(3)} TND`, totalsX + 45, yPos, { align: 'right' });
        doc.setTextColor(0, 0, 0);
    }

    if (invoice.taxAmount > 0) {
        yPos += 6;
        doc.text('TVA (19%):', labelX, yPos, { align: 'right' });
        doc.text(`${invoice.taxAmount.toFixed(3)} TND`, totalsX + 45, yPos, { align: 'right' });
    }

    // CNAM section with colored box
    if (invoice.invoiceType === 'cnam' && invoice.cnamAmount > 0) {
        yPos += 10;

        // Green box for CNAM
        doc.setFillColor(...successColor);
        doc.setDrawColor(...successColor);
        doc.setLineWidth(0.3);
        doc.rect(labelX - 35, yPos - 4, boxWidth, 8, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('Part CNAM', labelX, yPos);
        doc.text(`${invoice.cnamAmount.toFixed(3)} TND`, totalsX + 45, yPos, { align: 'right' });

        yPos += 8;

        // Orange box for Patient
        doc.setFillColor(...warningColor);
        doc.setDrawColor(...warningColor);
        doc.rect(labelX - 35, yPos - 4, boxWidth, 8, 'FD');

        doc.setTextColor(255, 255, 255);
        doc.text('Part Patient', labelX, yPos);
        doc.text(`${invoice.patientAmount.toFixed(3)} TND`, totalsX + 45, yPos, { align: 'right' });

        yPos += 2;
    }

    // Total box with blue background
    yPos += 10;
    doc.setFillColor(...primaryColor);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.rect(labelX - 35, yPos - 5, boxWidth, 11, 'FD');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL TTC', labelX, yPos);
    doc.text(`${invoice.totalAmount.toFixed(3)} TND`, totalsX + 45, yPos, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // Notes section
    if (invoice.notes) {
        yPos += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', 20, yPos);

        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const splitNotes = doc.splitTextToSize(invoice.notes, 170);
        doc.text(splitNotes, 20, yPos + 5);
        doc.setTextColor(0, 0, 0);
    }

    // Footer with colored background
    const footerY = 275;
    doc.setFillColor(...lightGray);
    doc.rect(0, footerY, 210, 22, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Merci de votre confiance!', 105, footerY + 8, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(`Document généré le ${new Date().toLocaleString('fr-TN')}`, 105, footerY + 14, { align: 'center' });

    return doc;
}

export function printInvoice(invoice: Invoice, pharmacyInfo?: any) {
    const doc = generateInvoicePDF(invoice, pharmacyInfo);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
}

export function downloadInvoicePDF(invoice: Invoice, pharmacyInfo?: any) {
    const doc = generateInvoicePDF(invoice, pharmacyInfo);
    doc.save(`${invoice.invoiceNumber}.pdf`);
}
