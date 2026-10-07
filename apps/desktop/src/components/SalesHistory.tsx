import { useEffect, useState } from 'react';
import { SalesService, PharmacyService } from '../services/database.service';
import { formatPrice } from '../utils/calculations';
import { LOCALE, DATETIME_FORMAT } from '../constants';

interface Sale {
    id: number;
    timestamp: Date;
    total_amount: number;
    payment_method: string;
    discount: number;
    userId?: number;
    user?: {
        id: number;
        name: string;
        username: string;
    } | null;
    items: Array<{
        id: number;
        quantity: number;
        unit_price: number;
        product: {
            id: number;
            commercial_name: string;
            barcode: string;
        };
    }>;
    customer?: {
        id: number;
        name: string;
        phone: string | null;
    } | null;
}

interface SalesHistoryProps {
    onClose: () => void;
    currentUser: any;
    t: (key: string) => string;
}

/**
 * Sales history view component
 */
export default function SalesHistory({ onClose, currentUser, t }: SalesHistoryProps) {
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async () => {
        setIsLoading(true);
        try {
            const result = await SalesService.getSales(50);
            if (result.success) {
                let salesData = result.data as Sale[];

                // If cashier, filter to only their sales (exclude sales without user_id)
                if (currentUser?.role === 'cashier') {
                    salesData = salesData.filter(sale =>
                        sale.userId != null && sale.userId === currentUser.id
                    );
                }

                setSales(salesData);
            }
        } catch (error) {
            console.error('Failed to load sales:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDateTime = (date: Date) => {
        return new Date(date).toLocaleString(LOCALE, DATETIME_FORMAT);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {currentUser?.role === 'cashier' ? t('salesHistory.mySalesHistory') : t('salesHistory.title')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-100 transition-colors"
                        aria-label="Close sales history"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sales List */}
                    <div className="w-1/2 border-r border-dark-border overflow-y-auto scrollbar-thin p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
                            </div>
                        ) : sales.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <svg className="h-20 w-20 mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-lg font-medium">No sales yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sales.map((sale) => (
                                    <button
                                        key={sale.id}
                                        onClick={() => setSelectedSale(sale)}
                                        className={`w-full text-left p-4 rounded-lg border transition-all ${selectedSale?.id === sale.id
                                            ? 'bg-dark-elevated border-primary shadow-glow'
                                            : 'bg-dark-bg border-dark-border hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="font-semibold text-gray-100">
                                                    {t('salesHistory.sale')} #{sale.id}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatDateTime(sale.timestamp)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-primary">
                                                    {formatPrice(sale.total_amount)}
                                                </div>
                                                <div className="text-xs text-gray-500 capitalize">
                                                    {sale.payment_method}
                                                </div>
                                            </div>
                                        </div>
                                        {sale.customer && (
                                            <div className="text-sm text-gray-400 flex items-center mt-2">
                                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {sale.customer.name}
                                            </div>
                                        )}
                                        {sale.user && (
                                            <div className="text-xs text-gray-500 flex items-center mt-1">
                                                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Cashier: {sale.user.name}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-600 mt-1">
                                            {sale.items.length} {sale.items.length !== 1 ? t('salesHistory.items').toLowerCase() : t('salesHistory.item')}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sale Details */}
                    <div className="w-1/2 overflow-y-auto scrollbar-thin p-6">
                        {selectedSale ? (
                            <div>
                                <h3 className="text-xl font-bold text-gray-100 mb-4">
                                    {t('salesHistory.saleDetails')}
                                </h3>

                                {/* Sale Info */}
                                <div className="card p-4 mb-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-500">{t('salesHistory.dateTime')}</div>
                                            <div className="font-medium text-gray-100">
                                                {formatDateTime(selectedSale.timestamp)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">{t('salesHistory.paymentMethod')}</div>
                                            <div className="font-medium text-gray-100 capitalize">
                                                {selectedSale.payment_method}
                                            </div>
                                        </div>
                                        {selectedSale.user && (
                                            <div>
                                                <div className="text-gray-500">{t('salesHistory.cashier')}</div>
                                                <div className="font-medium text-gray-100">
                                                    {selectedSale.user.name}
                                                </div>
                                            </div>
                                        )}
                                        {selectedSale.customer && (
                                            <>
                                                <div>
                                                    <div className="text-gray-500">{t('salesHistory.customer')}</div>
                                                    <div className="font-medium text-gray-100">
                                                        {selectedSale.customer.name}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">{t('salesHistory.phone')}</div>
                                                    <div className="font-medium text-gray-100">
                                                        {selectedSale.customer.phone || 'N/A'}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h4 className="font-semibold text-gray-300 mb-3">{t('salesHistory.items')}</h4>
                                    <div className="space-y-2">
                                        {selectedSale.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-dark-bg border border-dark-border rounded-lg p-3 flex items-center justify-between"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-100">
                                                        {item.product.commercial_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono">
                                                        {item.product.barcode}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <div className="text-sm text-gray-400">
                                                        {formatPrice(item.unit_price)} × {item.quantity}
                                                    </div>
                                                    <div className="font-bold text-primary">
                                                        {formatPrice(item.unit_price * item.quantity)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="mt-6 card p-4 bg-gradient-to-br from-dark-surface to-dark-elevated">
                                    <div className="flex justify-between items-center text-2xl font-bold">
                                        <span className="text-gray-100">{t('salesHistory.total')}</span>
                                        <span className="text-primary">{formatPrice(selectedSale.total_amount)}</span>
                                    </div>
                                </div>

                                {/* Print Button */}
                                <button
                                    onClick={async () => {
                                        const { printReceipt } = await import('../utils/receipt');

                                        // Load Pharmacy Profile for Receipt
                                        let config;
                                        try {
                                            const profileRes = await PharmacyService.getProfile();
                                            if (profileRes.success && profileRes.data) {
                                                const p = profileRes.data;
                                                config = {
                                                    pharmacyName: p.name,
                                                    address: p.address || '',
                                                    phone: p.phone || '',
                                                    taxId: p.taxId || '',
                                                    footer: p.footer || 'Merci de votre visite!'
                                                };
                                            }
                                        } catch (e) {
                                            console.warn('Failed to load pharmacy profile for receipt', e);
                                        }

                                        const subtotal = selectedSale.items.reduce(
                                            (sum, item) => sum + item.unit_price * item.quantity,
                                            0
                                        );
                                        const vat = subtotal * 0.07;

                                        printReceipt({
                                            saleId: selectedSale.id,
                                            timestamp: selectedSale.timestamp,
                                            items: selectedSale.items.map(item => ({
                                                product: {
                                                    commercial_name: item.product.commercial_name,
                                                    public_price: item.unit_price,
                                                },
                                                quantity: item.quantity,
                                            })),
                                            subtotal,
                                            vat,
                                            total: selectedSale.total_amount,
                                            paymentMethod: selectedSale.payment_method,
                                            customer: selectedSale.customer ? {
                                                name: selectedSale.customer.name,
                                                phone: selectedSale.customer.phone ?? undefined,
                                            } : undefined,
                                        }, config);
                                    }}
                                    className="w-full btn-primary mt-4 py-3 rounded-xl flex items-center justify-center"
                                >
                                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    {t('salesHistory.printReceipt')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <svg className="h-20 w-20 mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-lg font-medium">{t('salesHistory.selectSaleToView')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
