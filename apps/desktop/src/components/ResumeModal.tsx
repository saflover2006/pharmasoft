import type { HeldTransaction } from '../types';
import { formatPrice } from '../utils/calculations';

interface ResumeModalProps {
    heldTransactions: HeldTransaction[];
    onResume: (transaction: HeldTransaction) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export default function ResumeModal({
    heldTransactions,
    onResume,
    onDelete,
    onClose
}: ResumeModalProps) {
    // format relative time
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const calculateTotal = (transaction: HeldTransaction) => {
        return transaction.cart.reduce((sum, item) =>
            sum + (item.quantity * item.product.public_price), 0
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl shadow-2xl w-full max-w-2xl border border-dark-border max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-dark-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center">
                        <svg className="h-6 w-6 mr-2 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Held Transactions ({heldTransactions.length})
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {heldTransactions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No held transactions found.
                        </div>
                    ) : (
                        heldTransactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="bg-dark-bg p-4 rounded-xl border border-dark-border hover:border-primary/50 transition-colors flex justify-between items-center group"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-1">
                                        <span className="text-primary font-bold">
                                            {tx.customer?.name || 'Guest Customer'}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-dark-surface px-2 py-0.5 rounded-full">
                                            {formatTime(tx.timestamp)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {tx.cart.reduce((acc, item) => acc + item.quantity, 0)} items • {formatPrice(calculateTotal(tx))}
                                    </div>
                                    {tx.note && (
                                        <div className="text-xs text-gray-500 mt-1 italic">
                                            "{tx.note}"
                                        </div>
                                    )}
                                </div>

                                <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onDelete(tx.id)}
                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        title="Discard"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => onResume(tx)}
                                        className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center shadow-glow"
                                    >
                                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Resume
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
