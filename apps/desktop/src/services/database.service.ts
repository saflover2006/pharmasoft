import type { Product, Customer } from '@repo/database';
import type { PaymentMethod, PaymentResult, Result, CartItem } from '../types';
import { AppError as AppErrorClass, ErrorType as ErrorTypes } from '../types';

const API_URL = 'http://localhost:3000/api';

/**
 * Generic API request wrapper
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<Result<T>> {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const json = await response.json();

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

    static async getById(id: number): Promise<Result<Product | null>> {
        // Placeholder
        return { success: false, error: new AppErrorClass(ErrorTypes.DATABASE_ERROR, "Not implemented via API") };
    }

    static async updateStock(productId: number, quantityChange: number): Promise<Result<Product>> {
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
        shiftId?: number
    ): Promise<PaymentResult> {
        const payload = {
            items: cart.map(item => ({ product: item.product, quantity: item.quantity })),
            paymentMethod,
            total,
            customerInfo,
            userId,
            shiftId
        };

        const result = await apiRequest<any>('/sales', {
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

export class AuthService {
    static async login(username: string, password: string): Promise<Result<any>> {
        return apiRequest<any>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }
}

export class ShiftService {
    static async startShift(userId: number, startAmount: number): Promise<Result<any>> {
        return apiRequest<any>('/shifts/start', {
            method: 'POST',
            body: JSON.stringify({ userId, startAmount })
        });
    }

    static async endShift(shiftId: number, endAmount: number, note?: string): Promise<Result<any>> {
        return apiRequest<any>('/shifts/end', {
            method: 'POST',
            body: JSON.stringify({ shiftId, endAmount, note })
        });
    }

    static async getActiveShift(userId: number): Promise<Result<any>> {
        return apiRequest<any>(`/shifts/active/${userId}`);
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

