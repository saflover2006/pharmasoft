import type { CartItem, CartSummary } from '../types';
import { VAT_RATE, CURRENCY, CURRENCY_FORMAT, LOCALE } from '../constants';

/**
 * Calculate cart summary including subtotal, VAT, and total
 */
export function calculateCartSummary(cart: CartItem[]): CartSummary {
    const subtotal = cart.reduce(
        (sum, item) => sum + item.product.public_price * item.quantity,
        0
    );

    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;

    return {
        subtotal,
        vat,
        vatRate: VAT_RATE,
        total,
        itemCount: cart.length,
    };
}

/**
 * Format price as currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(LOCALE, CURRENCY_FORMAT).format(amount);
}

/**
 * Format price as currency with just the number
 */
export function formatPrice(amount: number): string {
    return `${amount.toFixed(2)} ${CURRENCY}`;
}

/**
 * Check if cart has sufficient stock for all items
 */
export function validateCartStock(cart: CartItem[]): {
    valid: boolean;
    errors: Array<{ productId: number; productName: string; requested: number; available: number }>;
} {
    const errors = cart
        .filter((item) => item.quantity > item.product.current_stock)
        .map((item) => ({
            productId: item.product.id,
            productName: item.product.commercial_name,
            requested: item.quantity,
            available: item.product.current_stock,
        }));

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Check if a quantity is within valid range
 */
export function isValidQuantity(quantity: number, maxStock: number): boolean {
    return Number.isInteger(quantity) && quantity > 0 && quantity <= maxStock;
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
    return query.trim().replace(/[<>]/g, '');
}

/**
 * Check if search query is valid
 */
export function isValidSearchQuery(query: string): boolean {
    const sanitized = sanitizeSearchQuery(query);
    return sanitized.length >= 2;
}

/**
 * Calculate discount amount
 */
export function calculateDiscountAmount(
    subtotal: number,
    discount: { type: 'percentage' | 'fixed'; value: number }
): number {
    if (discount.type === 'percentage') {
        return subtotal * (discount.value / 100);
    }
    return Math.min(discount.value, subtotal); // Don't exceed subtotal
}

/**
 * Calculate cart summary with discount
 */
export function calculateCartSummaryWithDiscount(
    cart: CartItem[],
    discount?: { type: 'percentage' | 'fixed'; value: number }
): CartSummary & { discount: number; subtotalAfterDiscount: number } {
    const subtotal = cart.reduce(
        (sum, item) => sum + item.product.public_price * item.quantity,
        0
    );

    const discountAmount = discount ? calculateDiscountAmount(subtotal, discount) : 0;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const vat = subtotalAfterDiscount * VAT_RATE;
    const total = subtotalAfterDiscount + vat;

    return {
        subtotal,
        discount: discountAmount,
        subtotalAfterDiscount,
        vat,
        vatRate: VAT_RATE,
        total,
        itemCount: cart.length,
    };
}
