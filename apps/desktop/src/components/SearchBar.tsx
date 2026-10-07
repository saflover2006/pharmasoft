import { useEffect, useRef } from 'react';
import type { Product } from '@repo/database';
import { isProductExpired, getDaysUntilExpiry } from '../constants';

interface SearchBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchProducts: (query: string) => void;
    searchResults: Product[];
    isSearching: boolean;
    onSelectProduct: (product: Product) => void;
    t: (key: string) => string;
}

export default function SearchBar({
    searchTerm,
    setSearchTerm,
    searchProducts,
    searchResults,
    isSearching,
    onSelectProduct,
    t,
}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus search bar on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Search on input change with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            searchProducts(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, searchProducts]);

    return (
        <div className="bg-dark-surface border-b border-dark-border px-6 py-4 relative z-10">
            <div className="max-w-4xl">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                            className="h-5 w-5 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('search.placeholder')}
                        className="w-full pl-12 pr-4 py-3 bg-dark-elevated border-2 border-dark-border rounded-lg text-lg focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all shadow-glow"
                        autoComplete="off"
                    />
                    {isSearching && (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute left-6 right-6 mt-2 bg-dark-elevated border border-dark-border rounded-lg shadow-2xl max-h-96 overflow-y-auto scrollbar-thin">
                        {searchResults.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => onSelectProduct(product)}
                                className="w-full px-4 py-3 hover:bg-dark-surface transition-colors text-left flex items-center justify-between group border-b border-dark-border last:border-b-0"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="font-medium text-gray-100 group-hover:text-primary transition-colors">
                                            {product.commercial_name}
                                        </div>
                                        {/* CNAM Reimbursable Badge */}
                                        {product.cnam_reimbursable && (
                                            <span className="px-2 py-0.5 bg-success/20 text-success border border-success/30 rounded text-xs font-bold">
                                                CNAM {product.cnam_rate}%
                                            </span>
                                        )}
                                        {/* Prescription Required Badge */}
                                        {product.requires_prescription && (
                                            <span className="px-2 py-0.5 bg-info/20 text-info border border-info/30 rounded text-xs font-bold">
                                                ℞
                                            </span>
                                        )}
                                    </div>
                                    {/* DCI Name */}
                                    {product.dci_name && (
                                        <div className="text-xs text-gray-500 italic mb-1">
                                            DCI: {product.dci_name}
                                        </div>
                                    )}
                                    <div className="text-sm text-gray-500 font-mono">
                                        {product.barcode}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    {/* Expiry Status Badge */}
                                    {(() => {
                                        const expired = isProductExpired(product.expiry_date);
                                        const daysUntil = getDaysUntilExpiry(product.expiry_date);

                                        if (expired) {
                                            return (
                                                <div className="px-3 py-1 bg-danger/20 border border-danger rounded-lg flex items-center">
                                                    <svg className="h-4 w-4 text-danger mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <span className="text-xs font-bold text-danger">{t('search.expired')}</span>
                                                </div>
                                            );
                                        } else if (daysUntil !== null && daysUntil <= 7) {
                                            return (
                                                <div className="px-2 py-1 bg-warning/20 border border-warning rounded text-xs font-bold text-warning">
                                                    {daysUntil}{t('search.days')}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="text-right">
                                        <div className="text-lg font-bold text-primary">
                                            {product.public_price.toFixed(2)} TND
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {t('search.stock')}: {product.current_stock}
                                        </div>
                                    </div>
                                    <svg
                                        className="h-5 w-5 text-gray-600 group-hover:text-primary transition-colors"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                    </svg>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* No results message */}
                {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="absolute left-6 right-6 mt-2 bg-dark-elevated border border-dark-border rounded-lg shadow-2xl px-4 py-6 text-center">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-600 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <p className="text-gray-400">{t('search.noResults')} "{searchTerm}"</p>
                        <p className="text-sm text-gray-600 mt-1">
                            {t('search.tryDifferent')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
