/**
 * Application-wide constants
 */

/**
 * VAT rate for pharmaceutical products in Tunisia
 */
export const VAT_RATE = 0.07; // 7%

/**
 * Search debounce delay in milliseconds
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Minimum search query length
 */
export const MIN_SEARCH_LENGTH = 2;

/**
 * Maximum search results to display
 */
export const MAX_SEARCH_RESULTS = 10;

/**
 * Check if a product is expired
 */
export function isProductExpired(expiryDate: Date | string | null | undefined): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    return expiry < now;
}

/**
 * Get days until expiry (negative if expired)
 */
export function getDaysUntilExpiry(expiryDate: Date | string | null | undefined): number | null {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
    CASH_PAYMENT: 'F1',
    CARD_PAYMENT: 'F2',
    CLEAR_CART: 'F3',
    CANCEL: 'Escape',
} as const;

/**
 * Currency code
 */
export const CURRENCY = 'TND';

/**
 * Currency display options
 */
export const CURRENCY_FORMAT: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
};

/**
 * Date/time display options
 */
export const DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
};

/**
 * Locale
 */
export const LOCALE = 'fr-TN';

/**
 * Success messages
 */
export const MESSAGES = {
    PAYMENT_SUCCESS: (method: string, total: string) =>
        `✅ Payment processed successfully!\nMethod: ${method.toUpperCase()}\nTotal: ${total}`,
    PAYMENT_ERROR: 'Payment failed. Please try again.',
    SEARCH_ERROR: 'Failed to search products.',
    EMPTY_CART: 'Cart is empty. Add items before processing payment.',
    INSUFFICIENT_STOCK: (available: number) =>
        `Insufficient stock! Only ${available} units available.`,
} as const;

/**
 * Validation rules
 */
export const VALIDATION = {
    MIN_QUANTITY: 1,
    MAX_QUANTITY: 1000,
} as const;
