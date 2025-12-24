import type { Product } from '@repo/database';

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface HeldTransaction {
    id: string;
    timestamp: number;
    cart: CartItem[];
    customer: { name: string; phone?: string; id?: number } | null;
    note?: string;
}

/**
 * Payment method types
 */
export type PaymentMethod = 'cash' | 'card';

/**
 * Result type for async operations
 */
export type Result<T, E = Error> =
    | { success: true; data: T }
    | { success: false; error: E };

/**
 * Payment processing result
 */
export interface PaymentResult {
    success: boolean;
    saleId?: number;
    total: number;
    paymentMethod: PaymentMethod;
    timestamp: Date;
    items: { product: Product; quantity: number }[];
    customer?: { name: string; phone?: string; id?: number } | null;
    error?: string;
}

export interface Discount {
    type: 'percentage' | 'fixed';
    value: number; // percentage (0-100) or fixed amount
    reason?: string;
    authorizedBy?: string; // user who approved it
}

export interface CartDiscount extends Discount {
    appliesTo: 'cart' | 'item';
    itemId?: number; // if appliesTo is 'item'
}


/**
 * Search state
 */
export interface SearchState {
    query: string;
    results: Product[];
    isLoading: boolean;
    error: string | null;
}

/**
 * Cart summary calculations
 */
export interface CartSummary {
    subtotal: number;
    vat: number;
    vatRate: number;
    total: number;
    itemCount: number;
}

/**
 * Application error types
 */
export enum ErrorType {
    SEARCH_ERROR = 'SEARCH_ERROR',
    PAYMENT_ERROR = 'PAYMENT_ERROR',
    STOCK_ERROR = 'STOCK_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Application error
 */
export class AppError extends Error {
    constructor(
        public type: ErrorType,
        message: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }
}
