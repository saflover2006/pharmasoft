import { useState, useEffect } from 'react';
import { ProductService } from '../services/database.service';
import { useLimit } from '../hooks/useLicense';
import { formatPrice } from '../utils/calculations';
import type { Product } from '@repo/database';
import LimitWarning from './LimitWarning';
import StockAdjustmentModal from './StockAdjustmentModal';
import { THERAPEUTIC_CLASSES, CNAM_RATES } from '../utils/cnam';


interface ProductManagementProps {
    onClose: () => void;
    onUpgradeRequest?: (options?: {
        feature?: string;
        currentLimit?: { current: number; max: number };
    }) => void;
    t: (key: string) => string;
}

interface ProductFormData {
    id?: number;
    barcode: string;
    commercial_name: string;
    public_price: number;
    purchase_price: number;
    vat_rate: number;
    current_stock: number;
    low_stock_threshold: number;
    expiry_date?: string;
    batch_number?: string;
    // CNAM Fields
    dci_name?: string;
    cnam_reimbursable: boolean;
    cnam_rate?: number;
    requires_prescription: boolean;
    therapeutic_class?: string;
}

const INITIAL_FORM_DATA: ProductFormData = {
    barcode: '',
    commercial_name: '',
    public_price: 0,
    purchase_price: 0,
    vat_rate: 7.0, // Default VAT
    current_stock: 0,
    low_stock_threshold: 5,
    expiry_date: '',
    batch_number: '',
    // CNAM Defaults
    dci_name: '',
    cnam_reimbursable: false,
    cnam_rate: undefined,
    requires_prescription: false,
    therapeutic_class: '',
};

