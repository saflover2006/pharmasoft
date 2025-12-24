import { formatPrice } from './calculations';
import { VAT_RATE } from '../constants';

export interface ThermalReceiptData {
    saleId: number;
    timestamp: Date;
    items: {
        product: {
            commercial_name: string;
            public_price: number;
        };
        quantity: number;
    }[];
    subtotal: number;
    vat: number;
    total: number;
    paymentMethod: string;
    customer?: {
        name: string;
        phone?: string;
    };
    cashier?: string;
    cashGiven?: number;
    change?: number;
}

/**
 * Generate thermal printer HTML (80mm width)
 * Optimized for thermal printers with minimal styling
 */
export function generateThermalReceipt(data: ThermalReceiptData): string {
    const { saleId, timestamp, items, subtotal, vat, total, paymentMethod, customer, cashier, cashGiven, change } = data;

    const dateStr = new Date(timestamp).toLocaleString('fr-TN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: 80mm auto;
            margin: 0;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            background: #fff;
            width: 80mm;
            padding: 5mm;
        }
        
        .center {
            text-align: center;
        }
        
        .bold {
            font-weight: bold;
        }
        
        .large {
            font-size: 14px;
        }
        
        .hr {
            border-bottom: 1px dashed #000;
            margin: 5px 0;
        }
        
        .hr-solid {
            border-bottom: 1px solid #000;
            margin: 5px 0;
        }
        
        .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
        }
        
        .item {
            margin: 3px 0;
        }
        
        .right {
            text-align: right;
        }
        
        @media print {
            body {
                width: 80mm;
            }
        }
    </style>
</head>
<body>
    <div class="center bold large">PHARMASOFT</div>
    <div class="center">Pharmacie</div>
    <div class="center">Tunis, Tunisia</div>
    <div class="center">Tel: +216 XX XXX XXX</div>
    <div class="center">MF: TN123456789</div>
    
    <div class="hr"></div>
    
    <div class="row">
        <span>Ticket:</span>
        <span class="bold">#${saleId.toString().padStart(6, '0')}</span>
    </div>
    <div class="row">
        <span>Date:</span>
        <span>${dateStr}</span>
    </div>
    ${cashier ? `<div class="row">
        <span>Caissier:</span>
        <span>${cashier}</span>
    </div>` : ''}
    
    ${customer ? `
    <div class="hr"></div>
    <div>Client: ${customer.name}</div>
    ${customer.phone ? `<div>Tel: ${customer.phone}</div>` : ''}
    ` : ''}
    
    <div class="hr-solid"></div>
    
    ${items.map(item => `
    <div class="item">
        <div class="bold">${item.product.commercial_name}</div>
        <div class="row">
            <span>${formatPrice(item.product.public_price)} x ${item.quantity}</span>
            <span class="bold">${formatPrice(item.product.public_price * item.quantity)}</span>
        </div>
    </div>
    `).join('')}
    
    <div class="hr-solid"></div>
    
    <div class="row">
        <span>Sous-total:</span>
        <span>${formatPrice(subtotal)}</span>
    </div>
    <div class="row">
        <span>TVA (${(VAT_RATE * 100).toFixed(0)}%):</span>
        <span>${formatPrice(vat)}</span>
    </div>
    
    <div class="hr"></div>
    
    <div class="row bold large">
        <span>TOTAL:</span>
        <span>${formatPrice(total)}</span>
    </div>
    
    <div class="hr"></div>
    
    <div class="row">
        <span>Paiement:</span>
        <span class="bold">${paymentMethod.toUpperCase()}</span>
    </div>
    
    ${cashGiven ? `
    <div class="row">
        <span>Especes:</span>
        <span>${formatPrice(cashGiven)}</span>
    </div>
    <div class="row">
        <span>Monnaie:</span>
        <span>${formatPrice(change || 0)}</span>
    </div>
    ` : ''}
    
    <div class="hr"></div>
    
    <div class="center">Merci pour votre visite!</div>
    <div class="center">A bientot</div>
    
    <div class="hr"></div>
    
    <div class="center" style="font-size: 9px; margin-top: 10px;">
        Powered by PharmaBest POS
    </div>
    
    <script>
        // Auto-print on load
        window.onload = () => {
            setTimeout(() => {
                window.print();
                // Auto-close after printing (optional)
                // setTimeout(() => window.close(), 500);
            }, 250);
        };
    </script>
</body>
</html>
    `.trim();
}

/**
 * Print thermal receipt
 */
export function printThermalReceipt(data: ThermalReceiptData): void {
    const html = generateThermalReceipt(data);

    const printWindow = window.open('', '_blank', 'width=300,height=600');

    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    } else {
        alert('Please allow popups to print receipts');
    }
}
