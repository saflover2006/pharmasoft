import { useState, useEffect } from 'react';
import { apiRequest } from '../services/database.service';

interface AuditLog {
    id: number;
    action: string;
    entityType: string | null;
    entityId: number | null;
    details: string | null;
    createdAt: string;
    user: {
        id: number;
        username: string;
        name: string;
        role: string;
    } | null;
}

interface AuditLogViewerProps {
    onClose: () => void;
}

export default function AuditLogViewer({ onClose }: AuditLogViewerProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const pageSize = 50;

    useEffect(() => {
        loadLogs();
    }, [page, filterAction, filterUser]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: pageSize.toString(),
                offset: (page * pageSize).toString(),
            });

            if (filterAction) params.append('action', filterAction);
            if (filterUser) params.append('userId', filterUser);

            const result = await apiRequest<{ logs: AuditLog[]; total: number }>(`/audit-logs?${params}`, { method: 'GET' });
            if (result.success && result.data) {
                setLogs(result.data.logs);
                setTotal(result.data.total);
            }
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getActionIcon = (action: string) => {
        if (action.includes('CREATE')) return '✨';
        if (action.includes('UPDATE') || action.includes('EDIT')) return '📝';
        if (action.includes('DELETE')) return '🗑️';
        if (action.includes('LOGIN')) return '🔐';
        if (action.includes('BACKUP')) return '💾';
        if (action.includes('RESTORE')) return '🔄';
        return '📋';
    };

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'text-green-400 bg-green-500/20';
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-400 bg-blue-500/20';
        if (action.includes('DELETE')) return 'text-red-400 bg-red-500/20';
        if (action.includes('LOGIN')) return 'text-purple-400 bg-purple-500/20';
        if (action.includes('BACKUP') || action.includes('RESTORE')) return 'text-yellow-400 bg-yellow-500/20';
        return 'text-gray-400 bg-gray-500/20';
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-surface rounded-2xl shadow-2xl border border-dark-border max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-dark-border">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <span className="text-3xl">🔍</span>
                                Activity Log
                            </h2>
                            <p className="text-gray-400 mt-1 text-sm">View all system activities and user actions</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Filter by action..."
                            value={filterAction}
                            onChange={(e) => {
                                setFilterAction(e.target.value);
                                setPage(0);
                            }}
                            className="flex-1 px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                        <button
                            onClick={() => {
                                setFilterAction('');
                                setFilterUser('');
                                setPage(0);
                            }}
                            className="px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg text-gray-400 hover:text-white hover:border-primary transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="px-6 py-4 bg-dark-elevated/50 border-b border-dark-border">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                            Showing {logs.length > 0 ? page * pageSize + 1 : 0} - {Math.min((page + 1) * pageSize, total)} of {total} entries
                        </span>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(Math.max(0, page - 1))}
                                    disabled={page === 0}
                                    className="px-3 py-1 bg-dark-surface border border-dark-border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary transition-colors"
                                >
                                    ← Previous
                                </button>
                                <span className="text-gray-400">
                                    Page {page + 1} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="px-3 py-1 bg-dark-surface border border-dark-border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary transition-colors"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Logs List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg">No activity logs found</p>
                            <p className="text-sm mt-1">Activities will appear here as users interact with the system</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-dark-border">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-4 hover:bg-dark-elevated/30 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${getActionColor(log.action)}`}>
                                            {getActionIcon(log.action)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`font-mono text-sm px-2 py-1 rounded ${getActionColor(log.action)}`}>
                                                            {log.action}
                                                        </span>
                                                        {log.entityType && (
                                                            <span className="text-sm text-gray-400">
                                                                {log.entityType} #{log.entityId}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            <span>{log.user ? `${log.user.name} (${log.user.role})` : 'System'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>{formatDate(log.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    {log.details && (
                                                        <details className="mt-2">
                                                            <summary className="text-sm text-primary cursor-pointer hover:underline">
                                                                Show details
                                                            </summary>
                                                            <pre className="mt-2 text-xs text-gray-400 bg-dark-elevated p-3 rounded overflow-x-auto">
                                                                {JSON.stringify(JSON.parse(log.details), null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
