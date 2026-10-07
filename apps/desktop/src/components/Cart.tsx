import type { CartItem, CartSummary } from '../types';
import type { CustomerInfo } from './CustomerModal';
import { formatPrice } from '../utils/calculations';
import { MESSAGES } from '../constants';

interface CartProps {
    cart: CartItem[];
    updateQuantity: (productId: number, quantity: number) => void;
    removeFromCart: (productId: number) => void;
    summary: CartSummary & { discount?: number; subtotalAfterDiscount?: number };
    customer: CustomerInfo | null;
    onRemoveCustomer: () => void;
    onApplyDiscount?: () => void;
    currentDiscount?: { type: 'percentage' | 'fixed'; value: number; reason?: string } | null;
    onRemoveDiscount?: () => void;
    t: (key: string) => string;
}

/**
 * Shopping cart component displaying current sale items
 */
export default function Cart({ cart, updateQuantity, removeFromCart, summary, customer, onRemoveCustomer, onApplyDiscount, currentDiscount, onRemoveDiscount, t }: CartProps) {
    /**
     * Handle quantity input change
     */
    const handleQuantityChange = (productId: number, value: string): void => {
        const newQty = parseInt(value, 10);
        if (!isNaN(newQty) && newQty >= 0) {
            updateQuantity(productId, newQty);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-dark-surface px-6 py-4 border-b border-dark-border">
                <h2 className="text-xl font-bold text-gray-100 flex items-center">
                    <svg
                        className="h-6 w-6 mr-2 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                    </svg>
                    {t('cart.title')}
                </h2>

                {/* Customer Info */}
                {customer && (
                    <div className="mt-3 px-3 py-2 bg-primary/10 border border-primary rounded-lg flex items-center justify-between">
                        <div className="flex items-center text-primary">
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <div>
                                <div className="font-semibold">{customer.name}</div>
                                {customer.phone && <div className="text-xs text-gray-400">{customer.phone}</div>}
                            </div>
                        </div>
                        <button
                            onClick={onRemoveCustomer}
                            className="text-gray-400 hover:text-danger transition-colors"
                            aria-label="Remove customer"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto scrollbar-thin bg-dark-bg p-6">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <svg
                            className="h-24 w-24 mb-4 text-gray-700"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                        </svg>
                        <p className="text-lg font-medium">{t('cart.empty')}</p>
                        <p className="text-sm text-gray-600 mt-1">
                            {t('search.placeholder')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3" role="list" aria-label="Cart items">
                        {cart.map((item) => {
                            const lineTotal = item.product.public_price * item.quantity;
                            const hasStockIssue = item.quantity > item.product.current_stock;

                            return (
                                <article
                                    key={item.product.id}
                                    className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-primary transition-all group"
                                    role="listitem"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-100 text-lg group-hover:text-primary transition-colors">
                                                {item.product.commercial_name}
                                            </h3>
                                            <p className="text-sm text-gray-500 font-mono mt-1">
                                                {item.product.barcode}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="text-gray-600 hover:text-danger transition-colors ml-4"
                                            title="Remove item"
                                            aria-label={`Remove ${item.product.commercial_name} from cart`}
                                        >
                                            <svg
                                                className="h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                className="w-8 h-8 rounded-lg bg-dark-elevated hover:bg-dark-border text-gray-300 hover:text-white transition-all flex items-center justify-center"
                                                aria-label="Decrease quantity"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                </svg>
                                            </button>

                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(item.product.id, e.target.value)}
                                                className="w-16 h-8 text-center bg-dark-elevated border border-dark-border rounded-lg font-mono font-semibold text-gray-100"
                                                min="1"
                                                aria-label={`Quantity for ${item.product.commercial_name}`}
                                            />

                                            <button
                                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                className="w-8 h-8 rounded-lg bg-dark-elevated hover:bg-dark-border text-gray-300 hover:text-white transition-all flex items-center justify-center"
                                                aria-label="Increase quantity"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Price Display */}
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500 mb-1">
                                                {formatPrice(item.product.public_price)} × {item.quantity}
                                            </div>
                                            <div className="text-xl font-bold text-primary">
                                                {formatPrice(lineTotal)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stock Warning */}
                                    {hasStockIssue && (
                                        <div className="mt-3 px-3 py-2 bg-warning/10 border border-warning rounded-lg flex items-center text-warning text-sm" role="alert">
                                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            {MESSAGES.INSUFFICIENT_STOCK(item.product.current_stock)}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Total Section */}
            {cart.length > 0 && (
                <div className="bg-dark-surface border-t border-dark-border px-6 py-4">
                    {/* Discount Button */}
                    {onApplyDiscount && !currentDiscount && (
                        <button
                            onClick={onApplyDiscount}
                            className="w-full btn-secondary py-3 rounded-xl font-semibold flex items-center justify-center mb-4"
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Apply Discount
                        </button>
                    )}

                    <div className="space-y-2">
                        <div className="flex justify-between text-gray-400">
                            <span>Subtotal:</span>
                            <span className="font-mono">{formatPrice(summary.subtotal)}</span>
                        </div>

                        {/* Discount Display */}
                        {currentDiscount && summary.discount && (
                            <>
                                <div className="flex justify-between text-warning items-center">
                                    <span className="flex items-center">
                                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Discount ({currentDiscount.type === 'percentage' ? `${currentDiscount.value}%` : `${currentDiscount.value} TND`}):
                                    </span>
                                    <span className="font-bold font-mono">-{formatPrice(summary.discount)}</span>
                                </div>
                                {onRemoveDiscount && (
                                    <button
                                        onClick={onRemoveDiscount}
                                        className="text-xs text-danger hover:underline"
                                    >
                                        × Remove discount
                                    </button>
                                )}
                            </>
                        )}

                        <div className="flex justify-between text-gray-400">
                            <span>VAT ({(summary.vatRate * 100).toFixed(0)}%):</span>
                            <span className="font-mono">{formatPrice(summary.vat)}</span>
                        </div>
                        <div className="h-px bg-dark-border my-2" aria-hidden="true" />
                        <div className="flex justify-between text-2xl font-bold">
                            <span className="text-gray-100">Total:</span>
                            <span className="text-primary">{formatPrice(summary.total)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