export default function ProductManagement({ onClose, onUpgradeRequest, t }: ProductManagementProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductFormData>(INITIAL_FORM_DATA);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showStockAdjustment, setShowStockAdjustment] = useState(false);
    const [adjustmentProduct, setAdjustmentProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { limit: productLimit, refresh: refreshProductLimit } = useLimit('products');

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        loadProducts();
    }, [currentPage]);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const result = await ProductService.getAll(currentPage, ITEMS_PER_PAGE);
            if (result.success) {
                setProducts(result.data.products);
                setTotalProducts(result.data.total);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter products based on search query
    const filteredProducts = products.filter(product => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            product.commercial_name.toLowerCase().includes(query) ||
            product.barcode.toLowerCase().includes(query) ||
            ((product as any).dci_name || '').toLowerCase().includes(query)
        );
    });

    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            id: product.id,
            barcode: product.barcode,
            commercial_name: product.commercial_name,
            public_price: product.public_price,
            purchase_price: product.purchase_price,
            vat_rate: product.vat_rate,
            current_stock: product.current_stock,
            low_stock_threshold: product.low_stock_threshold,
            expiry_date: product.expiry_date ? new Date(product.expiry_date).toISOString().split('T')[0] : '',
            batch_number: product.batch_number || '',
            // CNAM Fields
            dci_name: (product as any).dci_name || '',
            cnam_reimbursable: (product as any).cnam_reimbursable || false,
            cnam_rate: (product as any).cnam_rate || undefined,
            requires_prescription: (product as any).requires_prescription || false,
            therapeutic_class: (product as any).therapeutic_class || '',
        });
        setFormError(null);
        setShowForm(true);
    };

    const handleAdd = () => {
        if (productLimit && !productLimit.allowed) {
            onUpgradeRequest?.({
                feature: 'Unlimited Products',
                currentLimit: {
                    current: productLimit.current,
                    max: productLimit.max,
                },
            });
            return;
        }

        setEditingProduct(null);
        setFormData(INITIAL_FORM_DATA);
        setFormError(null);
        setShowForm(true);
    };

    const handleDelete = async (product: Product) => {
        if (!confirm(`Are you sure you want to delete "${product.commercial_name}"?`)) {
            return;
        }

        try {
            const result = await ProductService.delete(product.id);
            if (result.success) {
                loadProducts();
                refreshProductLimit();
            } else {
                alert(`Error: ${result.error?.message}`);
            }
        } catch (error) {
            alert('Failed to delete product');
        }
    };

    const validateForm = (): boolean => {
        if (!formData.barcode.trim()) {
            setFormError('Barcode is required');
            return false;
        }
        if (!formData.commercial_name.trim()) {
            setFormError('Product name is required');
            return false;
        }
        if (formData.public_price < 0) {
            setFormError('Public price cannot be negative');
            return false;
        }
        if (formData.purchase_price < 0) {
            setFormError('Purchase price cannot be negative');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (!editingProduct && productLimit && !productLimit.allowed) {
            setFormError(`Product limit reached (${productLimit.current}/${productLimit.max}). Upgrade to continue.`);
            onUpgradeRequest?.({
                feature: 'Unlimited Products',
                currentLimit: {
                    current: productLimit.current,
                    max: productLimit.max,
                },
            });
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        try {
            // Prepare data with proper date conversion
            const submitData: any = {
                ...formData,
                expiry_date: formData.expiry_date
                    ? new Date(formData.expiry_date + 'T00:00:00.000Z').toISOString()
                    : null,
                batch_number: formData.batch_number?.trim() || null,
            };

            let result;
            if (editingProduct && formData.id) {
                result = await ProductService.update(formData.id, submitData);
            } else {
                result = await ProductService.create(submitData);
            }

            if (result.success) {
                setShowForm(false);
                loadProducts();
                if (!editingProduct) {
                    refreshProductLimit();
                }
            } else {
                setFormError(result.error?.message || 'Operation failed');
            }
        } catch (error) {
            setFormError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {t('productManagement.title')}
                    </h2>
                    <div className="flex items-center space-x-4">
                        {/* Search Field */}
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, barcode, or DCI..."
                                className="pl-10 pr-10 py-2 w-80 bg-dark-elevated border border-dark-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-100"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <button
                            onClick={handleAdd}
                            className="btn-primary px-4 py-2 rounded-lg flex items-center"
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {t('productManagement.addProduct')}
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-100 transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {productLimit && productLimit.max > 0 && (
                    <div className="px-6 pt-4">
                        <LimitWarning
                            type="products"
                            current={productLimit.current}
                            max={productLimit.max}
                            onUpgrade={() => onUpgradeRequest?.({
                                feature: 'Unlimited Products',
                                currentLimit: {
                                    current: productLimit.current,
                                    max: productLimit.max,
                                },
                            })}
                        />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-400 border-b border-dark-border">
                                        <th className="py-3 px-4">{t('productManagement.productName')}</th>
                                        <th className="py-3 px-4">{t('productManagement.barcode')}</th>
                                        <th className="py-3 px-4 text-right">{t('productManagement.price')}</th>
                                        <th className="py-3 px-4 text-right">{t('productManagement.stock')}</th>
                                        <th className="py-3 px-4 text-center">{t('productManagement.alertLimit')}</th>
                                        <th className="py-3 px-4 text-right">{t('productManagement.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-gray-500">
                                                {searchQuery ? 'No products match your search' : 'No products found'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProducts.map((product) => (
                                            <tr key={product.id} className="border-b border-dark-border hover:bg-dark-elevated/50 transition-colors text-gray-200">
                                                <td className="py-3 px-4 font-medium">{product.commercial_name}</td>
                                                <td className="py-3 px-4 font-mono text-sm text-gray-500">{product.barcode}</td>
                                                <td className="py-3 px-4 text-right">{formatPrice(product.public_price)}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${product.current_stock <= product.low_stock_threshold
                                                        ? 'bg-danger/20 text-danger'
                                                        : 'bg-success/20 text-success'
                                                        }`}>
                                                        {product.current_stock}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center text-gray-500">{product.low_stock_threshold}</td>
                                                <td className="py-3 px-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(product)}
                                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAdjustmentProduct(product);
                                                            setShowStockAdjustment(true);
                                                        }}
                                                        className="text-warning hover:text-yellow-400 transition-colors"
                                                        title="Adjust Stock"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product)}
                                                        className="text-danger hover:text-red-400 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-dark-border flex justify-between items-center bg-dark-bg/50">
                        <span className="text-sm text-gray-500">
                            {t('productManagement.showing')} {(currentPage - 1) * ITEMS_PER_PAGE + 1} {t('productManagement.to')} {Math.min(currentPage * ITEMS_PER_PAGE, totalProducts)} {t('productManagement.of')} {totalProducts} {t('productManagement.results')}
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded bg-dark-elevated disabled:opacity-50 hover:bg-dark-border transition-colors text-sm"
                            >
                                {t('productManagement.previous')}
                            </button>
                            <span className="px-3 py-1 text-gray-300">
                                {t('productManagement.page')} {currentPage} {t('productManagement.of')} {Math.max(1, totalPages)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-1 rounded bg-dark-elevated disabled:opacity-50 hover:bg-dark-border transition-colors text-sm"
                            >
                                {t('productManagement.next')}
                            </button>
                        </div>
                    </div>
                </div>
            </div >

            {/* Add/Edit Modal */}
            {
                showForm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-dark-surface rounded-xl border border-dark-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="px-6 py-4 border-b border-dark-border flex justify-between items-center bg-dark-elevated/30 flex-shrink-0">
                                <h3 className="text-xl font-bold text-gray-100">
                                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                                </h3>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-100"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin p-6">
                                {formError && (
                                    <div className="mb-4 p-3 bg-danger/10 border border-danger text-danger rounded-lg text-sm">
                                        {formError}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="label">Product Name</label>
                                        <input
                                            type="text"
                                            value={formData.commercial_name}
                                            onChange={e => setFormData({ ...formData, commercial_name: e.target.value })}
                                            className="w-full"
                                            placeholder="e.g. Doliprane 1000mg"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Barcode</label>
                                        <input
                                            type="text"
                                            value={formData.barcode}
                                            onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                            className="w-full font-mono"
                                            placeholder="Scan or type barcode"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Public Price (TND)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={formData.public_price}
                                            onChange={e => setFormData({ ...formData, public_price: parseFloat(e.target.value) || 0 })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Purchase Price (TND)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={formData.purchase_price}
                                            onChange={e => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Current Stock</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.current_stock}
                                            onChange={e => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Low Stock Alert Limit</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.low_stock_threshold}
                                            onChange={e => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 0 })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">VAT Rate (%)</label>
                                        <input
                                            type="number"
                                            value={formData.vat_rate}
                                            onChange={e => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 0 })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={formData.expiry_date || ''}
                                            onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Batch Number (Optional)</label>
                                        <input
                                            type="text"
                                            value={formData.batch_number || ''}
                                            onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                                            className="w-full font-mono"
                                            placeholder="LOT123456"
                                        />
                                    </div>
                                </div>

                                {/* ========== CNAM SECTION ========== */}
                                <div className="col-span-2 border-t border-dark-border pt-6 mt-4">
                                    <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
                                        🇹🇳 Remboursement CNAM (Tunisie)
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-6 px-6">
                                    {/* DCI Name */}
                                    <div>
                                        <label className="label">DCI (Dénomination Commune Internationale)</label>
                                        <input
                                            type="text"
                                            value={formData.dci_name || ''}
                                            onChange={(e) => setFormData({ ...formData, dci_name: e.target.value })}
                                            className="w-full"
                                            placeholder="Ex: Paracétamol, Amoxicilline..."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Nom international du principe actif</p>
                                    </div>

                                    {/* Remboursable CNAM */}
                                    <div>
                                        <label className="label">Remboursable CNAM</label>
                                        <select
                                            value={formData.cnam_reimbursable ? 'yes' : 'no'}
                                            onChange={(e) => {
                                                const isReimbursable = e.target.value === 'yes';
                                                setFormData({
                                                    ...formData,
                                                    cnam_reimbursable: isReimbursable,
                                                    cnam_rate: isReimbursable ? 85 : undefined
                                                });
                                            }}
                                            className="w-full"
                                        >
                                            <option value="no">❌ Non - Vente Libre</option>
                                            <option value="yes">✅ Oui - Remboursable</option>
                                        </select>
                                    </div>

                                    {/* Taux Remboursement */}
                                    {formData.cnam_reimbursable && (
                                        <div>
                                            <label className="label">Taux Remboursement CNAM</label>
                                            <select
                                                value={formData.cnam_rate || 85}
                                                onChange={(e) => setFormData({ ...formData, cnam_rate: parseFloat(e.target.value) })}
                                                className="w-full"
                                            >
                                                {CNAM_RATES.map(rate => (
                                                    <option key={rate.value} value={rate.value}>
                                                        {rate.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Part patient: {100 - (formData.cnam_rate || 85)}%
                                            </p>
                                        </div>
                                    )}

                                    {/* Ordonnance Obligatoire */}
                                    <div>
                                        <label className="label">Ordonnance Obligatoire</label>
                                        <select
                                            value={formData.requires_prescription ? 'yes' : 'no'}
                                            onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.value === 'yes' })}
                                            className="w-full"
                                        >
                                            <option value="no">Non</option>
                                            <option value="yes">Oui - ℞ Prescription Requise</option>
                                        </select>
                                    </div>

                                    {/* Classe Thérapeutique */}
                                    <div className="col-span-2">
                                        <label className="label">Classe Thérapeutique</label>
                                        <select
                                            value={formData.therapeutic_class || ''}
                                            onChange={(e) => setFormData({ ...formData, therapeutic_class: e.target.value })}
                                            className="w-full"
                                        >
                                            <option value="">Sélectionner une classe...</option>
                                            {THERAPEUTIC_CLASSES.map(cls => (
                                                <option key={cls.value} value={cls.value}>
                                                    {cls.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Preview CNAM */}
                                    {formData.cnam_reimbursable && formData.cnam_rate && formData.public_price > 0 && (
                                        <div className="col-span-2 p-4 bg-success/10 border border-success/30 rounded-lg">
                                            <div className="text-sm font-semibold text-success mb-2">
                                                📊 Calcul Remboursement CNAM:
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <div className="text-gray-400">Prix Public:</div>
                                                    <div className="font-bold text-gray-100">{formData.public_price.toFixed(3)} TND</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-400">Part CNAM ({formData.cnam_rate}%):</div>
                                                    <div className="font-bold text-success">
                                                        {(formData.public_price * formData.cnam_rate / 100).toFixed(3)} TND
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-400">Part Patient ({100 - formData.cnam_rate}%):</div>
                                                    <div className="font-bold text-warning">
                                                        {(formData.public_price * (100 - formData.cnam_rate) / 100).toFixed(3)} TND
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </form>

                            {/* Footer Buttons - Always Visible */}
                            <div className="px-6 py-4 border-t border-dark-border flex justify-end space-x-3 bg-dark-elevated/30 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn-secondary"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="product-form"
                                    className="btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Stock Adjustment Modal */}
            {
                showStockAdjustment && adjustmentProduct && (
                    <StockAdjustmentModal
                        product={adjustmentProduct}
                        onClose={() => {
                            setShowStockAdjustment(false);
                            setAdjustmentProduct(null);
                        }}
                        onSuccess={() => {
                            loadProducts();
                            setShowStockAdjustment(false);
                            setAdjustmentProduct(null);
                        }}
                        currentUserId={1}
                    />
                )
            }
        </div >
    );
}
