// Customer Management Service
// Provides API interactions for customer CRUD operations

import { apiFetch } from './database.service';

export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    customerType: 'individual' | 'company';
    taxId: string | null;
    cnamNumber: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: {
        invoices: number;
    };
}

export interface CustomerFormData {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    customerType?: 'individual' | 'company';
    taxId?: string;
    cnamNumber?: string;
}

export interface CustomerListResponse {
    success: boolean;
    data: Customer[];
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

export interface CustomerResponse {
    success: boolean;
    data: Customer;
    error?: {
        message?: string;
    };
}

export interface CustomerSearchParams {
    page?: number;
    limit?: number;
    search?: string;
    customerType?: 'all' | 'individual' | 'company';
}

class CustomerService {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const result = await apiFetch<T>(endpoint, options);
        return result;
    }

    /**
     * Get all customers with pagination and search
     */
    async getAll(params: CustomerSearchParams = {}): Promise<CustomerListResponse> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.customerType && params.customerType !== 'all') {
            queryParams.append('customerType', params.customerType);
        }

        const result = await this.request<CustomerListResponse>(`/customers?${queryParams.toString()}`);

        if (!result.success) {
            throw new Error('Failed to fetch customers');
        }

        return result;
    }

    /**
     * Search customers (lightweight for autocomplete)
     */
    async search(query: string, limit: number = 10): Promise<{ success: boolean; data: Customer[] }> {
        const queryParams = new URLSearchParams({
            q: query,
            limit: limit.toString()
        });

        const result = await this.request<{ success: boolean; data: Customer[] }>(`/customers/search?${queryParams.toString()}`);

        if (!result.success) {
            throw new Error('Failed to search customers');
        }

        return result;
    }

    /**
     * Create a new customer
     */
    async create(data: CustomerFormData): Promise<CustomerResponse> {
        const result = await this.request<CustomerResponse>('/customers', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to create customer');
        }

        return result;
    }

    /**
     * Get customer by ID
     */
    async getById(id: number): Promise<CustomerResponse> {
        const result = await this.request<CustomerResponse>(`/customers/${id}`);

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to fetch customer');
        }

        return result;
    }

    /**
     * Update customer
     */
    async update(id: number, data: Partial<CustomerFormData>): Promise<CustomerResponse> {
        const result = await this.request<CustomerResponse>(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to update customer');
        }

        return result;
    }

    /**
     * Delete customer
     */
    async delete(id: number): Promise<{ success: boolean }> {
        const result = await this.request<{ success: boolean; error?: { message?: string } }>(`/customers/${id}`, {
            method: 'DELETE'
        });

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to delete customer');
        }

        return { success: true };
    }

    /**
     * Find or create customer (for POS checkout)
     */
    async findOrCreate(data: { name: string; phone?: string; email?: string }): Promise<CustomerResponse> {
        const result = await this.request<CustomerResponse>('/customers/find-or-create', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to find or create customer');
        }

        return result;
    }
}

// Export singleton instance
export const customerService = new CustomerService();
export default customerService;
