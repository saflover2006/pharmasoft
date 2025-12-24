import { useState } from 'react';

interface DiscountModalProps {
    onApply: (discount: { type: 'percentage' | 'fixed'; value: number; reason?: string }) => void;
    onCancel: () => void;
    subtotal: number;
    requiresAuth?: boolean;
    userRole?: string;
}

export default function DiscountModal({ onApply, onCancel, subtotal, requiresAuth = true, userRole }: DiscountModalProps) {
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [reason, setReason] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const isAdmin = userRole === 'admin';
    const needsPassword = requiresAuth && !isAdmin;

    const calculatePreview = () => {
        if (discountType === 'percentage') {
            return subtotal * (discountValue / 100);
        }
        return Math.min(discountValue, subtotal);
    };

    const handleApply = () => {
        setError('');

        // Validation
        if (discountValue <= 0) {
            setError('Discount value must be greater than 0');
            return;
        }

        if (discountType === 'percentage' && discountValue > 100) {
            setError('Percentage discount cannot exceed 100%');
            return;
        }

        if (discountType === 'fixed' && discountValue > subtotal) {
            setError('Fixed discount cannot exceed subtotal');
            return;
        }

        if (!reason.trim()) {
            setError('Please provide a reason for the discount');
            return;
        }

        // Check password for non-admin users
        if (needsPassword && password !== '123') { // In production, verify against admin password
            setError('Invalid authorization password');
            return;
        }

        onApply({ type: discountType, value: discountValue, reason: reason.trim() });
    };

    const previewAmount = calculatePreview();
    const finalTotal = subtotal - previewAmount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-dark-border">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Apply Discount
                    </h2>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger text-danger rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Discount Type */}
                    <div>
                        <label className="label">Discount Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDiscountType('percentage')}
                                className={`p-3 rounded-lg border-2 transition-all ${discountType === 'percentage'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-dark-border bg-dark-elevated text-gray-400 hover:border-primary/50'
                                    }`}
                            >
                                <div className="font-bold">Percentage %</div>
                                <div className="text-xs mt-1">e.g., 10% off</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('fixed')}
                                className={`p-3 rounded-lg border-2 transition-all ${discountType === 'fixed'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-dark-border bg-dark-elevated text-gray-400 hover:border-primary/50'
                                    }`}
                            >
                                <div className="font-bold">Fixed Amount</div>
                                <div className="text-xs mt-1">e.g., 5 TND off</div>
                            </button>
                        </div>
                    </div>

                    {/* Discount Value */}
                    <div>
                        <label className="label">
                            {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount (TND)'}
                        </label>
                        <input
                            type="number"
                            min="0"
                            max={discountType === 'percentage' ? '100' : subtotal.toString()}
                            step={discountType === 'percentage' ? '1' : '0.1'}
                            value={discountValue}
                            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                            className="w-full text-2xl font-bold"
                            placeholder={discountType === 'percentage' ? '10' : '5.00'}
                            autoFocus
                        />
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="label">Reason for Discount</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full"
                        >
                            <option value="">Select reason...</option>
                            <option value="Senior Citizen">Senior Citizen</option>
                            <option value="Chronic Patient">Chronic Patient</option>
                            <option value="Healthcare Worker">Healthcare Worker</option>
                            <option value="Bulk Purchase">Bulk Purchase</option>
                            <option value="Promotional">Promotional</option>
                            <option value="Loyalty">Loyalty Discount</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Admin Authorization */}
                    {needsPassword && (
                        <div>
                            <label className="label">Admin Password (Required)</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full"
                                placeholder="Enter admin password"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                🔒 Discounts require admin authorization
                            </p>
                        </div>
                    )}

                    {/* Preview */}
                    <div className="bg-dark-elevated rounded-lg p-4 border border-dark-border">
                        <div className="text-sm text-gray-400 mb-2">Discount Preview:</div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Subtotal:</span>
                            <span className="font-bold text-gray-100">{subtotal.toFixed(2)} TND</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-warning">Discount:</span>
                            <span className="font-bold text-warning">-{previewAmount.toFixed(2)} TND</span>
                        </div>
                        <div className="border-t border-dark-border pt-2 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-primary font-bold">New Subtotal:</span>
                                <span className="font-bold text-primary text-xl">{finalTotal.toFixed(2)} TND</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-dark-border flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 btn-secondary py-3 rounded-xl font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 btn-primary py-3 rounded-xl font-semibold"
                        disabled={discountValue <= 0 || !reason}
                    >
                        Apply Discount
                    </button>
                </div>
            </div>
        </div>
    );
}
