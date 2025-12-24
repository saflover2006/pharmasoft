import { useState, useEffect } from 'react';
import { ReportsService } from '../services/database.service';
import { formatPrice } from '../utils/calculations';

interface SalesReportsProps {
    onClose: () => void;
}

export default function SalesReports({ onClose }: SalesReportsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);

    // Date range filter
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        today.setDate(1); // First day of month
        return today.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    useEffect(() => {
        loadReport();
    }, [startDate, endDate]);

    const loadReport = async () => {
        setIsLoading(true);
        try {
            console.log('Loading report with dates:', { startDate, endDate });
            const result = await ReportsService.getSalesReport({
                startDate,
                endDate
            });

            console.log('Report result:', result);

            if (result.success) {
                setReportData(result.data);
                console.log('Report data:', result.data);
            } else {
                console.error('Report failed:', result.error);
            }
        } catch (error) {
            console.error('Failed to load report:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setQuickRange = (range: 'today' | 'week' | 'month' | 'year') => {
        const end = new Date();
        const start = new Date();

        switch (range) {
            case 'today':
                break;
            case 'week':
                start.setDate(end.getDate() - 7);
                break;
            case 'month':
                start.setMonth(end.getMonth() - 1);
                break;
            case 'year':
                start.setFullYear(end.getFullYear() - 1);
                break;
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const exportToCSV = () => {
        if (!reportData) return;

        let csv = 'Date,Sale ID,Total,Payment Method,Cashier,Items\n';
        reportData.sales.forEach((sale: any) => {
            const date = new Date(sale.timestamp).toLocaleString();
            const items = sale.items.map((i: any) => `${i.product.commercial_name}(${i.quantity})`).join('; ');
            csv += `"${date}",${sale.id},${sale.total_amount},${sale.payment_method},"${sale.user?.name || 'N/A'}","${items}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${startDate}-to-${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-dark-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Sales Reports & Analytics
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-dark-border bg-dark-bg/30">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-300">From:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-white"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-300">To:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-white"
                            />
                        </div>

                        <div className="flex space-x-2 ml-auto">
                            <button onClick={() => setQuickRange('today')} className="btn-secondary px-3 py-2 rounded-lg text-xs">Today</button>
                            <button onClick={() => setQuickRange('week')} className="btn-secondary px-3 py-2 rounded-lg text-xs">Last 7 Days</button>
                            <button onClick={() => setQuickRange('month')} className="btn-secondary px-3 py-2 rounded-lg text-xs">Last 30 Days</button>
                            <button onClick={exportToCSV} className="btn-primary px-3 py-2 rounded-lg text-xs flex items-center" disabled={!reportData}>
                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    ) : reportData ? (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-6">
                                    <div className="text-sm text-gray-400 mb-2">Total Revenue</div>
                                    <div className="text-3xl font-bold text-primary">{formatPrice(reportData.metrics.totalRevenue)}</div>
                                </div>
                                <div className="bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-xl p-6">
                                    <div className="text-sm text-gray-400 mb-2">Total Sales</div>
                                    <div className="text-3xl font-bold text-success">{reportData.metrics.totalSales}</div>
                                </div>
                                <div className="bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30 rounded-xl p-6">
                                    <div className="text-sm text-gray-400 mb-2">Average Sale</div>
                                    <div className="text-3xl font-bold text-warning">{formatPrice(reportData.metrics.averageSale)}</div>
                                </div>
                                <div className="bg-gradient-to-br from-info/20 to-info/5 border border-info/30 rounded-xl p-6">
                                    <div className="text-sm text-gray-400 mb-2">Payment Methods</div>
                                    <div className="text-sm text-gray-300 mt-2">
                                        {Object.entries(reportData.metrics.paymentMethods).map(([method, count]: any) => (
                                            <div key={method} className="flex justify-between">
                                                <span className="capitalize">{method}:</span>
                                                <span className="font-bold">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Top Products */}
                            <div className="bg-dark-elevated rounded-xl border border-dark-border p-6">
                                <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
                                    <svg className="h-5 w-5 mr-2 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                    Top 10 Best-Selling Products
                                </h3>
                                <div className="space-y-2">
                                    {reportData.topProducts.map((product: any, index: number) => (
                                        <div key={product.productId} className="flex items-center p-3 bg-dark-bg rounded-lg">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-4 ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                index === 1 ? 'bg-gray-400/20 text-gray-400' :
                                                    index === 2 ? 'bg-orange-500/20 text-orange-500' :
                                                        'bg-dark-border text-gray-500'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-white">{product.name}</div>
                                                <div className="text-xs text-gray-500">Sold: {product.quantity} units</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-primary">{formatPrice(product.revenue)}</div>
                                                <div className="text-xs text-gray-500">Revenue</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Sales Table */}
                            <div className="bg-dark-elevated rounded-xl border border-dark-border p-6">
                                <h3 className="text-lg font-bold text-gray-100 mb-4">Recent Sales</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-gray-400 border-b border-dark-border">
                                            <tr>
                                                <th className="pb-3">Date/Time</th>
                                                <th className="pb-3">Sale ID</th>
                                                <th className="pb-3">Items</th>
                                                <th className="pb-3">Cashier</th>
                                                <th className="pb-3">Payment</th>
                                                <th className="pb-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-300">
                                            {reportData.sales.slice(0, 20).map((sale: any) => (
                                                <tr key={sale.id} className="border-b border-dark-border/50">
                                                    <td className="py-3">{new Date(sale.timestamp).toLocaleString()}</td>
                                                    <td className="py-3 font-mono text-xs">#{sale.id.toString().padStart(6, '0')}</td>
                                                    <td className="py-3">{sale.items.length} item(s)</td>
                                                    <td className="py-3">{sale.user?.name || 'N/A'}</td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${sale.payment_method === 'cash' ? 'bg-success/20 text-success' : 'bg-info/20 text-info'
                                                            }`}>
                                                            {sale.payment_method.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-right font-bold text-primary">{formatPrice(sale.total_amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-12">
                            <svg className="h-16 w-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            No data available for the selected period
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
