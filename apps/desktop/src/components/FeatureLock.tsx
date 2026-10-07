import React from 'react';

interface FeatureLockProps {
    feature: string;
    description?: string;
    requiredTier?: 'professional' | 'enterprise';
    onUpgrade: () => void;
    children?: React.ReactNode;
}

export default function FeatureLock({
    feature,
    description,
    requiredTier = 'professional',
    onUpgrade,
    children
}: FeatureLockProps) {
    return (
        <div className="relative">
            {/* Blurred content (if children provided) */}
            {children && (
                <div className="filter blur-sm pointer-events-none select-none">
                    {children}
                </div>
            )}

            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-dark-bg bg-opacity-90 backdrop-blur-sm">
                <div className="text-center max-w-md p-8">
                    {/* Lock icon */}
                    <div className="mb-6">
                        <svg
                            className="w-20 h-20 mx-auto text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>

                    {/* Message */}
                    <h3 className="text-2xl font-bold text-white mb-3">
                        {feature}
                    </h3>
                    <p className="text-gray-400 mb-2">
                        {description || `This feature is available in the ${requiredTier} tier`}
                    </p>
                    <p className="text-primary font-semibold mb-6">
                        Upgrade to unlock this feature
                    </p>

                    {/* Features list */}
                    <div className="bg-dark-surface rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-semibold text-gray-300 mb-3">
                            Unlock with {requiredTier === 'professional' ? 'Professional' : 'Enterprise'}:
                        </p>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start">
                                <span className="text-primary mr-2">✓</span>
                                <span>{feature}</span>
                            </li>
                            {requiredTier === 'professional' ? (
                                <>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">✓</span>
                                        <span>Advanced analytics</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">✓</span>
                                        <span>Unlimited products & sales</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">✓</span>
                                        <span>Cloud backup</span>
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">✓</span>
                                        <span>Everything in Professional</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">✓</span>
                                        <span>Multi-pharmacy support</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">✓</span>
                                        <span>API access</span>
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onUpgrade}
                            className="btn btn-primary w-full py-3"
                        >
                            🚀 Upgrade to {requiredTier === 'professional' ? 'Professional' : 'Enterprise'}
                        </button>
                        <p className="text-xs text-gray-500">
                            Start 14-day free trial • No credit card required
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
