import { useState, useEffect } from 'react';
import { apiRequest } from '../services/database.service';

interface CloudBackup {
    id: string;
    name: string;
    size: number;
    createdAt: string;
}

interface CloudBackupManagerProps {
    onClose: () => void;
}

export default function CloudBackupManager({ onClose }: CloudBackupManagerProps) {
    const [backups, setBackups] = useState<CloudBackup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const [description, setDescription] = useState('');
    const [isConnected, setIsConnected] = useState<boolean | null>(null);

    useEffect(() => {
        loadBackups();
        testConnection();
    }, []);

    const testConnection = async () => {
        try {
            const result = await apiRequest<{ connected: boolean }>('/cloud-backups/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            if (result.success) {
                setIsConnected(result.data.connected);
            }
        } catch {
            setIsConnected(false);
        }
    };

    const loadBackups = async () => {
        setIsLoading(true);
        try {
            const result = await apiRequest('/cloud-backups');
            if (result.success) {
                setBackups((result.data as CloudBackup[]) || []);
            } else {
                setMessage({ type: 'error', text: result.error?.message || 'Failed to load cloud backups' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to connect to cloud' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!description.trim()) {
            setMessage({ type: 'error', text: 'Please enter a description' });
            return;
        }

        setIsUploading(true);
        setMessage(null);

        try {
            const result = await apiRequest('/cloud-backups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description })
            });

            if (result.success) {
                setMessage({ type: 'success', text: 'Backup uploaded to cloud successfully!' });
                setDescription('');
                loadBackups();
            } else {
                setMessage({ type: 'error', text: result.error?.message || 'Upload failed' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Upload failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRestore = async (filename: string) => {
        if (!confirm(`Restore from cloud backup: ${filename}?\n\nThis will replace your current database. The app will need to restart.`)) {
            return;
        }

        setIsRestoring(true);
        setMessage({ type: 'info', text: 'Restoring from cloud...' });

        try {
            const result = await apiRequest('/cloud-backups/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });

            if (result.success) {
                setMessage({
                    type: 'success',
                    text: 'Cloud backup restored! Please restart the application.'
                });
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setMessage({ type: 'error', text: result.error?.message || 'Restore failed' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Restore failed' });
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Delete cloud backup: ${filename}?\n\nThis cannot be undone.`)) {
            return;
        }

        try {
            const result = await apiRequest(`/cloud-backups/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });

            if (result.success) {
                setMessage({ type: 'success', text: 'Cloud backup deleted' });
                loadBackups();
            } else {
                setMessage({ type: 'error', text: result.error?.message || 'Delete failed' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Delete failed' });
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                        <h2 className="text-xl font-bold text-gray-100">Cloud Backup Manager</h2>
                        {isConnected !== null && (
                            <span className={`text-xs px-2 py-1 rounded-full ${isConnected
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                                }`}>
                                {isConnected ? '🟢 Connected' : '🔴 Offline'}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-100 transition-colors">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400' :
                        message.type === 'error' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Upload Section */}
                <div className="px-6 py-4 border-b border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-100 mb-3">Upload to Cloud</h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Backup description (e.g., End of day backup)"
                            className="flex-1 input-field bg-dark-elevated text-gray-100"
                            disabled={isUploading || !isConnected}
                        />
                        <button
                            onClick={handleUpload}
                            disabled={isUploading || !isConnected}
                            className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload to Cloud
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        💡 Create a cloud backup before major changes or at end of day
                    </p>
                </div>

                {/* Backups List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-100 mb-3">Cloud Backups</h3>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-400">
                            <svg className="animate-spin h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading cloud backups...
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <svg className="h-20 w-20 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                            <p className="text-lg">No cloud backups yet</p>
                            <p className="text-sm mt-2">Upload your first backup to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {backups.map((backup) => (
                                <div
                                    key={backup.id}
                                    className="bg-dark-elevated rounded-lg p-4 border border-dark-border hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                                </svg>
                                                <h4 className="font-medium text-gray-100">{backup.name}</h4>
                                            </div>
                                            <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                                                <span>📁 {formatSize(backup.size)}</span>
                                                <span>🕒 {formatDate(backup.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRestore(backup.name)}
                                                disabled={isRestoring}
                                                className="btn-secondary px-4 py-2 rounded-lg text-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
                                            >
                                                📥 Restore
                                            </button>
                                            <button
                                                onClick={() => handleDelete(backup.name)}
                                                className="btn-secondary px-4 py-2 rounded-lg text-sm hover:bg-red-500/20 text-red-400 transition-colors"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-dark-border flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                        {backups.length} cloud backup{backups.length !== 1 ? 's' : ''}
                    </div>
                    <button onClick={loadBackups} className="btn-secondary px-4 py-2 rounded-lg text-sm">
                        🔄 Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}
