import { useState } from 'react';
import { ShiftService } from '../services/database.service';

interface ShiftStartModalProps {
    user: any;
    onShiftStarted: (shift: any) => void;
    onCancel: () => void;
}

export default function ShiftStartModal({ user, onShiftStarted, onCancel }: ShiftStartModalProps) {
    const [startAmount, setStartAmount] = useState('0');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleStart = async () => {
        setError('');
        const amount = parseFloat(startAmount);

        if (isNaN(amount) || amount < 0) {
            setError('Please enter a valid amount');
            return;
        }

        setIsLoading(true);
        try {
            const result = await ShiftService.startShift(user.id, amount);

            if (result.success) {
                onShiftStarted(result.data);
            } else {
                setError(result.error?.message || 'Failed to start shift');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md border border-dark-border">
                <div className="p-6 border-b border-dark-border">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center">
                        <svg className="h-6 w-6 mr-2 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Start Shift
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Welcome, {user.name}</p>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="startAmount" className="block text-sm font-medium text-gray-300 mb-2">
                            Opening Cash Amount (TND)
                        </label>
                        <input
                            id="startAmount"
                            type="number"
                            step="0.01"
                            value={startAmount}
                            onChange={(e) => setStartAmount(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg focus:ring-2 focus:ring-success focus:border-success text-white text-lg font-mono"
                            placeholder="0.00"
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Enter the amount of cash in the register at shift start
                        </p>
                    </div>

                    <div className="bg-info/10 border border-info/30 rounded-lg p-4">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 text-info mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-gray-300">
                                <p className="font-medium mb-1">Important</p>
                                <p className="text-gray-400">All sales during this shift will be tracked. Make sure to count the cash carefully before starting.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-dark-border flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 btn-secondary py-3 rounded-xl"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStart}
                        disabled={isLoading}
                        className="flex-1 btn-success py-3 rounded-xl shadow-glow-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Starting...
                            </>
                        ) : (
                            'Start Shift'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
