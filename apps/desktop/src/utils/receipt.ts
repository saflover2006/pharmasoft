import { formatPrice } from '../utils/calculations';
import { VAT_RATE } from '../constants';

export interface ReceiptData {
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
}

/**
 * Receipt template configuration
 */
export interface ReceiptConfig {
  pharmacyName: string;
  address: string;
  phone: string;
  taxId?: string;
  logo?: string;
  footer?: string;
}

const DEFAULT_CONFIG: ReceiptConfig = {
  pharmacyName: 'PharmaBest',
  address: 'Tunis, Tunisia',
  phone: '+216 XX XXX XXX',
  taxId: 'TN123456789',
  footer: 'Merci pour votre visite!',
};

/**
 * Generate HTML receipt
 */
export function generateReceiptHTML(
  data: ReceiptData,
  config: ReceiptConfig = DEFAULT_CONFIG
): string {
  const { saleId, timestamp, items, subtotal, vat, total, paymentMethod, customer } = data;

  const dateStr = new Date(timestamp).toLocaleString('fr-TN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu #${saleId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 20px;
      max-width: 300px;
      margin: 0 auto;
    }
    
    .receipt {
      border: 1px solid #000;
      padding: 15px;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    
    .pharmacy-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .pharmacy-info {
      font-size: 10px;
      color: #333;
    }
    
    .sale-info {
      margin-bottom: 15px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }
    
    .sale-info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    
    .label {
      font-weight: bold;
    }
    
    .items {
      margin-bottom: 15px;
    }
    
    .item {
      margin-bottom: 10px;
      border-bottom: 1px dotted #ccc;
      padding-bottom: 5px;
    }
    
    .item-name {
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    
    .totals {
      border-top: 2px solid #000;
      padding-top: 10px;
      margin-bottom: 15px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .total-row.grand-total {
      font-size: 14px;
      font-weight: bold;
      border-top: 1px solid #000;
      padding-top: 5px;
      margin-top: 5px;
    }
    
    .footer {
      text-align: center;
      border-top: 2px dashed #000;
      padding-top: 10px;
      margin-top: 15px;
      font-size: 11px;
    }
    
    .customer-info {
      background: #f5f5f5;
      padding: 8px;
      margin-bottom: 10px;
      border-radius: 3px;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .receipt {
        border: none;
        padding: 0;
      }
      
      @page {
        size: 80mm auto;
        margin: 5mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header">
      <div class="pharmacy-name">${config.pharmacyName}</div>
      <div class="pharmacy-info">${config.address}</div>
      <div class="pharmacy-info">Tél: ${config.phone}</div>
      ${config.taxId ? `<div class="pharmacy-info">MF: ${config.taxId}</div>` : ''}
    </div>
    
    <!-- Sale Info -->
    <div class="sale-info">
      <div class="sale-info-row">
        <span class="label">N° Ticket:</span>
        <span>#${saleId.toString().padStart(6, '0')}</span>
      </div>
      <div class="sale-info-row">
        <span class="label">Date:</span>
        <span>${dateStr}</span>
      </div>
      <div class="sale-info-row">
        <span class="label">Paiement:</span>
        <span style="text-transform: uppercase;">${paymentMethod}</span>
      </div>
    </div>
    
    <!-- Customer Info -->
    ${customer ? `
    <div class="customer-info">
      <div class="sale-info-row">
        <span class="label">Client:</span>
        <span>${customer.name}</span>
      </div>
      ${customer.phone ? `
      <div class="sale-info-row">
        <span class="label">Tél:</span>
        <span>${customer.phone}</span>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    <!-- Items -->
    <div class="items">
      ${items.map(item => `
        <div class="item">
          <div class="item-name">${item.product.commercial_name}</div>
          <div class="item-details">
            <span>${formatPrice(item.product.public_price)} × ${item.quantity}</span>
            <span style="font-weight: bold;">${formatPrice(item.product.public_price * item.quantity)}</span>
          </div>
        </div>
      `).join('')}
    </div>
    
    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span>Sous-total:</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      <div class="total-row">
        <span>TVA (${(VAT_RATE * 100).toFixed(0)}%):</span>
        <span>${formatPrice(vat)}</span>
      </div>
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>${formatPrice(total)}</span>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div>${config.footer}</div>
      <div style="margin-top: 10px; font-size: 10px;">
        Powered by PharmaBest POS
      </div>
    </div>
  </div>
  
  <script>
    // Auto-print on load (optional)
    // window.onload = () => window.print();
  </script>
</body>
</html>
  `;
}

/**
 * Print receipt in browser
 */
export function printReceipt(data: ReceiptData, config?: ReceiptConfig): void {
  const html = generateReceiptHTML(data, config);

  // Create a new window/iframe for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        // Optional: close after printing
        // printWindow.onafterprint = () => printWindow.close();
      }, 250);
    };
  } else {
    alert('Please allow popups to print receipts');
  }
}

/**
 * Download receipt as HTML file
 */
export function downloadReceipt(data: ReceiptData, config?: ReceiptConfig): void {
  const html = generateReceiptHTML(data, config);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${data.saleId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
