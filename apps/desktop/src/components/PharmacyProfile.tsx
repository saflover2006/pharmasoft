import { useState, useEffect } from 'react';
import { PharmacyService, apiRequest } from '../services/database.service';

interface PharmacyProfileProps {
    onClose: () => void;
    t: (key: string) => string;
}

export default function PharmacyProfile({ onClose, t: _t }: PharmacyProfileProps) {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        taxId: '',
        footer: 'Merci de votre visite!'
    });
    const [cloudSettings, setCloudSettings] = useState({
        cloudEnabled: false,
        cloudUrl: '',
        cloudApiKey: '',
        cloudBucketName: 'pharmasoft-backups'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadProfile();
        loadCloudSettings();
    }, []);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const result = await PharmacyService.getProfile();
            if (result.success && result.data) {
                // Pre-fill valid fields
                setFormData({
                    name: result.data.name || '',
                    address: result.data.address || '',
                    phone: result.data.phone || '',
                    email: result.data.email || '',
                    taxId: result.data.taxId || '',
                    footer: result.data.footer || 'Merci de votre visite!'
                });
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            setMessage({ type: 'error', text: 'Failed to load profile' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            const result = await PharmacyService.updateProfile(formData);
            if (result.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully' });
                // Auto-close popup after showing success message
                setTimeout(() => onClose(), 1000);
            } else {
                setMessage({ type: 'error', text: result.error?.message || 'Failed to update' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving profile' });
        } finally {
            setIsSaving(false);
        }
    };

    const loadCloudSettings = async () => {
        try {
            const result = await apiRequest('/pharmacy/cloud-settings');
            if (result.success && result.data) {
                const data = result.data as any;
                setCloudSettings({
                    cloudEnabled: data.cloudEnabled || false,
                    cloudUrl: data.cloudUrl || '',
                    cloudApiKey: data.hasApiKey ? '••••••••••••••••' : '',  // Show placeholder if key exists
                    cloudBucketName: data.cloudBucketName || 'pharmasoft-backups'
                });
            }
        } catch (error) {
            console.error('Failed to load cloud settings:', error);
        }
    };

    const handleSaveCloudSettings = async () => {
        setIsSaving(true);
        setMessage(null);

        try {
            const result = await apiRequest('/pharmacy/cloud-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cloudSettings)
            });

            if (result.success) {
                setMessage({ type: 'success', text: 'Cloud settings saved successfully!' });
                setConnectionStatus('idle');
                // Auto-close modal after showing success message
                setTimeout(() => onClose(), 1500);
            } else {
                setMessage({ type: 'error', text: result.error?.message || 'Failed to save cloud settings' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Error saving cloud settings' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!cloudSettings.cloudUrl) {
            setMessage({ type: 'error', text: 'Please enter Supabase URL' });
            return;
        }

        // Check if we have a new API key or using saved one
        const isUsingPlaceholder = cloudSettings.cloudApiKey === '••••••••••••••••' || cloudSettings.cloudApiKey === '';
        if (isUsingPlaceholder) {
            // Test using saved credentials from database
        } else if (!cloudSettings.cloudApiKey) {
            setMessage({ type: 'error', text: 'Please enter API Key' });
            return;
        }

        setIsTestingConnection(true);
        setConnectionStatus('idle');
        setMessage(null);

        try {
            // Only send API key if it's a new one (not placeholder)
            const requestBody: any = {
                cloudUrl: cloudSettings.cloudUrl,
                cloudBucketName: cloudSettings.cloudBucketName
            };

            // Only include API key if user entered a new one
            if (!isUsingPlaceholder && cloudSettings.cloudApiKey) {
                requestBody.cloudApiKey = cloudSettings.cloudApiKey;
            }
            // If using placeholder, the backend will use the saved key from database

            const result = await apiRequest('/cloud-backups/test-connection', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            if (result.success && (result.data as any).connected) {
                setConnectionStatus('success');
                setMessage({ type: 'success', text: '🟢 Connected to cloud successfully!' });
            } else {
                setConnectionStatus('error');
                setMessage({ type: 'error', text: '🔴 Connection failed. Check your URL and API key.' });
            }
        } catch (error: any) {
            setConnectionStatus('error');
            setMessage({ type: 'error', text: '🔴 Connection test failed: ' + (error.message || 'Unknown error') });
        } finally {
            setIsTestingConnection(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-400">Loading settings...</div>;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-100">Pharmacy Profile Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-100">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Pharmacy Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full input-field"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Tax ID / MF</label>
                            <input
                                type="text"
                                value={formData.taxId}
                                onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                className="w-full input-field"
                                placeholder="TN123456789"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Address</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full input-field"
                            placeholder="Street, City, Country"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Phone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full input-field"
                                placeholder="+216 ..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Email (Optional)</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full input-field bg-dark-elevated text-gray-100"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Receipt Footer</label>
                        <input
                            type="text"
                            value={formData.footer}
                            onChange={e => setFormData({ ...formData, footer: e.target.value })}
                            className="w-full input-field"
                            placeholder="Message de remerciement"
                        />
                    </div>

                    {/* Cloud Backup Settings */}
                    <div className="mt-6 pt-6 border-t border-dark-border">
                        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                            ☁️ Cloud Backup Settings
                        </h3>

                        <div className="bg-dark-elevated border border-dark-border rounded-lg p-4 space-y-4">
                            {/* Enable Toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium text-gray-100">Enable Cloud Backup</label>
                                    <p className="text-xs text-gray-500 mt-1">Upload backups to your own Supabase</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cloudSettings.cloudEnabled} onChange={(e) => setCloudSettings({ ...cloudSettings, cloudEnabled: e.target.checked })} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            {cloudSettings.cloudEnabled && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Supabase URL<span className="text-red-500 ml-1">*</span></label>
                                        <input type="text" value={cloudSettings.cloudUrl} onChange={(e) => setCloudSettings({ ...cloudSettings, cloudUrl: e.target.value })} className="w-full input-field bg-dark-elevated text-gray-100" placeholder="https://xxx.supabase.co" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">API Key<span className="text-red-500 ml-1">*</span></label>
                                        <input type="password" value={cloudSettings.cloudApiKey} onChange={(e) => setCloudSettings({ ...cloudSettings, cloudApiKey: e.target.value })} className="w-full input-field bg-dark-elevated text-gray-100" placeholder="eyJ..." />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Bucket Name</label>
                                        <input type="text" value={cloudSettings.cloudBucketName} onChange={(e) => setCloudSettings({ ...cloudSettings, cloudBucketName: e.target.value })} className="w-full input-field bg-dark-elevated text-gray-100" placeholder="pharmasoft-backups" />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={handleTestConnection} disabled={isTestingConnection} className="btn-secondary px-4 py-2 rounded-lg">
                                            {isTestingConnection ? 'Testing...' : '🔌 Test'}
                                        </button>
                                        {connectionStatus === 'success' && <span className="text-sm text-green-400">✓ Connected</span>}
                                        {connectionStatus === 'error' && <span className="text-sm text-red-400">✗ Failed</span>}
                                    </div>

                                    <button type="button" onClick={handleSaveCloudSettings} disabled={isSaving} className="btn-primary px-6 py-2 rounded-lg w-full">
                                        {isSaving ? 'Saving...' : '💾 Save Cloud Settings'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn-primary px-6 py-2 rounded-lg flex items-center"
                        >
                            {isSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
