import { useState } from 'react';
import { ShiftService } from '../services/database.service';
import { formatPrice } from '../utils/calculations';
import type { ShiftRecord } from '../types';

interface ShiftEndModalProps {
    shift: ShiftRecord;
    onShiftEnded: () => void;
    onCancel: () => void;
}

export default function ShiftEndModal({ shift, onShiftEnded, onCancel }: ShiftEndModalProps) {
    const [endAmount, setEndAmount] = useState('');
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEnd = async () => {
        setError('');
        const amount = parseFloat(endAmount);

        if (isNaN(amount) || amount < 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (!window.confirm('Are you sure you want to end this shift? This action cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await ShiftService.endShift(shift.id, amount, note || undefined);

            if (result.success) {
                const { startAmount } = result.data;
                const expectedAmount = result.data.expectedAmount ?? 0;
                const actualEnd = result.data.endAmount ?? amount;
                const difference = actualEnd - expectedAmount;

                let message = `Shift ended successfully!\n\n`;
                message += `Opening: ${formatPrice(startAmount)}\n`;
                message += `Expected: ${formatPrice(expectedAmount)}\n`;
                message += `Actual: ${formatPrice(actualEnd)}\n`;
                message += `Difference: ${formatPrice(Math.abs(difference))} ${difference >= 0 ? '(Over)' : '(Short)'}`;

                alert(message);
                onShiftEnded();
            } else {
                setError(result.error?.message || 'Failed to end shift');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const shiftDuration = () => {
        const start = new Date(shift.startTime);
        const now = new Date();
        const hours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60));
        const minutes = Math.floor(((now.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md border border-dark-border max-h-[90vh] flex flex-col">
                {/* Header - Fixed */}
                <div className="p-6 border-b border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center">
                        <svg className="h-6 w-6 mr-2 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        End Shift
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Duration: {shiftDuration()}</p>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin">{error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                    <div className="bg-dark-elevated rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Opening Cash:</span>
                            <span className="font-mono text-white">{formatPrice(shift.startAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Started:</span>
                            <span className="text-white">{new Date(shift.startTime).toLocaleTimeString()}</span>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="endAmount" className="block text-sm font-medium text-gray-300 mb-2">
                            Closing Cash Amount (TND) *
                        </label>
                        <input
                            id="endAmount"
                            type="number"
                            step="0.01"
                            value={endAmount}
                            onChange={(e) => setEndAmount(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg focus:ring-2 focus:ring-warning focus:border-warning text-white text-lg font-mono"
                            placeholder="0.00"
                            autoFocus
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Count all cash in the register
                        </p>
                    </div>

                    <div>
                        <label htmlFor="note" className="block text-sm font-medium text-gray-300 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg focus:ring-2 focus:ring-warning focus:border-warning text-white resize-none"
                            placeholder="Any discrepancies or issues to note..."
                            rows={3}
                        />
                    </div>

                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 text-warning mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="text-sm text-gray-300">
                                <p className="font-medium mb-1">Warning</p>
                                <p className="text-gray-400">This will close your shift and calculate the final totals. You'll need to start a new shift to continue making sales.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="p-6 border-t border-dark-border flex space-x-3 flex-shrink-0">
                    <button
                        onClick={onCancel}
                        className="flex-1 btn-secondary py-3 rounded-xl"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleEnd}
                        disabled={isLoading || !endAmount}
                        className="flex-1 btn-warning py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Ending...
                            </>
                        ) : (
                            'End Shift'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
