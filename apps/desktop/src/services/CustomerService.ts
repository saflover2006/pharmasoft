// Customer Management Service
// Provides API interactions for customer CRUD operations

import { API_BASE_URL } from '../config';

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
}

export interface CustomerSearchParams {
    page?: number;
    limit?: number;
    search?: string;
    customerType?: 'all' | 'individual' | 'company';
}

class CustomerService {
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

        const url = `${API_BASE_URL}/customers?${queryParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch customers');
        }

        return response.json();
    }

    /**
     * Search customers (lightweight for autocomplete)
     */
    async search(query: string, limit: number = 10): Promise<{ success: boolean; data: Customer[] }> {
        const queryParams = new URLSearchParams({
            q: query,
            limit: limit.toString()
        });

        const url = `${API_BASE_URL}/customers/search?${queryParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to search customers');
        }

        return response.json();
    }

    /**
     * Create a new customer
     */
    async create(data: CustomerFormData): Promise<CustomerResponse> {
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to create customer');
        }

        return result;
    }

    /**
     * Get customer by ID
     */
    async getById(id: number): Promise<CustomerResponse> {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch customer');
        }

        return response.json();
    }

    /**
     * Update customer
     */
    async update(id: number, data: Partial<CustomerFormData>): Promise<CustomerResponse> {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to update customer');
        }

        return result;
    }

    /**
     * Delete customer
     */
    async delete(id: number): Promise<{ success: boolean }> {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to delete customer');
        }

        return result;
    }

    /**
     * Find or create customer (for POS checkout)
     */
    async findOrCreate(data: { name: string; phone?: string; email?: string }): Promise<CustomerResponse> {
        const response = await fetch(`${API_BASE_URL}/customers/find-or-create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to find or create customer');
        }

        return result;
    }
}

// Export singleton instance
export const customerService = new CustomerService();
export default customerService;
