import { useState, useEffect } from 'react';
import { ProductService } from '../services/database.service';
import { formatPrice } from '../utils/calculations';
import type { Product } from '@repo/database';

interface ExpiryAlertsProps {
    onClose: () => void;
}

export default function ExpiryAlerts({ onClose }: ExpiryAlertsProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'expired' | 'expiring'>('all');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const result = await ProductService.getAll(1, 1000); // Get all products
            if (result.success) {
                // Filter products with expiry dates
                const productsWithExpiry = result.data.products.filter(p => p.expiry_date);
                setProducts(productsWithExpiry);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getExpiryStatus = (expiryDate: Date) => {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry <= 30) return 'critical';
        if (daysUntilExpiry <= 60) return 'warning';
        return 'ok';
    };

    const filteredProducts = products.filter(p => {
        if (!p.expiry_date) return false;
        const status = getExpiryStatus(p.expiry_date);

        if (filter === 'expired') return status === 'expired';
        if (filter === 'expiring') return status === 'critical' || status === 'warning';
        return true;
    }).sort((a, b) => {
        if (!a.expiry_date || !b.expiry_date) return 0;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });

    const expiredCount = products.filter(p => p.expiry_date && getExpiryStatus(p.expiry_date) === 'expired').length;
    const expiringCount = products.filter(p => p.expiry_date && ['critical', 'warning'].includes(getExpiryStatus(p.expiry_date))).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-dark-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Expiry Alerts
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 border-b border-dark-border bg-dark-bg/30">
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            onClick={() => setFilter('all')}
                            className={`p-4 rounded-xl border-2 transition-all ${filter === 'all'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-dark-border bg-dark-elevated hover:border-dark-border/50'
                                }`}
                        >
                            <div className="text-2xl font-bold text-primary">{products.length}</div>
                            <div className="text-sm text-gray-400">Total Tracked</div>
                        </button>
                        <button
                            onClick={() => setFilter('expiring')}
                            className={`p-4 rounded-xl border-2 transition-all ${filter === 'expiring'
                                    ? 'border-warning bg-warning/10'
                                    : 'border-dark-border bg-dark-elevated hover:border-dark-border/50'
                                }`}
                        >
                            <div className="text-2xl font-bold text-warning">{expiringCount}</div>
                            <div className="text-sm text-gray-400">Expiring Soon</div>
                        </button>
                        <button
                            onClick={() => setFilter('expired')}
                            className={`p-4 rounded-xl border-2 transition-all ${filter === 'expired'
                                    ? 'border-danger bg-danger/10'
                                    : 'border-dark-border bg-dark-elevated hover:border-dark-border/50'
                                }`}
                        >
                            <div className="text-2xl font-bold text-danger">{expiredCount}</div>
                            <div className="text-sm text-gray-400">Expired</div>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            {filter === 'all' ? 'No products with expiry dates' : `No ${filter} products`}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredProducts.map((product) => {
                                const status = product.expiry_date ? getExpiryStatus(product.expiry_date) : 'ok';
                                const expiryDate = product.expiry_date ? new Date(product.expiry_date) : null;
                                const daysUntilExpiry = expiryDate
                                    ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    : 0;

                                return (
                                    <div
                                        key={product.id}
                                        className={`p-4 rounded-xl border-2 ${status === 'expired'
                                                ? 'border-danger bg-danger/10'
                                                : status === 'critical'
                                                    ? 'border-warning bg-warning/10'
                                                    : status === 'warning'
                                                        ? 'border-warning/50 bg-warning/5'
                                                        : 'border-dark-border bg-dark-elevated'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white text-lg">{product.commercial_name}</h3>
                                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                                                    <span className="font-mono">{product.barcode}</span>
                                                    {product.batch_number && (
                                                        <span className="bg-dark-bg px-2 py-0.5 rounded font-mono">
                                                            Batch: {product.batch_number}
                                                        </span>
                                                    )}
                                                    <span>{formatPrice(product.public_price)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${status === 'expired' ? 'text-danger' :
                                                        status === 'critical' ? 'text-warning' :
                                                            status === 'warning' ? 'text-warning/70' :
                                                                'text-gray-400'
                                                    }`}>
                                                    {daysUntilExpiry < 0 ? 'EXPIRED' : `${daysUntilExpiry}d`}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {expiryDate?.toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    Stock: {product.current_stock}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
