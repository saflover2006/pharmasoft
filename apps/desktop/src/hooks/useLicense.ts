import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/database.service';

export interface LicenseStatus {
    tier: 'free' | 'professional' | 'enterprise';
    status: 'inactive' | 'active' | 'expired' | 'suspended';
    expiresAt?: string;
    trialEndsAt?: string;
    paymentStatus: string;
    limits: {
        products: { current: number; max: number };
        users: { current: number; max: number };
        sales: { current: number; max: number };
    };
    features: string[];
}

/**
 * Hook to manage license and subscription status
 */
export function useLicense(enabled: boolean = true) {
    const [license, setLicense] = useState<LicenseStatus | null>(null);
    const [loading, setLoading] = useState(enabled);

    const fetchLicenseStatus = useCallback(async () => {
        if (!enabled) {
            setLicense(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await apiRequest<LicenseStatus>('/api/license/status');
            if (response.success && response.data) {
                setLicense(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch license status:', error);
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        void fetchLicenseStatus();
    }, [fetchLicenseStatus]);

    const refresh = useCallback(() => {
        void fetchLicenseStatus();
    }, [fetchLicenseStatus]);

    return { license, loading, refresh };
}

/**
 * Hook to check if a specific feature is available
 */
export function useFeature(feature: string, enabled: boolean = true) {
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(enabled);

    useEffect(() => {
        const checkFeature = async () => {
            if (!enabled) {
                setHasAccess(false);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await apiRequest<{ hasAccess: boolean; feature: string }>(`/api/features/${feature}`);
                if (response.success && response.data) {
                    setHasAccess(response.data.hasAccess);
                }
            } catch (error) {
                console.error(`Failed to check feature access for ${feature}:`, error);
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        };

        void checkFeature();
    }, [enabled, feature]);

    return { hasAccess, loading };
}

/**
 * Hook to check usage limits
 */
export function useLimit(type: 'products' | 'users' | 'sales', enabled: boolean = true) {
    const [limit, setLimit] = useState<{ allowed: boolean; current: number; max: number } | null>(null);
    const [loading, setLoading] = useState(enabled);

    const checkLimit = useCallback(async () => {
        if (!enabled) {
            setLimit(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await apiRequest<{ allowed: boolean; current: number; max: number }>(`/api/limits/check/${type}`);
            if (response.success && response.data) {
                setLimit(response.data);
            }
        } catch (error) {
            console.error(`Failed to check ${type} limit:`, error);
        } finally {
            setLoading(false);
        }
    }, [enabled, type]);

    useEffect(() => {
        void checkLimit();
    }, [checkLimit]);

    const refresh = useCallback(() => {
        void checkLimit();
    }, [checkLimit]);

    return { limit, loading, refresh };
}

/**
 * Hook to start free trial
 */
export function useTrial() {
    const [starting, setStarting] = useState(false);

    const startTrial = async () => {
        try {
            setStarting(true);
            const response = await apiRequest<{ message: string }>('/api/trial/start', {
                method: 'POST'
            });

            if (!response.success) {
                return { success: false, message: response.error?.message || 'Failed to start trial' };
            }

            return { success: true, message: response.data.message };
        } catch (error) {
            console.error('Failed to start trial:', error);
            return { success: false, message: 'Network error' };
        } finally {
            setStarting(false);
        }
    };

    return { startTrial, starting };
}

/**
 * Hook to create Stripe checkout session
 */
export function useCheckout() {
    const [creating, setCreating] = useState(false);

    const createCheckout = async (tier: 'professional' | 'enterprise') => {
        try {
            setCreating(true);
            const response = await apiRequest<{ url: string }>('/api/checkout/create', {
                method: 'POST',
                body: JSON.stringify({ tier })
            });

            if (!response.success) {
                return { success: false, message: response.error?.message || 'Failed to create checkout' };
            }

            if (response.data && response.data.url) {
                // Redirect to Stripe Checkout
                window.location.href = response.data.url;
                return { success: true };
            }

            return { success: false, message: 'Invalid response from server' };
        } catch (error) {
            console.error('Failed to create checkout:', error);
            return { success: false, message: 'Network error' };
        } finally {
            setCreating(false);
        }
    };

    return { createCheckout, creating };
}



/**
 * Calculate days remaining for trial
 */
export function useTrialDaysRemaining(trialEndsAt?: string) {
    if (!trialEndsAt) return null;

    const now = new Date();
    const endDate = new Date(trialEndsAt);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
}
