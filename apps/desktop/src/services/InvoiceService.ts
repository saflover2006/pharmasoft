// Invoice Management Service
// Provides API interactions for invoice CRUD operations

import { API_BASE_URL } from '../config';

export interface InvoiceItem {
    id?: number;
    productName: string;
    productBarcode?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    cnamReimbursable: boolean;
    cnamRate: number;
    cnamAmount: number;
    patientAmount: number;
    requiresPrescription?: boolean;
    therapeuticClass?: string | null;
    dciName?: string | null;
}

export interface Invoice {
    id: number;
    invoiceNumber: string;
    invoiceType: 'detailed' | 'receipt' | 'cnam' | 'proforma';
    invoiceDate: string;

    // Customer snapshot
    customerId: number;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    customerAddress: string | null;
    customerType: string;
    customerTaxId: string | null;
    customerCnamNumber: string | null;

    // Financial
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    cnamAmount: number;
    patientAmount: number;

    // Payment
    paymentMethod: string;
    isPaid: boolean;
    paidAt: string | null;

    // Metadata
    notes: string | null;
    saleId: number | null;
    createdById: number;
    isPrinted: boolean;
    printedAt: string | null;
    createdAt: string;
    updatedAt: string;

    // Relations
    items?: InvoiceItem[];
    customer?: any;
    createdBy?: any;
    sale?: any;
}

export interface InvoiceFormData {
    customerId: number;
    saleId?: number | null;
    invoiceType: 'detailed' | 'receipt' | 'cnam' | 'proforma';
    items: Omit<InvoiceItem, 'id' | 'cnamAmount' | 'patientAmount' | 'totalPrice'>[];
    notes?: string;
    userId: number;
    paymentMethod?: string;
    isPaid?: boolean;
}

export interface InvoiceListResponse {
    success: boolean;
    data: Invoice[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface InvoiceResponse {
    success: boolean;
    data: Invoice;
}

export interface InvoiceSearchParams {
    page?: number;
    limit?: number;
    customerId?: number;
    invoiceType?: 'all' | 'detailed' | 'receipt' | 'cnam' | 'proforma';
    isPaid?: boolean;
    search?: string;
}

export interface InvoiceStats {
    totalInvoices: number;
    totalAmount: number;
    paidInvoices: number;
    unpaidInvoices: number;
    cnamInvoices: number;
}

class InvoiceService {
    /**
     * Get all invoices with pagination and filters
     */
    async getAll(params: InvoiceSearchParams = {}): Promise<InvoiceListResponse> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.customerId) queryParams.append('customerId', params.customerId.toString());
        if (params.invoiceType && params.invoiceType !== 'all') {
            queryParams.append('invoiceType', params.invoiceType);
        }
        if (params.isPaid !== undefined) {
            queryParams.append('isPaid', params.isPaid.toString());
        }

        const url = `${API_BASE_URL}/invoices?${queryParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch invoices');
        }

        return response.json();
    }

    /**
     * Get invoice by ID
     */
    async getById(id: number): Promise<InvoiceResponse> {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch invoice');
        }

        return response.json();
    }

    /**
     * Create a new invoice
     */
    async create(data: InvoiceFormData): Promise<InvoiceResponse> {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to create invoice');
        }

        return result;
    }

    /**
     * Update invoice payment status
     */
    async updatePaymentStatus(
        id: number,
        data: { isPaid: boolean; paidAt?: string; paymentMethod?: string }
    ): Promise<InvoiceResponse> {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/payment`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to update payment status');
        }

        return result;
    }

    /**
     * Mark invoice as printed
     */
    async markAsPrinted(id: number): Promise<InvoiceResponse> {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/print`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to mark as printed');
        }

        return result;
    }

    /**
     * Get invoice statistics
     */
    async getStats(startDate?: string, endDate?: string): Promise<{ success: boolean; data: InvoiceStats }> {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);

        const url = `${API_BASE_URL}/invoices/stats/summary?${queryParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch invoice statistics');
        }

        return response.json();
    }

    /**
     * Delete invoice (only if not printed and not linked to sale)
     */
    async delete(id: number): Promise<{ success: boolean }> {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to delete invoice');
        }

        return result;
    }

    /**
     * Helper: Calculate CNAM amounts for an item
     */
    calculateCnamAmounts(
        subtotal: number,
        cnamReimbursable: boolean,
        cnamRate: number
    ): { cnamAmount: number; patientAmount: number } {
        if (!cnamReimbursable || cnamRate <= 0) {
            return { cnamAmount: 0, patientAmount: subtotal };
        }

        const cnamAmount = subtotal * (cnamRate / 100);
        const patientAmount = subtotal - cnamAmount;

        return { cnamAmount, patientAmount };
    }

    /**
     * Helper: Calculate invoice totals
     */
    calculateTotals(items: Array<{
        quantity: number;
        unitPrice: number;
        cnamReimbursable?: boolean;
        cnamRate?: number;
    }>): {
        subtotal: number;
        cnamAmount: number;
        patientAmount: number;
    } {
        let subtotal = 0;
        let cnamAmount = 0;
        let patientAmount = 0;

        items.forEach(item => {
            const itemTotal = item.quantity * item.unitPrice;
            subtotal += itemTotal;

            const cnam = this.calculateCnamAmounts(
                itemTotal,
                item.cnamReimbursable || false,
                item.cnamRate || 0
            );

            cnamAmount += cnam.cnamAmount;
            patientAmount += cnam.patientAmount;
        });

        return { subtotal, cnamAmount, patientAmount };
    }
}

// Export singleton instance
export const invoiceService = new InvoiceService();
export default invoiceService;
