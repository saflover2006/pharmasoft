import { useEffect, useState } from 'react';

interface UpgradeActionResult {
    success: boolean;
    message?: string;
    close?: boolean;
}

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: string;
    currentLimit?: { current: number; max: number };
    professionalAction?: 'trial' | 'checkout';
    onUpgrade?: (tier: 'professional' | 'enterprise') => Promise<UpgradeActionResult> | UpgradeActionResult;
}

export default function UpgradeModal({
    isOpen,
    onClose,
    feature,
    currentLimit,
    professionalAction = 'trial',
    onUpgrade
}: UpgradeModalProps) {
    const [selectedTier, setSelectedTier] = useState<'professional' | 'enterprise'>('professional');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedTier('professional');
            setIsSubmitting(false);
            setMessage(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const primaryActionLabel = selectedTier === 'professional'
        ? professionalAction === 'trial'
            ? 'Start Free Trial'
            : 'Continue to Checkout'
        : 'Continue to Checkout';

    const handleUpgrade = async () => {
        if (!onUpgrade || isSubmitting) {
            return;
        }

        setMessage(null);
        setIsSubmitting(true);

        try {
            const result = await onUpgrade(selectedTier);

            if (result.message) {
                setMessage({
                    type: result.success ? 'success' : 'error',
                    text: result.message,
                });
            }

            if (result.success && result.close !== false) {
                onClose();
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Upgrade failed',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-dark-surface rounded-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            🚀 Upgrade to Professional
                        </h2>
                        {feature && (
                            <p className="text-gray-400">
                                Unlock <span className="text-primary font-semibold">{feature}</span> and more!
                            </p>
                        )}
                        {currentLimit && (
                            <p className="text-yellow-500 mt-2">
                                ⚠️ You've reached your limit ({currentLimit.current}/{currentLimit.max})
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Pricing Tiers */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Professional Tier */}
                    <div
                        className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${selectedTier === 'professional'
                            ? 'border-primary bg-primary bg-opacity-10'
                            : 'border-dark-border hover:border-primary'
                            }`}
                        onClick={() => setSelectedTier('professional')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-bold text-white">Professional</h3>
                            <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center">
                                {selectedTier === 'professional' && (
                                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                                )}
                            </div>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-primary">$29</span>
                            <span className="text-gray-400">/month</span>
                        </div>
                        <ul className="space-y-3 text-gray-300">
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Unlimited products</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Up to 5 users</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Unlimited sales</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Advanced analytics</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Cloud backup</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>CNAM integration</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Thermal printing</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Offline mode</span>
                            </li>
                        </ul>
                    </div>

                    {/* Enterprise Tier */}
                    <div
                        className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${selectedTier === 'enterprise'
                            ? 'border-primary bg-primary bg-opacity-10'
                            : 'border-dark-border hover:border-primary'
                            }`}
                        onClick={() => setSelectedTier('enterprise')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-bold text-white">Enterprise</h3>
                            <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center">
                                {selectedTier === 'enterprise' && (
                                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                                )}
                            </div>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-primary">Custom</span>
                            <span className="text-gray-400"> pricing</span>
                        </div>
                        <ul className="space-y-3 text-gray-300">
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Everything in Professional</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Unlimited users</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Multi-pharmacy support</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>API access</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Custom integrations</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>White label options</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>Dedicated support</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>On-premise deployment</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Trial Offer */}
                <div className="bg-gradient-to-r from-primary to-green-600 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-bold text-xl mb-1">
                                🎁 Try Professional FREE for 14 days!
                            </h4>
                            <p className="text-white text-opacity-90">
                                No credit card required. Cancel anytime.
                            </p>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${message.type === 'success'
                        ? 'border-green-500/40 bg-green-500/10 text-green-300'
                        : 'border-red-500/40 bg-red-500/10 text-red-300'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button
                        onClick={handleUpgrade}
                        disabled={isSubmitting}
                        className="flex-1 btn btn-primary text-lg py-4 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? 'Processing...' : primaryActionLabel}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="btn btn-secondary px-8 py-4 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Maybe Later
                    </button>
                </div>

                {/* Money-back guarantee */}
                <p className="text-center text-gray-400 mt-4 text-sm">
                    💰 30-day money-back guarantee • 🔒 Secure payment • ⚡ Instant activation
                </p>
            </div>
        </div>
    );
}
