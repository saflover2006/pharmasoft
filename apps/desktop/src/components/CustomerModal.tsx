import { useState } from 'react';

export interface CustomerInfo {
    id?: number;
    name: string;
    phone?: string;
}

interface CustomerModalProps {
    onSave: (customer: CustomerInfo) => void;
    onCancel: () => void;
}

/**
 * Modal for adding customer information to a sale
 */
export default function CustomerModal({ onSave, onCancel }: CustomerModalProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Please enter customer name');
            return;
        }

        onSave({
            name: name.trim(),
            phone: phone.trim() || undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center">
                        <svg className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Add Customer
                    </h2>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        {/* Name Input */}
                        <div>
                            <label htmlFor="customer-name" className="label">
                                Customer Name <span className="text-danger">*</span>
                            </label>
                            <input
                                id="customer-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter customer name"
                                className="w-full"
                                autoFocus
                                required
                            />
                        </div>

                        {/* Phone Input */}
                        <div>
                            <label htmlFor="customer-phone" className="label">
                                Phone Number (Optional)
                            </label>
                            <input
                                id="customer-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter phone number"
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Info Notice */}
                    <div className="mt-4 p-3 bg-info/10 border border-info/30 rounded-lg">
                        <p className="text-xs text-gray-400 text-center">
                            💡 Customer information is optional. Click "Skip" to continue without adding customer details.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 btn-secondary py-3 rounded-xl font-semibold flex items-center justify-center"
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            Skip
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn-primary py-3 rounded-xl font-semibold"
                        >
                            Add Customer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
