import { useEffect, useState } from 'react';
import { ProductService } from '../services/database.service';
import { formatPrice } from '../utils/calculations';
import type { Product } from '@repo/database';

interface LowStockAlertsProps {
    onClose: () => void;
    t: (key: string) => string;
}

/**
 * Low stock alerts component showing products below threshold
 */
export default function LowStockAlerts({ onClose, t }: LowStockAlertsProps) {
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLowStockProducts();
    }, []);

    const loadLowStockProducts = async () => {
        setIsLoading(true);
        try {
            const result = await ProductService.getLowStockProducts();
            if (result.success) {
                setLowStockProducts(result.data);
            }
        } catch (error) {
            console.error('Failed to load low stock products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStockLevel = (product: Product): 'critical' | 'low' | 'medium' => {
        const percentage = (product.current_stock / product.low_stock_threshold) * 100;
        if (percentage <= 25) return 'critical';
        if (percentage <= 50) return 'low';
        return 'medium';
    };

    const getStockColor = (level: 'critical' | 'low' | 'medium') => {
        switch (level) {
            case 'critical':
                return 'text-danger border-danger bg-danger/10';
            case 'low':
                return 'text-warning border-warning bg-warning/10';
            case 'medium':
                return 'text-blue-400 border-blue-400 bg-blue-400/10';
        }
    };

    const criticalCount = lowStockProducts.filter(p => getStockLevel(p) === 'critical').length;
    const lowCount = lowStockProducts.filter(p => getStockLevel(p) === 'low').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                            <svg className="h-7 w-7 mr-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {t('lowStockAlerts.title')}
                        </h2>
                        {!isLoading && lowStockProducts.length > 0 && (
                            <div className="mt-1 flex items-center space-x-4 text-sm">
                                {criticalCount > 0 && (
                                    <span className="text-danger flex items-center">
                                        <span className="w-2 h-2 bg-danger rounded-full mr-1"></span>
                                        {criticalCount} {t('lowStockAlerts.critical')}
                                    </span>
                                )}
                                {lowCount > 0 && (
                                    <span className="text-warning flex items-center">
                                        <span className="w-2 h-2 bg-warning rounded-full mr-1"></span>
                                        {lowCount} {t('lowStockAlerts.low')}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-100 transition-colors"
                        aria-label="Close low stock alerts"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    ) : lowStockProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <svg className="h-20 w-20 mb-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-lg font-medium">{t('lowStockAlerts.allHealthy')}</p>
                            <p className="text-sm text-gray-600 mt-1">{t('lowStockAlerts.noProductsBelow')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lowStockProducts
                                .sort((a, b) => {
                                    // Sort by stock level: critical first, then low, then medium
                                    const levelA = getStockLevel(a);
                                    const levelB = getStockLevel(b);
                                    const order = { critical: 0, low: 1, medium: 2 };
                                    return order[levelA] - order[levelB];
                                })
                                .map((product) => {
                                    const level = getStockLevel(product);
                                    const percentage = (product.current_stock / product.low_stock_threshold) * 100;

                                    return (
                                        <div
                                            key={product.id}
                                            className={`card p-4 border-2 ${getStockColor(level)} transition-all hover:scale-[1.02]`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        <h3 className="font-semibold text-gray-100 text-lg">
                                                            {product.commercial_name}
                                                        </h3>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${level === 'critical' ? 'bg-danger text-white' :
                                                            level === 'low' ? 'bg-warning text-white' :
                                                                'bg-blue-400 text-white'
                                                            }`}>
                                                            {t(`lowStockAlerts.${level}`)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-mono">{product.barcode}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-400">Price</div>
                                                    <div className="text-lg font-bold text-primary">
                                                        {formatPrice(product.public_price)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {/* Stock Progress Bar */}
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-400">{t('lowStockAlerts.currentStock')}</span>
                                                        <span className="font-bold text-gray-100">
                                                            {product.current_stock} / {product.low_stock_threshold}
                                                        </span>
                                                    </div>
                                                    <div className="h-3 bg-dark-bg rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all ${level === 'critical' ? 'bg-danger' :
                                                                level === 'low' ? 'bg-warning' :
                                                                    'bg-blue-400'
                                                                }`}
                                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Recommendations */}
                                                <div className="flex items-center justify-between pt-2 border-t border-dark-border">
                                                    <div className="text-sm">
                                                        <span className="text-gray-400">Suggested Order:</span>
                                                        <span className="ml-2 font-semibold text-success">
                                                            {Math.max(product.low_stock_threshold * 2 - product.current_stock, product.low_stock_threshold)}
                                                        </span>
                                                        <span className="text-gray-500 ml-1">units</span>
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="text-gray-400">Estimated Cost:</span>
                                                        <span className="ml-2 font-mono text-gray-100">
                                                            {formatPrice(
                                                                product.purchase_price *
                                                                Math.max(product.low_stock_threshold * 2 - product.current_stock, product.low_stock_threshold)
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-dark-border flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {lowStockProducts.length > 0
                            ? `${lowStockProducts.length} ${lowStockProducts.length !== 1 ? t('lowStockAlerts.products') : t('lowStockAlerts.product')} ${t('lowStockAlerts.needsAttention')}`
                            : t('lowStockAlerts.stockLevelsMonitored')}
                    </div>
                    <button
                        onClick={onClose}
                        className="btn-primary px-6 py-2 rounded-lg"
                    >
                        {t('lowStockAlerts.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
