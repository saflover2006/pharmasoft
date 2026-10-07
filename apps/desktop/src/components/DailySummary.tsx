import { useEffect, useState } from 'react';
import { SalesService } from '../services/database.service';
import { formatPrice } from '../utils/calculations';

interface DailySummaryProps {
    onClose: () => void;
    currentUser: any;
    t: (key: string) => string;
}

interface DailyStats {
    totalSales: number;
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    cashSales: number;
    cardSales: number;
    topProducts: Array<{
        name: string;
        quantity: number;
        revenue: number;
    }>;
}

/**
 * Daily summary dashboard component
 */
export default function DailySummary({ onClose, currentUser, t }: DailySummaryProps) {
    const [stats, setStats] = useState<DailyStats>({
        totalSales: 0,
        totalRevenue: 0,
        totalTransactions: 0,
        averageTransaction: 0,
        cashSales: 0,
        cardSales: 0,
        topProducts: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDailyStats();
    }, []);

    const loadDailyStats = async () => {
        setIsLoading(true);
        try {
            const result = await SalesService.getSales(1000);
            if (result.success) {
                const sales = result.data as any[];

                // Filter today's sales
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let todaySales = sales.filter(sale => {
                    const saleDate = new Date(sale.timestamp);
                    saleDate.setHours(0, 0, 0, 0);
                    return saleDate.getTime() === today.getTime();
                });

                // If cashier, only show their own sales
                if (currentUser?.role === 'cashier') {
                    todaySales = todaySales.filter(sale => sale.userId === currentUser.id);
                }

                // Calculate stats
                const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0);
                const totalTransactions = todaySales.length;
                const cashSales = todaySales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
                const cardSales = todaySales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + s.total_amount, 0);

                // Calculate top products
                const productMap = new Map<string, { quantity: number; revenue: number }>();

                todaySales.forEach(sale => {
                    sale.items?.forEach((item: any) => {
                        const name = item.product.commercial_name;
                        const existing = productMap.get(name) || { quantity: 0, revenue: 0 };
                        productMap.set(name, {
                            quantity: existing.quantity + item.quantity,
                            revenue: existing.revenue + (item.unit_price * item.quantity),
                        });
                    });
                });

                const topProducts = Array.from(productMap.entries())
                    .map(([name, data]) => ({ name, ...data }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5);

                setStats({
                    totalSales: todaySales.length,
                    totalRevenue,
                    totalTransactions,
                    averageTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
                    cashSales,
                    cardSales,
                    topProducts,
                });
            }
        } catch (error) {
            console.error('Failed to load daily stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {currentUser?.role === 'cashier' ? t('dailySummary.myDailySummary') : t('dailySummary.title')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-100 transition-colors"
                        aria-label="Close daily summary"
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
                    ) : (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Total Revenue */}
                                <div className="card p-6 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
                                    <div className="text-sm text-gray-400 mb-2">{t('dailySummary.totalSales')}</div>
                                    <div className="text-3xl font-bold text-primary">{formatPrice(stats.totalRevenue)}</div>
                                    <div className="text-xs text-gray-500 mt-2">{stats.totalTransactions} {t('dailySummary.transactions')}</div>
                                </div>

                                {/* Average Transaction */}
                                <div className="card p-6 bg-gradient-to-br from-success/20 to-success/5 border-success/30">
                                    <div className="text-sm text-gray-400 mb-2">{t('dailySummary.averageTransaction')}</div>
                                    <div className="text-3xl font-bold text-success">{formatPrice(stats.averageTransaction)}</div>
                                    <div className="text-xs text-gray-500 mt-2">per transaction</div>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('quickActions.paymentMethods')}</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-gray-400 flex items-center">
                                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                {t('dailySummary.cash')}
                                            </span>
                                            <span className="font-mono font-bold text-gray-100">{formatPrice(stats.cashSales)}</span>
                                        </div>
                                        <div className="h-2 bg-dark-elevated rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-success transition-all"
                                                style={{
                                                    width: `${stats.totalRevenue > 0 ? (stats.cashSales / stats.totalRevenue) * 100 : 0}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-gray-400 flex items-center">
                                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                                {t('dailySummary.card')}
                                            </span>
                                            <span className="font-mono font-bold text-gray-100">{formatPrice(stats.cardSales)}</span>
                                        </div>
                                        <div className="h-2 bg-dark-elevated rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{
                                                    width: `${stats.totalRevenue > 0 ? (stats.cardSales / stats.totalRevenue) * 100 : 0}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Top Products */}
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-gray-100 mb-4">Top Selling Products</h3>
                                {stats.topProducts.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <p>No sales today yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {stats.topProducts.map((product, index) => (
                                            <div
                                                key={product.name}
                                                className="flex items-center justify-between p-3 bg-dark-bg rounded-lg hover:bg-dark-elevated transition-colors"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-100">{product.name}</div>
                                                        <div className="text-xs text-gray-500">{product.quantity} units sold</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-primary">{formatPrice(product.revenue)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="card p-4 text-center">
                                    <div className="text-2xl font-bold text-gray-100">{stats.totalTransactions}</div>
                                    <div className="text-xs text-gray-500 mt-1">Transactions</div>
                                </div>
                                <div className="card p-4 text-center">
                                    <div className="text-2xl font-bold text-gray-100">
                                        {stats.topProducts.reduce((sum, p) => sum + p.quantity, 0)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Items Sold</div>
                                </div>
                                <div className="card p-4 text-center">
                                    <div className="text-2xl font-bold text-gray-100">
                                        {stats.totalRevenue > 0 ? ((stats.cardSales / stats.totalRevenue) * 100).toFixed(0) : 0}%
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Card Payments</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-dark-border flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {t('dailySummary.today')}: {new Date().toLocaleDateString('fr-TN', { dateStyle: 'full' })}
                    </div>
                    <button
                        onClick={onClose}
                        className="btn-primary px-6 py-2 rounded-lg"
                    >
                        {t('dailySummary.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
