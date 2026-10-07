import type { CartSummary } from '../types';
import { formatPrice } from '../utils/calculations';
import { KEYBOARD_SHORTCUTS } from '../constants';

interface QuickActionsProps {
    summary: CartSummary;
    onCashPayment: () => void;
    onCardPayment: () => void;
    onClearCart: () => void;
    onHoldTransaction: () => void;
    onResumeTransaction: () => void;
    heldTransactionCount: number;
    disabled: boolean;
    t: (key: string) => string;
}

/**
 * Quick actions panel for payment and cart operations
 */
export default function QuickActions({
    summary,
    onCashPayment,
    onCardPayment,
    onClearCart,
    onHoldTransaction,
    onResumeTransaction,
    heldTransactionCount,
    disabled,
    t,
}: QuickActionsProps) {
    return (
        <div className="flex flex-col h-full bg-dark-bg">
            {/* Header */}
            <div className="bg-dark-surface px-6 py-4 border-b border-dark-border">
                <h2 className="text-xl font-bold text-gray-100 flex items-center">
                    <svg
                        className="h-6 w-6 mr-2 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                    {t('quickActions.title')}
                </h2>
            </div>

            {/* Actions Content */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto scrollbar-thin">
                <div className="space-y-4">
                    {/* Summary Card */}
                    <div className="card p-6 bg-gradient-to-br from-dark-surface to-dark-elevated" role="region" aria-label="Order summary">
                        <div className="text-center">
                            <div className="text-sm text-gray-400 mb-2">{t('quickActions.total')}</div>
                            <div className="text-4xl font-bold text-primary mb-4 font-mono" aria-live="polite">
                                {formatPrice(summary.total)}
                            </div>
                            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    {summary.itemCount} {summary.itemCount === 1 ? t('quickActions.item') : t('quickActions.items')}
                                </span>
                                <span aria-hidden="true">•</span>
                                <span>{t('cart.vat')}: {formatPrice(summary.vat)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <section className="space-y-3" aria-label="Payment methods">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">{t('quickActions.paymentMethods')}</h3>

                        {/* Cash Payment Button */}
                        <button
                            onClick={onCashPayment}
                            disabled={disabled}
                            className="w-full btn-success py-6 rounded-xl shadow-glow-success flex items-center justify-between group hover:scale-105 transform transition-all disabled:transform-none disabled:hover:scale-100"
                            aria-label={`Process cash payment for ${formatPrice(summary.total)}`}
                        >
                            <div className="flex items-center">
                                <svg
                                    className="h-8 w-8 mr-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                                <div className="text-left">
                                    <div className="text-lg font-bold">{t('quickActions.cashPayment')}</div>
                                    <div className="text-sm opacity-80">{t('quickActions.processCash')}</div>
                                </div>
                            </div>
                            <kbd className="px-3 py-1 bg-white/20 rounded text-xs font-mono" aria-label="Keyboard shortcut 1">
                                1
                            </kbd>
                        </button>

                        {/* Card Payment Button */}
                        <button
                            onClick={onCardPayment}
                            disabled={disabled}
                            className="w-full btn-primary py-6 rounded-xl shadow-glow flex items-center justify-between group hover:scale-105 transform transition-all disabled:transform-none disabled:hover:scale-100"
                            aria-label={`Process card payment for ${formatPrice(summary.total)}`}
                        >
                            <div className="flex items-center">
                                <svg
                                    className="h-8 w-8 mr-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                    />
                                </svg>
                                <div className="text-left">
                                    <div className="text-lg font-bold">{t('quickActions.cardPayment')}</div>
                                    <div className="text-sm opacity-80">{t('quickActions.processCard')}</div>
                                </div>
                            </div>
                            <kbd className="px-3 py-1 bg-white/20 rounded text-xs font-mono" aria-label="Keyboard shortcut 2">
                                2
                            </kbd>
                        </button>
                    </section>

                    {/* Additional Actions */}
                    <section className="space-y-3 pt-4 border-t border-dark-border" aria-label="Other actions">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">{t('quickActions.otherActions')}</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={onHoldTransaction}
                                disabled={disabled}
                                className="btn-secondary py-3 rounded-xl flex flex-col items-center justify-center p-2 group hover:bg-dark-elevated transition-colors"
                                title="Hold current transaction"
                            >
                                <svg className="h-6 w-6 mb-1 text-warning group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-bold">{t('quickActions.holdTransaction').split(' ')[0]}</span>
                            </button>
                            <button
                                onClick={onResumeTransaction}
                                disabled={heldTransactionCount === 0}
                                className="btn-secondary py-3 rounded-xl flex flex-col items-center justify-center p-2 relative group hover:bg-dark-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Resume held transaction"
                            >
                                <svg className="h-6 w-6 mb-1 text-info group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-bold">{t('quickActions.resumeTransaction').split(' ')[0]}</span>
                                {heldTransactionCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-dark-bg animate-pulse">
                                        {heldTransactionCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Clear Cart Button */}
                        <button
                            onClick={onClearCart}
                            disabled={disabled}
                            className="w-full btn-danger py-4 rounded-xl flex items-center justify-between group"
                            aria-label="Clear all items from cart"
                        >
                            <div className="flex items-center">
                                <svg
                                    className="h-6 w-6 mr-3"
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
                                <div className="text-left">
                                    <div className="font-bold">{t('quickActions.clearCart')}</div>
                                    <div className="text-xs opacity-80">{t('quickActions.removeAllItems')}</div>
                                </div>
                            </div>
                            <kbd className="px-3 py-1 bg-white/20 rounded text-xs font-mono" aria-label="Keyboard shortcut 3">
                                3
                            </kbd>
                        </button>
                    </section>
                </div>

                {/* Keyboard Shortcuts Reference */}
                <div className="mt-6 card p-4 bg-dark-surface/50">
                    <h3 className="text-xs font-medium text-gray-400 mb-3">{t('quickActions.keyboardShortcuts')}</h3>
                    <dl className="space-y-2 text-xs text-gray-500">
                        <div className="flex justify-between items-center">
                            <dt>{t('quickActions.cashPayment')}</dt>
                            <dd>
                                <kbd className="px-2 py-1 bg-dark-elevated rounded font-mono text-gray-400">1</kbd>
                            </dd>
                        </div>
                        <div className="flex justify-between items-center">
                            <dt>{t('quickActions.cardPayment')}</dt>
                            <dd>
                                <kbd className="px-2 py-1 bg-dark-elevated rounded font-mono text-gray-400">2</kbd>
                            </dd>
                        </div>
                        <div className="flex justify-between items-center">
                            <dt>{t('quickActions.clearCart')}</dt>
                            <dd>
                                <kbd className="px-2 py-1 bg-dark-elevated rounded font-mono text-gray-400">3</kbd>
                            </dd>
                        </div>
                        <div className="flex justify-between items-center">
                            <dt>{t('quickActions.cancelClearSearch')}</dt>
                            <dd>
                                <kbd className="px-2 py-1 bg-dark-elevated rounded font-mono text-gray-400">
                                    {KEYBOARD_SHORTCUTS.CANCEL}
                                </kbd>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}
