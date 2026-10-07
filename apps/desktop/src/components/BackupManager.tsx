import { useState, useEffect } from 'react';
import { apiRequest } from '../services/database.service';

interface Backup {
    filename: string;
    size: number;
    createdAt: string;
}

interface BackupManagerProps {
    onClose: () => void;
}

export default function BackupManager({ onClose }: BackupManagerProps) {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        setLoading(true);
        try {
            const result = await apiRequest<Backup[]>('/backups', { method: 'GET' });
            if (result.success && result.data) {
                setBackups(result.data);
            }
        } catch (error) {
            console.error('Failed to load backups:', error);
        } finally {
            setLoading(false);
        }
    };

    const createBackup = async () => {
        const description = prompt('Enter backup description (optional):');
        if (description === null) return; // User cancelled

        setCreating(true);
        try {
            const result = await apiRequest('/backups', {
                method: 'POST',
                body: JSON.stringify({ description: description || 'Manual backup' })
            });
            if (result.success) {
                alert('✅ Backup created successfully!');
                loadBackups();
            } else {
                alert('❌ Failed to create backup: ' + (result.error?.message || 'Unknown error'));
            }
        } catch (error: any) {
            alert('❌ Error: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    const restoreBackup = async (filename: string) => {
        if (!confirm(`⚠️ WARNING: This will restore the database to the state of "${filename}".\n\nAll current data will be replaced with the backup data.\n\nAre you absolutely sure?`)) {
            return;
        }

        if (!confirm('This is your FINAL confirmation. Restore backup now?')) {
            return;
        }

        setLoading(true);
        try {
            const result = await apiRequest(`/backups/${filename}/restore`, { method: 'POST' });
            if (result.success) {
                alert('✅ Backup restored successfully!\n\nPlease restart the application for changes to take effect.');
                window.location.reload();
            } else {
                alert('❌ Failed to restore backup: ' + (result.error?.message || 'Unknown error'));
            }
        } catch (error: any) {
            alert('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteBackup = async (filename: string) => {
        if (!confirm(`Delete backup "${filename}"?`)) {
            return;
        }

        setLoading(true);
        try {
            const result = await apiRequest(`/backups/${filename}`, { method: 'DELETE' });
            if (result.success) {
                alert('✅ Backup deleted successfully!');
                loadBackups();
            } else {
                alert('❌ Failed to delete backup: ' + (result.error?.message || 'Unknown error'));
            }
        } catch (error: any) {
            alert('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-surface rounded-2xl shadow-2xl border border-dark-border max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-dark-border flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="text-3xl">💾</span>
                            Backup Manager
                        </h2>
                        <p className="text-gray-400 mt-1 text-sm">Create, restore, and manage database backups</p>
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

                {/* Info Banner */}
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 mx-6 mt-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-100">
                            <p className="font-medium">Automatic Backups Enabled</p>
                            <p className="text-blue-200/80 mt-1">Daily backups are created automatically and kept for 7 days. You can also create manual backups anytime.</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-b border-dark-border">
                    <button
                        onClick={createBackup}
                        disabled={creating || loading}
                        className="btn-primary px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {creating ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Creating Backup...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create New Backup
                            </>
                        )}
                    </button>
                </div>

                {/* Backup List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && backups.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-lg">No backups found</p>
                            <p className="text-sm mt-1">Create your first backup to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {backups.map((backup) => (
                                <div
                                    key={backup.filename}
                                    className="bg-dark-elevated rounded-lg p-4 border border-dark-border hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{backup.filename}</p>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                                        <span>{formatFileSize(backup.size)}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(backup.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => restoreBackup(backup.filename)}
                                                disabled={loading}
                                                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Restore
                                            </button>
                                            <button
                                                onClick={() => deleteBackup(backup.filename)}
                                                disabled={loading}
                                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
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
