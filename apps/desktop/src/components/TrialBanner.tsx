

interface TrialBannerProps {
    daysRemaining: number;
    onUpgrade: () => void;
}

export default function TrialBanner({ daysRemaining, onUpgrade }: TrialBannerProps) {
    const isExpiringSoon = daysRemaining <= 3;

    return (
        <div className={`${isExpiringSoon ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-primary to-green-600'
            } text-white px-6 py-3 flex items-center justify-between shadow-lg`}>
            <div className="flex items-center gap-4">
                <div className="text-2xl">
                    {isExpiringSoon ? '⚠️' : '🎉'}
                </div>
                <div>
                    <p className="font-bold">
                        {isExpiringSoon ? (
                            `Trial Ending Soon - ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left!`
                        ) : (
                            `Professional Trial Active - ${daysRemaining} days remaining`
                        )}
                    </p>
                    <p className="text-sm text-white text-opacity-90">
                        {isExpiringSoon ? (
                            'Upgrade now to keep all premium features'
                        ) : (
                            'Enjoying unlimited features? Lock in this price today!'
                        )}
                    </p>
                </div>
            </div>
            <button
                onClick={onUpgrade}
                className="btn bg-white text-primary hover:bg-gray-100 font-bold px-6 py-2 shadow-lg"
            >
                Upgrade Now
            </button>
        </div>
    );
}
