import { useState, useEffect } from 'react';
import {
    LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatPrice } from '../utils/calculations';
import { apiRequest } from '../services/database.service';

interface DashboardStats {
    today: {
        revenue: number;
        sales: number;
        customers: number;
        cnamAmount: number;
        patientAmount: number;
    };
    trends: {
        revenue: Array<{ date: string; amount: number }>;
        sales: Array<{ date: string; count: number }>;
    };
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
    topCustomers: Array<{ name: string; invoices: number; total: number }>;
    cnamBreakdown: { cnamAmount: number; patientAmount: number };
    comparisons: {
        revenueGrowth: number;
        salesGrowth: number;
        customerGrowth: number;
    };
}

interface AnalyticsDashboardProps {
    onClose: () => void;
}

export default function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, [dateRange]);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch REAL data from API using authenticated helper
            const result = await apiRequest<DashboardStats>(`/stats/dashboard?range=${dateRange}`);

            if (result.success) {
                setStats(result.data);
            } else {
                throw new Error(result.error?.message || 'Failed to load stats');
            }
        } catch (err: any) {
            console.error('Stats loading error:', err);
            setError(err.message || 'Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    const COLORS = {
        primary: '#2980b9',
        success: '#27ae60',
        warning: '#e67e22',
        danger: '#e74c3c',
        info: '#3498db'
    };

    const PIE_COLORS = [COLORS.success, COLORS.warning];

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md">
                    <h3 className="text-xl font-bold text-red-600 mb-4">Erreur</h3>
                    <p className="text-gray-700 mb-4">{error || 'Failed to load statistics'}</p>
                    <button onClick={loadStats} className="btn-primary mr-2">Réessayer</button>
                    <button onClick={onClose} className="btn-secondary">Fermer</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold">📊 Tableau de Bord Analytique</h2>
                            <p className="text-blue-100 mt-1">Données en temps réel de votre activité</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Date Range Selector */}
                    <div className="mt-4 flex gap-2">
                        {(['today', 'week', 'month', 'year'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateRange === range
                                    ? 'bg-white text-blue-600'
                                    : 'bg-blue-500 text-white hover:bg-blue-400'
                                    }`}
                            >
                                {range === 'today' ? "Aujourd'hui" : range === 'week' ? 'Semaine' : range === 'month' ? 'Mois' : 'Année'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Revenue Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-600">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Chiffre d'Affaires</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-2">
                                        {formatPrice(stats.today.revenue)}
                                    </h3>
                                    <p className="text-sm mt-2">
                                        <span className={`font-semibold ${stats.comparisons.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {stats.comparisons.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.comparisons.revenueGrowth)}%
                                        </span>
                                        <span className="text-gray-500 ml-1">vs période précédente</span>
                                    </p>
                                </div>
                                <div className="text-blue-600 text-4xl">💰</div>
                            </div>
                        </div>

                        {/* Sales Card */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-600">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Ventes</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.today.sales}</h3>
                                    <p className="text-sm mt-2">
                                        <span className="font-semibold text-green-600">
                                            {stats.comparisons.salesGrowth >= 0 ? '+' : ''}{stats.comparisons.salesGrowth}% factures
                                        </span>
                                    </p>
                                </div>
                                <div className="text-green-600 text-4xl">🛒</div>
                            </div>
                        </div>

                        {/* Customers Card */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-l-4 border-purple-600">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Clients Actifs</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.today.customers}</h3>
                                    <p className="text-sm mt-2">
                                        <span className="font-semibold text-purple-600">
                                            Période en cours
                                        </span>
                                    </p>
                                </div>
                                <div className="text-purple-600 text-4xl">👥</div>
                            </div>
                        </div>

                        {/* CNAM Card */}
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border-l-4 border-orange-600">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Part CNAM</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-2">
                                        {formatPrice(stats.today.cnamAmount)}
                                    </h3>
                                    <p className="text-sm mt-2">
                                        <span className="font-semibold text-orange-600">
                                            {stats.today.revenue > 0 ? ((stats.today.cnamAmount / stats.today.revenue) * 100).toFixed(0) : 0}% du total
                                        </span>
                                    </p>
                                </div>
                                <div className="text-orange-600 text-4xl">💊</div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Trend Chart */}
                        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Évolution du Chiffre d'Affaires</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={stats.trends.revenue}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" stroke="#666" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                                        formatter={(value: number | undefined) => [`${(value || 0).toFixed(2)} TND`, 'Revenue']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="amount"
                                        stroke={COLORS.primary}
                                        strokeWidth={3}
                                        dot={{ fill: COLORS.primary, r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* CNAM Breakdown Pie Chart */}
                        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">🥧 Répartition CNAM / Patient</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Part CNAM', value: stats.cnamBreakdown.cnamAmount },
                                            { name: 'Part Patient', value: stats.cnamBreakdown.patientAmount }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {PIE_COLORS.map((color, index) => (
                                            <Cell key={`cell-${index}`} fill={color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number | undefined) => `${(value || 0).toFixed(3)} TND`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Products and Customers */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Products */}
                        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 Top Produits</h3>
                            {stats.topProducts.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.topProducts.slice(0, 5).map((product, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{product.name}</p>
                                                    <p className="text-sm text-gray-500">{product.quantity} vendus</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-gray-700">{formatPrice(product.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Aucune vente pour cette période</p>
                            )}
                        </div>

                        {/* Top Customers */}
                        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">👤 Top Clients</h3>
                            {stats.topCustomers.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.topCustomers.map((customer, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{customer.name}</p>
                                                    <p className="text-sm text-gray-500">{customer.invoices} factures</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-gray-700">{formatPrice(customer.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Aucun client pour cette période</p>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={loadStats} className="btn-secondary">
                            🔄 Actualiser
                        </button>
                        <button onClick={onClose} className="btn-primary">
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
