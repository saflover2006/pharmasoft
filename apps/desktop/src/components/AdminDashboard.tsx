import { useState, useEffect } from 'react';
import { apiRequest } from '../services/database.service';

interface Pharmacy {
    id: number;
    name: string;
    email: string;
    phone: string;
    subscriptionTier: string;
    licenseStatus: string;
    paymentStatus: string;
    licenseKey?: string;
    createdAt: string;
    licenseExpiresAt?: string;
    trialEndsAt?: string;
    _count: {
        users: number;
        products: number;
        sales: number;
    };
}

interface Stats {
    total: number;
    free: number;
    professional: number;
    enterprise: number;
    trials: number;
    paid: number;
    mrr: number;
    arr: number;
}

export default function AdminDashboard() {
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pharmaciesRes, statsRes] = await Promise.all([
                apiRequest<Pharmacy[]>('/api/admin/pharmacies'),
                apiRequest<Stats>('/api/admin/stats')
            ]);

            if (pharmaciesRes.success && pharmaciesRes.data) setPharmacies(pharmaciesRes.data);
            if (statsRes.success && statsRes.data) setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to load admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const upgradePharmacy = async (id: number, tier: string) => {
        if (!confirm(`Upgrade to ${tier}?`)) return;

        try {
            const response = await apiRequest<{ licenseKey: string }>(`/api/admin/pharmacy/${id}/upgrade`, {
                method: 'POST',
                body: JSON.stringify({ tier, durationMonths: 12 })
            });

            if (response.success) {
                alert(`✅ Upgraded! License: ${response.data.licenseKey}`);
                loadData();
            }
        } catch (error) {
            alert('Failed to upgrade pharmacy');
        }
    };

    const suspendPharmacy = async (id: number) => {
        if (!confirm('Suspend this pharmacy?')) return;

        try {
            const response = await apiRequest(`/api/admin/pharmacy/${id}/suspend`, {
                method: 'POST'
            });

            if (response.success) {
                alert('✅ Pharmacy suspended');
                loadData();
            }
        } catch (error) {
            alert('Failed to suspend pharmacy');
        }
    };

    const reactivatePharmacy = async (id: number) => {
        try {
            const response = await apiRequest(`/api/admin/pharmacy/${id}/reactivate`, {
                method: 'POST'
            });

            if (response.success) {
                alert('✅ Pharmacy reactivated');
                loadData();
            }
        } catch (error) {
            alert('Failed to reactivate pharmacy');
        }
    };

    if (loading) {
        return <div className="p-8 text-white">Loading admin dashboard...</div>;
    }

    return (
        <div className="p-8 bg-dark-bg min-h-screen">
            <h1 className="text-4xl font-bold text-white mb-8">
                🎛️ Admin Dashboard
            </h1>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-dark-surface rounded-xl p-6">
                        <div className="text-gray-400 text-sm mb-2">Total Pharmacies</div>
                        <div className="text-3xl font-bold text-white">{stats.total}</div>
                    </div>
                    <div className="bg-dark-surface rounded-xl p-6">
                        <div className="text-gray-400 text-sm mb-2">Active Trials</div>
                        <div className="text-3xl font-bold text-primary">{stats.trials}</div>
                    </div>
                    <div className="bg-dark-surface rounded-xl p-6">
                        <div className="text-gray-400 text-sm mb-2">Paid Subscriptions</div>
                        <div className="text-3xl font-bold text-green-500">{stats.paid}</div>
                    </div>
                    <div className="bg-dark-surface rounded-xl p-6">
                        <div className="text-gray-400 text-sm mb-2">MRR</div>
                        <div className="text-3xl font-bold text-green-500">${stats.mrr}</div>
                        <div className="text-xs text-gray-400 mt-1">ARR: ${stats.arr}</div>
                    </div>
                </div>
            )}

            {/* Tier Distribution */}
            {stats && (
                <div className="bg-dark-surface rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">Tier Distribution</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-gray-400 text-sm">Free</div>
                            <div className="text-2xl font-bold text-white">{stats.free}</div>
                            <div className="text-xs text-gray-500">
                                {((stats.free / stats.total) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">Professional</div>
                            <div className="text-2xl font-bold text-primary">{stats.professional}</div>
                            <div className="text-xs text-gray-500">
                                {((stats.professional / stats.total) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">Enterprise</div>
                            <div className="text-2xl font-bold text-purple-500">{stats.enterprise}</div>
                            <div className="text-xs text-gray-500">
                                {((stats.enterprise / stats.total) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pharmacies Table */}
            <div className="bg-dark-surface rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">All Pharmacies</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-border">
                                <th className="text-left text-gray-400 py-3 px-4">Pharmacy</th>
                                <th className="text-left text-gray-400 py-3 px-4">Contact</th>
                                <th className="text-left text-gray-400 py-3 px-4">Tier</th>
                                <th className="text-left text-gray-400 py-3 px-4">Status</th>
                                <th className="text-left text-gray-400 py-3 px-4">Usage</th>
                                <th className="text-left text-gray-400 py-3 px-4">Registered</th>
                                <th className="text-left text-gray-400 py-3 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pharmacies.map(pharmacy => (
                                <tr key={pharmacy.id} className="border-b border-dark-border hover:bg-dark-elevated">
                                    <td className="py-4 px-4">
                                        <div className="font-semibold text-white">{pharmacy.name}</div>
                                        <div className="text-sm text-gray-400">ID: {pharmacy.id}</div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="text-white">{pharmacy.email}</div>
                                        <div className="text-sm text-gray-400">{pharmacy.phone}</div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pharmacy.subscriptionTier === 'free' ? 'bg-gray-700 text-gray-300' :
                                            pharmacy.subscriptionTier === 'professional' ? 'bg-primary bg-opacity-20 text-primary' :
                                                'bg-purple-900 bg-opacity-30 text-purple-400'
                                            }`}>
                                            {pharmacy.subscriptionTier}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className={`text-sm font-semibold ${pharmacy.licenseStatus === 'active' ? 'text-green-500' :
                                            pharmacy.licenseStatus === 'suspended' ? 'text-red-500' :
                                                'text-gray-400'
                                            }`}>
                                            {pharmacy.licenseStatus}
                                        </div>
                                        <div className="text-xs text-gray-400">{pharmacy.paymentStatus}</div>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-300">
                                        <div>{pharmacy._count.products} products</div>
                                        <div>{pharmacy._count.users} users</div>
                                        <div>{pharmacy._count.sales} sales</div>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-400">
                                        {new Date(pharmacy.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex gap-2">
                                            {pharmacy.subscriptionTier === 'free' && (
                                                <button
                                                    onClick={() => upgradePharmacy(pharmacy.id, 'professional')}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    Upgrade
                                                </button>
                                            )}
                                            {pharmacy.licenseStatus === 'active' ? (
                                                <button
                                                    onClick={() => suspendPharmacy(pharmacy.id)}
                                                    className="btn btn-danger btn-sm"
                                                >
                                                    Suspend
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => reactivatePharmacy(pharmacy.id)}
                                                    className="btn btn-success btn-sm"
                                                >
                                                    Activate
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSelectedPharmacy(pharmacy)}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pharmacy Details Modal */}
            {selectedPharmacy && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={() => setSelectedPharmacy(null)}>
                    <div className="bg-dark-surface rounded-xl p-8 max-w-2xl w-full mx-4"
                        onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-white mb-6">
                            {selectedPharmacy.name}
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-gray-400 text-sm">Email</div>
                                    <div className="text-white">{selectedPharmacy.email}</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-sm">Phone</div>
                                    <div className="text-white">{selectedPharmacy.phone}</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-sm">Subscription Tier</div>
                                    <div className="text-white font-semibold">{selectedPharmacy.subscriptionTier}</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-sm">License Status</div>
                                    <div className="text-white">{selectedPharmacy.licenseStatus}</div>
                                </div>
                                {selectedPharmacy.licenseKey && (
                                    <div className="col-span-2">
                                        <div className="text-gray-400 text-sm">License Key</div>
                                        <div className="text-primary font-mono">{selectedPharmacy.licenseKey}</div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-gray-400 text-sm">Products</div>
                                    <div className="text-white">{selectedPharmacy._count.products}</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-sm">Total Sales</div>
                                    <div className="text-white">{selectedPharmacy._count.sales}</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedPharmacy(null)}
                            className="btn btn-secondary mt-6"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
