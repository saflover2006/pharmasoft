// Invoice Generator Component
// Create new invoices with customer selection and product line items

import { useState, useEffect, useRef } from 'react';
import customerService, { type Customer } from '../services/CustomerService';
import invoiceService from '../services/InvoiceService';
import { ProductService } from '../services/database.service';
import { formatPrice } from '../utils/calculations';
import { calculateCNAM } from '../utils/cnam';
import type { Product } from '@repo/database';

interface InvoiceGeneratorProps {
    onClose: () => void;
    onInvoiceCreated?: (invoiceId: number) => void;
    userId: number;
    preselectedCustomer?: Customer | null;
}

interface LineItem {
    id: string; // Temporary ID for React keys
    product: Product | null;
    productName: string;
    productBarcode: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    cnamReimbursable: boolean;
    cnamRate: number;
    cnamAmount: number;
    patientAmount: number;
}

export default function InvoiceGenerator({
    onClose,
    onInvoiceCreated,
    userId,
    preselectedCustomer = null
}: InvoiceGeneratorProps) {
    // Customer selection
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // Product selection
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<Product[]>([]);
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    // Invoice details
    const [invoiceType, setInvoiceType] = useState<'detailed' | 'receipt' | 'cnam' | 'proforma'>('detailed');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'check' | 'transfer'>('cash');
    const [isPaid, setIsPaid] = useState(true);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<LineItem[]>([]);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

    // Refs
    const customerInputRef = useRef<HTMLInputElement>(null);
    const productInputRef = useRef<HTMLInputElement>(null);

    // Search customers
    useEffect(() => {
        const searchCustomers = async () => {
            if (customerSearch.length < 2) {
                setCustomerResults([]);
                return;
            }

            try {
                const response = await customerService.search(customerSearch, 10);
                setCustomerResults(response.data);
                setShowCustomerDropdown(true);
            } catch (error) {
                console.error('Customer search error:', error);
            }
        };

        const timer = setTimeout(searchCustomers, 300);
        return () => clearTimeout(timer);
    }, [customerSearch]);

    // Search products
    useEffect(() => {
        const searchProducts = async () => {
            if (productSearch.length < 2) {
                setProductResults([]);
                return;
            }

            try {
                const response = await ProductService.search(productSearch);
                if (response.success && response.data) {
                    setProductResults(response.data);
                    setShowProductDropdown(true);
                }
            } catch (error) {
                console.error('Product search error:', error);
            }
        };

        const timer = setTimeout(searchProducts, 300);
        return () => clearTimeout(timer);
    }, [productSearch]);

    const showMessage = (type: 'success' | 'error' | 'warning', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const selectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setCustomerSearch('');
        setCustomerResults([]);
        setShowCustomerDropdown(false);
    };

    const addProduct = (product: Product) => {
        const newItem: LineItem = {
            id: `item-${Date.now()}-${Math.random()}`,
            product,
            productName: product.commercial_name,
            productBarcode: product.barcode || '',
            quantity: 1,
            unitPrice: product.public_price,
            totalPrice: product.public_price,
            cnamReimbursable: (product as any).cnam_reimbursable || false,
            cnamRate: (product as any).cnam_rate || 0,
            cnamAmount: 0,
            patientAmount: product.public_price
        };

        // Calculate CNAM for this item
        updateItemCnam(newItem);

        setItems([...items, newItem]);
        setProductSearch('');
        setProductResults([]);
        setShowProductDropdown(false);
    };

    const updateItemCnam = (item: LineItem) => {
        const itemTotal = item.unitPrice * item.quantity;
        const calc = calculateCNAM(
            itemTotal,
            item.cnamReimbursable,
            item.cnamRate
        );

        item.totalPrice = calc.totalPrice;
        item.cnamAmount = calc.cnamPortion;
        item.patientAmount = calc.patientPortion;
    };

    const updateItemQuantity = (itemId: string, quantity: number) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                const updated = { ...item, quantity: Math.max(1, quantity) };
                updateItemCnam(updated);
                return updated;
            }
            return item;
        }));
    };

    const removeItem = (itemId: string) => {
        setItems(items.filter(item => item.id !== itemId));
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let cnamTotal = 0;
        let patientTotal = 0;

        items.forEach(item => {
            subtotal += item.totalPrice;
            cnamTotal += item.cnamAmount;
            patientTotal += item.patientAmount;
        });

        return {
            subtotal: Number(subtotal.toFixed(3)),
            cnamAmount: Number(cnamTotal.toFixed(3)),
            patientAmount: Number(patientTotal.toFixed(3))
        };
    };

    const handleSubmit = async () => {
        // Validation
        if (!selectedCustomer) {
            showMessage('warning', 'Please select a customer');
            customerInputRef.current?.focus();
            return;
        }

        if (items.length === 0) {
            showMessage('warning', 'Please add at least one item');
            productInputRef.current?.focus();
            return;
        }

        setIsSubmitting(true);

        try {
            const invoiceData = {
                customerId: selectedCustomer.id,
                invoiceType,
                paymentMethod,
                isPaid,
                notes: notes.trim() || undefined,
                userId,
                items: items.map(item => ({
                    productName: item.productName,
                    productBarcode: item.productBarcode || undefined,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    cnamReimbursable: item.cnamReimbursable,
                    cnamRate: item.cnamRate,
                    requiresPrescription: (item.product as any)?.requires_prescription || false,
                    therapeuticClass: (item.product as any)?.therapeutic_class || undefined,
                    dciName: (item.product as any)?.dci_name || undefined
                }))
            };

            const response = await invoiceService.create(invoiceData);

            showMessage('success', `Invoice ${response.data.invoiceNumber} created successfully!`);

            if (onInvoiceCreated) {
                onInvoiceCreated(response.data.id);
            }

            // Close after a brief delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to create invoice');
            setIsSubmitting(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Create New Invoice
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-100 transition-colors"
                        disabled={isSubmitting}
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Message Banner */}
                {message && (
                    <div className={`mx-6 mt-4 p-3 rounded-lg border ${message.type === 'success' ? 'bg-success/10 border-success text-success' :
                        message.type === 'warning' ? 'bg-warning/10 border-warning text-warning' :
                            'bg-danger/10 border-danger text-danger'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                    <div className="space-y-6">
                        {/* Customer Selection */}
                        <div className="card p-4">
                            <h3 className="font-bold text-gray-100 mb-3">1. Select Customer</h3>
                            {selectedCustomer ? (
                                <div className="p-3 bg-dark-bg border border-success rounded-lg flex items-start justify-between">
                                    <div>
                                        <div className="font-bold text-gray-100">{selectedCustomer.name}</div>
                                        <div className="text-sm text-gray-400">
                                            {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                                            {selectedCustomer.email && <span className="ml-3">{selectedCustomer.email}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="btn-secondary px-3 py-1 text-sm"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        ref={customerInputRef}
                                        type="text"
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        placeholder="Search customer by name, phone, or email..."
                                        className="w-full"
                                        autoFocus
                                    />
                                    {showCustomerDropdown && customerResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-dark-elevated border border-dark-border rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                                            {customerResults.map(customer => (
                                                <button
                                                    key={customer.id}
                                                    onClick={() => selectCustomer(customer)}
                                                    className="w-full text-left px-4 py-3 hover:bg-dark-surface transition-colors border-b border-dark-border last:border-0"
                                                >
                                                    <div className="font-medium text-gray-100">{customer.name}</div>
                                                    <div className="text-sm text-gray-400">
                                                        {customer.phone && <span>{customer.phone}</span>}
                                                        {customer.email && <span className="ml-3">{customer.email}</span>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Invoice Settings */}
                        <div className="card p-4">
                            <h3 className="font-bold text-gray-100 mb-3">2. Invoice Settings</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Invoice Type</label>
                                    <select
                                        value={invoiceType}
                                        onChange={(e) => setInvoiceType(e.target.value as any)}
                                        className="w-full"
                                    >
                                        <option value="detailed">📄 Detailed</option>
                                        <option value="receipt">🧾 Receipt</option>
                                        <option value="cnam">🏥 CNAM</option>
                                        <option value="proforma">📋 Proforma</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Payment Method</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                        className="w-full"
                                    >
                                        <option value="cash">💵 Cash</option>
                                        <option value="card">💳 Card</option>
                                        <option value="check">📝 Check</option>
                                        <option value="transfer">🏦 Transfer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Payment Status</label>
                                    <select
                                        value={isPaid ? 'paid' : 'unpaid'}
                                        onChange={(e) => setIsPaid(e.target.value === 'paid')}
                                        className="w-full"
                                    >
                                        <option value="paid">✓ Paid</option>
                                        <option value="unpaid">✗ Unpaid</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Product Selection */}
                        <div className="card p-4">
                            <h3 className="font-bold text-gray-100 mb-3">3. Add Products</h3>
                            <div className="relative mb-4">
                                <input
                                    ref={productInputRef}
                                    type="text"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    placeholder="Search product by name or barcode..."
                                    className="w-full"
                                />
                                {showProductDropdown && productResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-dark-elevated border border-dark-border rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                                        {productResults.map(product => (
                                            <button
                                                key={product.id}
                                                onClick={() => addProduct(product)}
                                                className="w-full text-left px-4 py-3 hover:bg-dark-surface transition-colors border-b border-dark-border last:border-0"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-100">{product.commercial_name}</div>
                                                        <div className="text-sm text-gray-400 font-mono">{product.barcode}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-primary">{formatPrice(product.public_price)}</div>
                                                        {(product as any).cnam_reimbursable && (
                                                            <div className="text-xs text-success">
                                                                CNAM {(product as any).cnam_rate}%
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            {items.length > 0 ? (
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <div key={item.id} className="p-3 bg-dark-bg border border-dark-border rounded-lg">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-100">{item.productName}</div>
                                                    {item.productBarcode && (
                                                        <div className="text-xs text-gray-500 font-mono">{item.productBarcode}</div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-danger hover:text-danger/80 transition-colors"
                                                    title="Remove item"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                                        className="btn-secondary px-2 py-1 text-sm"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                                        className="w-16 text-center"
                                                    />
                                                    <button
                                                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                                        className="btn-secondary px-2 py-1 text-sm"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <div className="flex-1 text-sm text-gray-400">
                                                    {item.quantity} × {formatPrice(item.unitPrice)} = <span className="font-bold text-primary">{formatPrice(item.totalPrice)}</span>
                                                </div>

                                                {item.cnamReimbursable && item.cnamRate > 0 && (
                                                    <div className="flex gap-4 text-xs">
                                                        <div>
                                                            <span className="text-gray-500">CNAM:</span>{' '}
                                                            <span className="text-success font-bold">{formatPrice(item.cnamAmount)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Patient:</span>{' '}
                                                            <span className="text-warning font-bold">{formatPrice(item.patientAmount)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No items added yet. Search and add products above.
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="card p-4">
                            <h3 className="font-bold text-gray-100 mb-3">4. Notes (Optional)</h3>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes or special instructions..."
                                className="w-full"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer with Totals and Actions */}
                <div className="px-6 py-4 border-t border-dark-border flex items-center justify-between flex-shrink-0 bg-dark-elevated">
                    <div className="flex gap-6">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Subtotal</div>
                            <div className="text-lg font-bold text-gray-100">{formatPrice(totals.subtotal)}</div>
                        </div>
                        {totals.cnamAmount > 0 && (
                            <>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">CNAM Portion</div>
                                    <div className="text-lg font-bold text-success">{formatPrice(totals.cnamAmount)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Patient Portion</div>
                                    <div className="text-lg font-bold text-warning">{formatPrice(totals.patientAmount)}</div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="btn-secondary px-6 py-3"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="btn-primary px-8 py-3 text-lg font-bold"
                            disabled={isSubmitting || !selectedCustomer || items.length === 0}
                        >
                            {isSubmitting ? 'Creating Invoice...' : 'Create Invoice'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
