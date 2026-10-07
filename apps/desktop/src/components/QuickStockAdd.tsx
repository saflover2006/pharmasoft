import { useState, useEffect, useRef } from 'react';
import { ProductService, StockAdjustmentService } from '../services/database.service';
import type { Product } from '@repo/database';

interface QuickStockAddProps {
    onClose: () => void;
    currentUserId: number;
    t: (key: string) => string;
}

export default function QuickStockAdd({ onClose, currentUserId, t }: QuickStockAddProps) {
    const [barcode, setBarcode] = useState('');
    const [product, setProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
    const [recentAdditions, setRecentAdditions] = useState<Array<{ product: string, quantity: number, batch: string }>>([]);

    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const batchInputRef = useRef<HTMLInputElement>(null);
    const expiryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, []);

    const searchProduct = async (searchBarcode: string) => {
        if (!searchBarcode.trim()) return;

        setIsSearching(true);
        setProduct(null);
        setMessage(null);
        setBatchNumber('');
        setExpiryDate('');

        try {
            const result = await ProductService.search(searchBarcode, 1);
            if (result.success && result.data.length > 0) {
                setProduct(result.data[0]);
                setQuantity(1);
                setTimeout(() => batchInputRef.current?.focus(), 100);
            } else {
                setMessage({ type: 'error', text: `Product not found: ${searchBarcode}` });
                setBarcode('');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Search failed' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchProduct(barcode);
        }
    };

    const handleAddStock = async () => {
        if (!product || quantity <= 0) return;

        // Validate batch info
        if (!batchNumber.trim()) {
            setMessage({ type: 'warning', text: 'Please enter batch number' });
            batchInputRef.current?.focus();
            return;
        }

        if (!expiryDate) {
            setMessage({ type: 'warning', text: 'Please enter expiry date' });
            expiryInputRef.current?.focus();
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            // Build notes with batch info
            const notes = `LOT: ${batchNumber} | Exp: ${new Date(expiryDate).toLocaleDateString('fr-FR')} | Quick Stock Add`;

            const result = await StockAdjustmentService.create({
                productId: product.id,
                quantity: quantity,
                reason: 'reception',
                notes: notes,
                userId: currentUserId,
                batchNumber: batchNumber.trim(),
                expiryDate,
            });

            if (result.success) {
                // Add to recent additions
                setRecentAdditions(prev => [
                    { product: product.commercial_name, quantity, batch: batchNumber },
                    ...prev.slice(0, 4)
                ]);

                setMessage({
                    type: 'success',
                    text: `✓ Added ${quantity} units | Batch: ${batchNumber}`
                });

                // Reset for next scan
                setProduct(null);
                setBarcode('');
                setQuantity(1);
                setBatchNumber('');
                setExpiryDate('');

                setTimeout(() => {
                    setMessage(null);
                    barcodeInputRef.current?.focus();
                }, 2000);
            } else {
                setMessage({ type: 'error', text: result.error?.message || 'Failed to add stock' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        {t('quickStock.title')}
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                    {/* Instructions */}
                    <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                        <p className="text-sm text-primary font-medium">
                            📦 Scan barcode → Enter batch info → Add quantity → Submit
                        </p>
                    </div>

                    {/* Barcode Input */}
                    <div className="mb-4">
                        <label className="label">{t('quickStock.searchProduct')}</label>
                        <div className="flex gap-2">
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                onKeyPress={handleBarcodeKeyPress}
                                className="flex-1 text-lg font-mono"
                                placeholder={t('quickStock.scanOrType')}
                                disabled={isSearching}
                                autoFocus
                            />
                            <button
                                onClick={() => searchProduct(barcode)}
                                disabled={isSearching || !barcode}
                                className="btn-primary px-6"
                            >
                                {isSearching ? t('common.loading') : t('common.search')}
                            </button>
                        </div>
                    </div>

                    {/* Product Display */}
                    {product && (
                        <div className="mb-4 p-4 bg-dark-elevated border border-success rounded-lg">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-100 mb-1">
                                        {product.commercial_name}
                                    </h3>
                                    <p className="text-sm text-gray-400 font-mono">
                                        Barcode: {product.barcode}
                                    </p>
                                    {product.expiry_date && (
                                        <p className="text-xs text-warning mt-1">
                                            Current Expiry: {new Date(product.expiry_date).toLocaleDateString('fr-FR')}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Current Stock</div>
                                    <div className="text-2xl font-bold text-primary">
                                        {product.current_stock}
                                    </div>
                                </div>
                            </div>

                            {/* Batch Info Section */}
                            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-dark-bg border border-dark-border rounded-lg">
                                <div>
                                    <label className="label text-xs">Batch / Lot Number *</label>
                                    <input
                                        ref={batchInputRef}
                                        type="text"
                                        value={batchNumber}
                                        onChange={(e) => setBatchNumber(e.target.value)}
                                        className="w-full font-mono text-sm"
                                        placeholder="e.g. LOT-A2025"
                                    />
                                </div>
                                <div>
                                    <label className="label text-xs">Expiry Date *</label>
                                    <input
                                        ref={expiryInputRef}
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="w-full text-sm"
                                    />
                                </div>
                            </div>

                            {/* Quantity Input */}
                            <div className="mb-4">
                                <label className="label">{t('quickStock.quantity')}</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="btn-secondary px-4"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="flex-1 text-center text-xl font-bold"
                                    />
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="btn-secondary px-4"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={handleAddStock}
                                disabled={isSubmitting || !batchNumber || !expiryDate}
                                className="btn-primary w-full py-3 text-lg font-bold"
                            >
                                {isSubmitting ? 'Adding Stock...' : `✓ Add ${quantity} Units (Batch: ${batchNumber || '???'})`}
                            </button>
                        </div>
                    )}

                    {/* Message */}
                    {message && (
                        <div className={`p-3 rounded-lg mb-4 ${message.type === 'success'
                            ? 'bg-success/10 border border-success text-success'
                            : message.type === 'warning'
                                ? 'bg-warning/10 border border-warning text-warning'
                                : 'bg-danger/10 border border-danger text-danger'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Recent Additions */}
                    {recentAdditions.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2">{t('quickStock.recentAdditions')}</h4>
                            <div className="space-y-1">
                                {recentAdditions.map((item, index) => (
                                    <div
                                        key={index}
                                        className="text-sm text-gray-400 p-2 bg-dark-bg rounded flex justify-between"
                                    >
                                        <span className="flex-1">{item.product}</span>
                                        <span className="text-warning font-mono text-xs mr-2">{item.batch}</span>
                                        <span className="text-success font-bold">+{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
