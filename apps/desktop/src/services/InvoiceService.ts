// Invoice Management Service
// Provides API interactions for invoice CRUD operations

import { apiFetch } from './database.service';

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
    error?: {
        message?: string;
    };
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
    error?: {
        message?: string;
    };
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
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const result = await apiFetch<T>(endpoint, options);
        return result;
    }

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

        const result = await this.request<InvoiceListResponse>(`/invoices?${queryParams.toString()}`);

        if (!result.success) {
            throw new Error('Failed to fetch invoices');
        }

        return result;
    }

    /**
     * Get invoice by ID
     */
    async getById(id: number): Promise<InvoiceResponse> {
        const result = await this.request<InvoiceResponse>(`/invoices/${id}`);

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to fetch invoice');
        }

        return result;
    }

    /**
     * Create a new invoice
     */
    async create(data: InvoiceFormData): Promise<InvoiceResponse> {
        const result = await this.request<InvoiceResponse>('/invoices', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (!result.success) {
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
        const result = await this.request<InvoiceResponse>(`/invoices/${id}/payment`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to update payment status');
        }

        return result;
    }

    /**
     * Mark invoice as printed
     */
    async markAsPrinted(id: number): Promise<InvoiceResponse> {
        const result = await this.request<InvoiceResponse>(`/invoices/${id}/print`, {
            method: 'PATCH'
        });

        if (!result.success) {
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

        const result = await this.request<{ success: boolean; data: InvoiceStats }>(`/invoices/stats/summary?${queryParams.toString()}`);

        if (!result.success) {
            throw new Error('Failed to fetch invoice statistics');
        }

        return result;
    }

    /**
     * Delete invoice (only if not printed and not linked to sale)
     */
    async delete(id: number): Promise<{ success: boolean }> {
        const result = await this.request<{ success: boolean; error?: { message?: string } }>(`/invoices/${id}`, {
            method: 'DELETE'
        });

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to delete invoice');
        }

        return { success: true };
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
