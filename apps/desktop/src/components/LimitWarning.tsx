

interface LimitWarningProps {
    type: 'products' | 'users' | 'sales';
    current: number;
    max: number;
    onUpgrade: () => void;
}

export default function LimitWarning({ type, current, max, onUpgrade }: LimitWarningProps) {
    const percentage = (current / max) * 100;
    const isNearLimit = percentage >= 80;
    const isAtLimit = percentage >= 100;

    if (!isNearLimit) return null;

    const typeLabels = {
        products: 'Products',
        users: 'Users',
        sales: 'Sales this month'
    };

    const typeMessages = {
        products: 'Add unlimited products',
        users: 'Add more team members',
        sales: 'Process unlimited sales'
    };

    return (
        <div className={`rounded-lg p-4 mb-4 ${isAtLimit
            ? 'bg-red-600 bg-opacity-20 border-2 border-red-600'
            : 'bg-yellow-600 bg-opacity-20 border-2 border-yellow-600'
            }`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{isAtLimit ? '🚫' : '⚠️'}</span>
                        <h4 className={`font-bold ${isAtLimit ? 'text-red-500' : 'text-yellow-500'
                            }`}>
                            {isAtLimit ? `${typeLabels[type]} Limit Reached!` : `Approaching ${typeLabels[type]} Limit`}
                        </h4>
                    </div>

                    <p className="text-gray-300 text-sm mb-3">
                        {isAtLimit ? (
                            `You've used all ${max} ${type}. Upgrade to ${typeMessages[type]}.`
                        ) : (
                            `You're using ${current} of ${max} ${type}. Upgrade soon to avoid disruptions.`
                        )}
                    </p>

                    {/* Progress bar */}
                    <div className="bg-dark-elevated rounded-full h-2 mb-3 overflow-hidden">
                        <div
                            className={`h-full transition-all ${isAtLimit ? 'bg-red-500' : 'bg-yellow-500'
                                }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                            {current} / {max} used ({Math.round(percentage)}%)
                        </span>
                    </div>
                </div>

                <button
                    onClick={onUpgrade}
                    className="btn btn-primary whitespace-nowrap"
                >
                    Upgrade Now
                </button>
            </div>
        </div>
    );
}
