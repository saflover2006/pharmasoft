// Invoice Management Component
// View, search, filter, and manage all invoices

import { useState, useEffect } from 'react';
import invoiceService, { type Invoice } from '../services/InvoiceService';
import { PharmacyService } from '../services/database.service';
import { formatPrice } from '../utils/calculations';
import { printInvoice } from '../utils/invoicePDF';

interface InvoiceManagementProps {
    onClose: () => void;
    onNewInvoice?: () => void;
    t: (key: string) => string;
}

export default function InvoiceManagement({ onClose, onNewInvoice, t }: InvoiceManagementProps) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [invoiceType, setInvoiceType] = useState<'all' | 'detailed' | 'receipt' | 'cnam' | 'proforma'>('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalInvoices, setTotalInvoices] = useState(0);

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    useEffect(() => {
        loadInvoices();
    }, [currentPage, searchTerm, invoiceType, paymentFilter]);

    const loadInvoices = async () => {
        try {
            setLoading(true);

            const isPaidFilter = paymentFilter === 'all' ? undefined : paymentFilter === 'paid';

            const response = await invoiceService.getAll({
                page: currentPage,
                limit: 20,
                search: searchTerm,
                invoiceType,
                isPaid: isPaidFilter
            });

            setInvoices(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalInvoices(response.pagination.total);
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleViewDetails = async (invoice: Invoice) => {
        try {
            // Fetch full invoice details
            const response = await invoiceService.getById(invoice.id);
            setSelectedInvoice(response.data);
            setShowDetails(true);
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to load invoice details');
        }
    };

    const handleMarkPaid = async (invoice: Invoice) => {
        if (!confirm(`Mark invoice ${invoice.invoiceNumber} as paid?`)) {
            return;
        }

        try {
            await invoiceService.updatePaymentStatus(invoice.id, {
                isPaid: true,
                paymentMethod: 'cash'
            });
            showMessage('success', 'Invoice marked as paid');
            loadInvoices();
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to update payment status');
        }
    };

    const handleMarkUnpaid = async (invoice: Invoice) => {
        if (!confirm(`Mark invoice ${invoice.invoiceNumber} as unpaid?`)) {
            return;
        }

        try {
            await invoiceService.updatePaymentStatus(invoice.id, {
                isPaid: false
            });
            showMessage('success', 'Invoice marked as unpaid');
            loadInvoices();
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to update payment status');
        }
    };

    const handlePrint = async (invoice: Invoice) => {
        try {
            const fullInvoice = invoice.items ? invoice : (await invoiceService.getById(invoice.id)).data;
            let pharmacyInfo;

            const profileResult = await PharmacyService.getProfile();
            if (profileResult.success && profileResult.data) {
                const profile = profileResult.data as {
                    name: string;
                    address?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    taxId?: string | null;
                };

                pharmacyInfo = {
                    name: profile.name,
                    address: profile.address || '',
                    phone: profile.phone || '',
                    email: profile.email || '',
                    taxId: profile.taxId || '',
                };
            }

            printInvoice(fullInvoice as any, pharmacyInfo);
            await invoiceService.markAsPrinted(invoice.id);
            showMessage('success', `Invoice ${invoice.invoiceNumber} printed!`);
            loadInvoices();
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to print invoice');
        }
    };



    const getInvoiceTypeBadge = (type: string) => {
        const badges = {
            detailed: { label: '📄 Detailed', color: 'bg-primary/20 text-primary border-primary/30' },
            receipt: { label: '🧾 Receipt', color: 'bg-gray-600/20 text-gray-400 border-gray-600/30' },
            cnam: { label: '🏥 CNAM', color: 'bg-success/20 text-success border-success/30' },
            proforma: { label: '📋 Proforma', color: 'bg-warning/20 text-warning border-warning/30' }
        };
        const badge = badges[type as keyof typeof badges] || badges.detailed;
        return <span className={`text-xs px-2 py-1 rounded border ${badge.color}`}>{badge.label}</span>;
    };

    const getPaymentStatusBadge = (isPaid: boolean) => {
        if (isPaid) {
            return <span className="text-xs px-2 py-1 rounded border bg-success/20 text-success border-success/30">✓ Paid</span>;
        }
        return <span className="text-xs px-2 py-1 rounded border bg-danger/20 text-danger border-danger/30">✗ Unpaid</span>;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('invoiceManagement.title')}
                        <span className="ml-3 text-sm font-normal text-gray-400">
                            ({totalInvoices} {t('invoiceManagement.total')})
                        </span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-100 transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Message Banner */}
                {message && (
                    <div className={`mx-6 mt-4 p-3 rounded-lg border ${message.type === 'success' ? 'bg-success/10 border-success text-success' :
                        message.type === 'error' ? 'bg-danger/10 border-danger text-danger' :
                            'bg-info/10 border-info text-info'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-dark-border flex gap-4 items-center flex-shrink-0 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px] relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder={t('invoiceManagement.searchPlaceholder')}
                            className="w-full pl-10"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={invoiceType}
                        onChange={(e) => {
                            setInvoiceType(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="w-40"
                    >
                        <option value="all">{t('invoiceManagement.allTypes')}</option>
                        <option value="detailed">📄 {t('invoiceManagement.detailed')}</option>
                        <option value="receipt">🧾 {t('invoiceManagement.receipt')}</option>
                        <option value="cnam">🏥 {t('invoiceManagement.cnam')}</option>
                        <option value="proforma">📋 {t('invoiceManagement.proforma')}</option>
                    </select>

                    {/* Payment Filter */}
                    <select
                        value={paymentFilter}
                        onChange={(e) => {
                            setPaymentFilter(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="w-40"
                    >
                        <option value="all">{t('invoiceManagement.allPayments')}</option>
                        <option value="paid">✓ {t('invoiceManagement.paidOnly')}</option>
                        <option value="unpaid">✗ {t('invoiceManagement.unpaidOnly')}</option>
                    </select>

                    {/* New Invoice Button */}
                    {onNewInvoice && (
                        <button
                            onClick={onNewInvoice}
                            className="btn-primary px-4 py-2 whitespace-nowrap flex items-center gap-2 shadow-glow"
                            title="Create new invoice"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('invoiceManagement.newInvoice')}
                        </button>
                    )}
                </div>

                {/* Invoice List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-gray-400">{t('invoiceManagement.loading')}</div>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <svg className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>No invoices found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="p-4 bg-dark-elevated border border-dark-border rounded-lg hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            {/* Header Row */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <h3 className="font-bold text-lg text-gray-100 font-mono">
                                                    {invoice.invoiceNumber}
                                                </h3>
                                                {getInvoiceTypeBadge(invoice.invoiceType)}
                                                {getPaymentStatusBadge(invoice.isPaid)}
                                                {invoice.isPrinted && (
                                                    <span className="text-xs px-2 py-1 rounded border bg-info/20 text-info border-info/30">
                                                        🖨️ Printed
                                                    </span>
                                                )}
                                            </div>

                                            {/* Customer & Date */}
                                            <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Customer:</span>{' '}
                                                    <span className="text-gray-300 font-medium">{invoice.customerName}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Date:</span>{' '}
                                                    <span className="text-gray-300">
                                                        {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Financial Summary */}
                                            <div className="grid grid-cols-4 gap-4 p-3 bg-dark-bg border border-dark-border rounded-lg">
                                                <div>
                                                    <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                                                    <div className="text-lg font-bold text-primary">
                                                        {formatPrice(invoice.totalAmount)}
                                                    </div>
                                                </div>
                                                {invoice.cnamAmount > 0 && (
                                                    <>
                                                        <div>
                                                            <div className="text-xs text-gray-500 mb-1">CNAM Portion</div>
                                                            <div className="text-sm font-semibold text-success">
                                                                {formatPrice(invoice.cnamAmount)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-gray-500 mb-1">Patient Portion</div>
                                                            <div className="text-sm font-semibold text-warning">
                                                                {formatPrice(invoice.patientAmount)}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                <div>
                                                    <div className="text-xs text-gray-500 mb-1">Payment Method</div>
                                                    <div className="text-sm font-medium text-gray-300 capitalize">
                                                        {invoice.paymentMethod}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {invoice.notes && (
                                                <div className="mt-3 text-sm text-gray-400 italic">
                                                    📝 {invoice.notes}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col gap-2 ml-4">
                                            <button
                                                onClick={() => handleViewDetails(invoice)}
                                                className="btn-secondary px-3 py-2 text-sm whitespace-nowrap"
                                                title="View Details"
                                            >
                                                <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View
                                            </button>

                                            <button
                                                onClick={() => handlePrint(invoice)}
                                                className="btn-primary px-3 py-2 text-sm whitespace-nowrap"
                                                title="Print Invoice"
                                            >
                                                <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                                Print
                                            </button>

                                            {!invoice.isPaid ? (
                                                <button
                                                    onClick={() => handleMarkPaid(invoice)}
                                                    className="btn-success px-3 py-2 text-sm whitespace-nowrap"
                                                    title="Mark as Paid"
                                                >
                                                    ✓ Mark Paid
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleMarkUnpaid(invoice)}
                                                    className="btn-secondary px-3 py-2 text-sm whitespace-nowrap"
                                                    title="Mark as Unpaid"
                                                >
                                                    ✗ Mark Unpaid
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-dark-border flex items-center justify-between flex-shrink-0">
                        <div className="text-sm text-gray-400">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Invoice Details Modal */}
            {showDetails && selectedInvoice && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin">
                        <div className="sticky top-0 bg-dark-surface px-6 py-4 border-b border-dark-border flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-100 font-mono">
                                {selectedInvoice.invoiceNumber}
                            </h3>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="text-gray-400 hover:text-gray-100 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Customer Information */}
                            <div className="card p-4">
                                <h4 className="font-bold text-gray-100 mb-3">Customer Information</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500">Name:</span>{' '}
                                        <span className="text-gray-300">{selectedInvoice.customerName}</span>
                                    </div>
                                    {selectedInvoice.customerPhone && (
                                        <div>
                                            <span className="text-gray-500">Phone:</span>{' '}
                                            <span className="text-gray-300">{selectedInvoice.customerPhone}</span>
                                        </div>
                                    )}
                                    {selectedInvoice.customerEmail && (
                                        <div>
                                            <span className="text-gray-500">Email:</span>{' '}
                                            <span className="text-gray-300">{selectedInvoice.customerEmail}</span>
                                        </div>
                                    )}
                                    {selectedInvoice.customerAddress && (
                                        <div className="col-span-2">
                                            <span className="text-gray-500">Address:</span>{' '}
                                            <span className="text-gray-300">{selectedInvoice.customerAddress}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Invoice Items */}
                            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                                <div className="card p-4">
                                    <h4 className="font-bold text-gray-100 mb-3">Items</h4>
                                    <div className="space-y-2">
                                        {selectedInvoice.items.map((item: any, index: number) => (
                                            <div key={index} className="p-3 bg-dark-bg rounded border border-dark-border">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-100">{item.productName}</div>
                                                        {item.productBarcode && (
                                                            <div className="text-xs text-gray-500 font-mono">{item.productBarcode}</div>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-gray-400">
                                                            {item.quantity} × {formatPrice(item.unitPrice)}
                                                        </div>
                                                        <div className="text-lg font-bold text-primary">
                                                            {formatPrice(item.totalPrice)}
                                                        </div>
                                                    </div>
                                                </div>
                                                {item.cnamReimbursable && (
                                                    <div className="flex gap-4 text-xs pt-2 border-t border-dark-border/50">
                                                        <div>
                                                            <span className="text-gray-500">CNAM Rate:</span>{' '}
                                                            <span className="text-success font-bold">{item.cnamRate}%</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">CNAM:</span>{' '}
                                                            <span className="text-success">{formatPrice(item.cnamAmount)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Patient:</span>{' '}
                                                            <span className="text-warning">{formatPrice(item.patientAmount)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Financial Summary */}
                            <div className="card p-4">
                                <h4 className="font-bold text-gray-100 mb-3">Financial Summary</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Subtotal:</span>
                                        <span className="text-gray-300 font-mono">{formatPrice(selectedInvoice.subtotal)}</span>
                                    </div>
                                    {selectedInvoice.cnamAmount > 0 && (
                                        <>
                                            <div className="flex justify-between text-success">
                                                <span>CNAM Portion:</span>
                                                <span className="font-mono">{formatPrice(selectedInvoice.cnamAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-warning">
                                                <span>Patient Portion:</span>
                                                <span className="font-mono">{formatPrice(selectedInvoice.patientAmount)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between pt-2 border-t border-dark-border text-lg font-bold">
                                        <span className="text-gray-100">Total Amount:</span>
                                        <span className="text-primary font-mono">{formatPrice(selectedInvoice.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
