import { useState } from 'react';
import { AuthService, PharmacyService } from '../services/database.service';
import type { AuthenticatedUser } from '../types';

interface LoginProps {
    onLoginSuccess: (user: { user: AuthenticatedUser } | AuthenticatedUser) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // License Activation State
    const [showActivation, setShowActivation] = useState(false);
    const [licenseKey, setLicenseKey] = useState('');
    const [pendingUser, setPendingUser] = useState<AuthenticatedUser | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await AuthService.login(username, password);

            if (result.success) {
                if (result.data.user.isPlatformAdmin) {
                    onLoginSuccess(result.data);
                    return;
                }

                // Check if pharmacy has a license key (Desktop Restriction)
                try {
                    const pharmacyRes = await PharmacyService.getProfile();
                    if (pharmacyRes.success && pharmacyRes.data && pharmacyRes.data.licenseStatus === 'active') {
                        onLoginSuccess(result.data);
                    } else {
                        // Don't logout yet, offer activation
                        setPendingUser(result.data.user);
                        setShowActivation(true);
                        setError('Desktop access requires a valid Pro license. Please enter your key below.');
                    }
                } catch (licError) {
                    console.error('License check failed:', licError);
                    AuthService.logout();
                    setError('Could not verify license. Desktop access denied.');
                }
            } else {
                setError(result.error?.message || 'Login failed');
            }
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await PharmacyService.redeemLicense(licenseKey);
            if (result.success) {
                // License activated!
                // Update pending user with new tier and key so the app allows access immediately
                if (pendingUser) {
                    const updatedUser = {
                        ...pendingUser,
                        subscriptionTier: result.data.tier, // 'professional'
                        licenseKey: licenseKey
                    };
                    onLoginSuccess(updatedUser);
                } else {
                    // Should not happen, but fallback
                    setShowActivation(false);
                    setError('Session lost. Please log in again.');
                    AuthService.logout();
                }
            } else {
                setError(result.error?.message || 'Activation failed. Invalid key.');
            }
        } catch {
            setError('Activation error. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartTrial = async () => {
        setError('');
        setIsLoading(true);
        try {
            const result = await PharmacyService.startTrial();
            if (result.success) {
                if (pendingUser) {
                    const updatedUser = {
                        ...pendingUser,
                        subscriptionTier: 'professional',
                        trialActive: true,
                        // Set approximate trial end for immediate UI update
                        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                    };
                    onLoginSuccess(updatedUser);
                } else {
                    setShowActivation(false);
                    AuthService.logout();
                }
            } else {
                setError(result.error?.message || 'Could not start trial.');
            }
        } catch {
            setError('Connection error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-bg via-dark-surface to-dark-elevated p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl mb-4">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text">
                        PharmaSOFT POS
                    </h1>
                    <p className="text-gray-400 mt-2">
                        {showActivation ? 'Activate Pro Version' : 'Sign in to your account'}
                    </p>
                </div>

                {/* Login/Activation Card */}
                <div className="bg-dark-surface rounded-2xl shadow-2xl border border-dark-border p-8">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center mb-6">
                            <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {!showActivation ? (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                                    Email or Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500 transition-colors"
                                    placeholder="Enter email or username"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500 transition-colors"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full btn-primary py-4 rounded-xl font-bold text-lg shadow-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-[1.02] transition-transform"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Verifying...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleActivate} className="space-y-6">
                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg mb-4">
                                <p className="text-sm text-blue-300">
                                    You have successfully authenticated, but this Desktop App requires a Professional License.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="licenseKey" className="block text-sm font-medium text-gray-300 mb-2">
                                    Enter License Key
                                </label>
                                <input
                                    id="licenseKey"
                                    type="text"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500 transition-colors font-mono tracking-wider"
                                    placeholder="PHARMA-XXXX-XXXX-XXXX-XXXX"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Check your email or subscription details for your key.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowActivation(false);
                                            setPendingUser(null);
                                            AuthService.logout();
                                            setError('');
                                        }}
                                        className="flex-1 px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-gray-300 hover:text-white hover:bg-dark-border transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-[2] btn-primary py-3 rounded-xl font-bold text-lg shadow-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-[1.02] transition-transform"
                                    >
                                        {isLoading ? 'Activating...' : 'Activate License'}
                                    </button>
                                </div>

                                <div className="text-center relative py-2">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
                                    <div className="relative z-10 inline-block px-2 bg-dark-surface text-gray-500 text-xs uppercase bg-[#1e293b]">Or</div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleStartTrial}
                                    disabled={isLoading}
                                    className="w-full py-3 border border-blue-500/50 text-blue-400 rounded-xl hover:bg-blue-500/10 transition-colors font-medium text-sm"
                                >
                                    Start 14-Day Free Trial
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {showActivation && (
                    <div className="text-center mt-6">
                        <a href="https://pharmasoft.com/pricing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover text-sm">
                            Don't have a key? Get Pro
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
