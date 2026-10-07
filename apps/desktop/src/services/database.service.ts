import type { Product, Customer } from '@repo/database';
import type { AuthenticatedUser, PaymentMethod, PaymentResult, Result, CartItem, ShiftRecord, Discount } from '../types';
import { AppError as AppErrorClass, ErrorType as ErrorTypes } from '../types';
import { API_BASE_URL } from '../config';

function normalizeEndpoint(endpoint: string): string {
    if (!endpoint.startsWith('/')) {
        return `/${endpoint}`;
    }

    return endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
}

function buildHeaders(options: RequestInit = {}): Record<string, string> {
    const token = localStorage.getItem('token');

    return {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${normalizeEndpoint(endpoint)}`, {
        ...options,
        headers: buildHeaders(options),
    });

    return response.json() as Promise<T>;
}

/**
 * Generic API request wrapper
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<Result<T>> {
    try {
        const json = await apiFetch<{ success: boolean; data: T; error?: { message?: string } }>(endpoint, options);

        if (!json.success) {
            throw new Error(json.error?.message || 'Unknown API error');
        }

        return { success: true, data: json.data };
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return {
            success: false,
            error: new AppErrorClass(
                ErrorTypes.DATABASE_ERROR,
                'Connection Failed: ' + (error as Error).message,
                error
            )
        };
    }
}

// ... (skipping ProductService, CustomerService, SaleService as they use apiRequest automatically)

export class AuthService {
    static async login(username: string, password: string): Promise<Result<{ token: string; user: AuthenticatedUser }>> {
        const result = await apiRequest<{ token: string; user: AuthenticatedUser }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (result.success && result.data.token) {
            // Save token
            localStorage.setItem('token', result.data.token);
            // Also update the local stored user info if needed
            localStorage.setItem('user', JSON.stringify(result.data.user || result.data));
        }

        return result;
    }

    static async verify(): Promise<Result<{ user: AuthenticatedUser }>> {
        const result = await apiRequest<{ user: AuthenticatedUser }>('/auth/verify');

        if (result.success && result.data) {
            localStorage.setItem('user', JSON.stringify(result.data.user || result.data));
        }

        return result;
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
}

export class ProductService {
    static async search(query: string, limit: number = 10): Promise<Result<Product[]>> {
        return apiRequest<Product[]>(`/products/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    }

    static async getAll(page: number = 1, limit: number = 20): Promise<Result<{ products: Product[]; total: number }>> {
        return apiRequest<{ products: Product[]; total: number }>(`/products?page=${page}&limit=${limit}`);
    }

    static async getLowStockProducts(): Promise<Result<Product[]>> {
        return apiRequest<Product[]>('/products/low-stock');
    }

    static async create(data: any): Promise<Result<Product>> {
        return apiRequest<Product>('/products', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async update(id: number, data: any): Promise<Result<Product>> {
        return apiRequest<Product>(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(id: number): Promise<Result<boolean>> {
        return apiRequest<boolean>(`/products/${id}`, { method: 'DELETE' });
    }

    static async getById(_id: number): Promise<Result<Product | null>> {
        // Placeholder
        return { success: false, error: new AppErrorClass(ErrorTypes.DATABASE_ERROR, "Not implemented via API") };
    }

    static async updateStock(_productId: number, _quantityChange: number): Promise<Result<Product>> {
        // Placeholder
        return { success: false, error: new AppErrorClass(ErrorTypes.DATABASE_ERROR, "Not implemented via API") };
    }
}

export class CustomerService {
    static async findOrCreate(name: string, phone?: string): Promise<Result<Customer>> {
        return apiRequest<Customer>('/customers/find-or-create', {
            method: 'POST',
            body: JSON.stringify({ name, phone })
        });
    }

    static async getById(id: number): Promise<Result<Customer | null>> {
        return apiRequest<Customer>(`/customers/${id}`);
    }
}

export class SalesService {
    static async processPayment(
        cart: CartItem[],
        paymentMethod: PaymentMethod,
        total: number,
        customerInfo?: { name: string; phone?: string },
        userId?: number,
        shiftId?: number,
        discount?: Discount
    ): Promise<PaymentResult> {
        const payload = {
            items: cart.map(item => ({ product: item.product, quantity: item.quantity })),
            paymentMethod,
            total,
            customerInfo,
            userId,
            shiftId,
            discount: discount
                ? {
                    type: discount.type,
                    value: discount.value,
                    reason: discount.reason,
                }
                : undefined,
        };

        const result = await apiRequest<{
            saleId: number;
            total_amount: number;
            timestamp: string;
            payment_method: PaymentMethod;
            items: Array<{
                product: CartItem['product'];
                quantity: number;
            }>;
            customer?: {
                id: number;
                name: string;
                phone: string | null;
            } | null;
        }>('/sales', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result.success) {
            const data = result.data;
            return {
                success: true,
                saleId: data.saleId,
                total: data.total_amount,
                paymentMethod: data.payment_method as PaymentMethod,
                timestamp: new Date(data.timestamp),
                items: data.items.map((i: any) => ({
                    product: i.product,
                    quantity: i.quantity
                })),
                customer: data.customer
                    ? {
                        id: data.customer.id,
                        name: data.customer.name,
                        phone: data.customer.phone || undefined,
                    }
                    : null,
            };
        } else {
            return {
                success: false,
                total, // Return original total on failure
                paymentMethod,
                timestamp: new Date(),
                items: [],
                error: result.error?.message
            };
        }
    }

    static async getSales(limit: number = 50): Promise<Result<any[]>> {
        return apiRequest<any[]>(`/sales?limit=${limit}`);
    }
}



export class ShiftService {
    static async startShift(userId: number, startAmount: number): Promise<Result<ShiftRecord>> {
        return apiRequest<ShiftRecord>('/shifts/start', {
            method: 'POST',
            body: JSON.stringify({ userId, startAmount })
        });
    }

    static async endShift(shiftId: number, endAmount: number, note?: string): Promise<Result<ShiftRecord>> {
        return apiRequest<ShiftRecord>('/shifts/end', {
            method: 'POST',
            body: JSON.stringify({ shiftId, endAmount, note })
        });
    }

    static async getActiveShift(userId: number): Promise<Result<ShiftRecord | null>> {
        return apiRequest<ShiftRecord | null>(`/shifts/active/${userId}`);
    }
}

export class ReportsService {
    static async getSalesReport(params: {
        startDate?: string;
        endDate?: string;
        shiftId?: number;
        userId?: number;
    }): Promise<Result<any>> {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.shiftId) queryParams.append('shiftId', params.shiftId.toString());
        if (params.userId) queryParams.append('userId', params.userId.toString());

        return apiRequest<any>(`/reports/sales?${queryParams.toString()}`);
    }
}

export class StockAdjustmentService {
    static async create(data: {
        productId: number;
        quantity: number;
        reason: string;
        notes?: string;
        userId: number;
        batchNumber?: string;
        expiryDate?: string;
    }): Promise<Result<any>> {
        return apiRequest<any>('/stock-adjustments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    static async getHistory(productId?: number): Promise<Result<any>> {
        const query = productId ? `?productId=${productId}` : '';
        return apiRequest<any>(`/stock-adjustments${query}`);
    }
}

export class UserService {
    static async getAll(): Promise<Result<any[]>> {
        return apiRequest<any[]>('/users');
    }

    static async create(data: {
        username: string;
        password: string;
        name: string;
        role: string;
    }): Promise<Result<any>> {
        return apiRequest<any>('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async update(id: number, data: {
        username: string;
        password?: string;
        name: string;
        role: string;
    }): Promise<Result<any>> {
        return apiRequest<any>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(id: number): Promise<Result<boolean>> {
        return apiRequest<boolean>(`/users/${id}`, { method: 'DELETE' });
    }
}


export class PharmacyService {
    static async getProfile(): Promise<Result<any>> {
        return apiRequest<any>('/pharmacy');
    }

    static async updateProfile(data: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        taxId?: string;
        footer?: string;
    }): Promise<Result<any>> {
        return apiRequest<any>('/pharmacy', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async redeemLicense(licenseKey: string): Promise<Result<any>> {
        return apiRequest<any>('/license/redeem', {
            method: 'POST',
            body: JSON.stringify({ licenseKey })
        });
    }

    static async startTrial(): Promise<Result<any>> {
        return apiRequest<any>('/trial/start', {
            method: 'POST',
            body: JSON.stringify({})
        });
    }
}
