import crypto from 'crypto';
import { prisma } from '../../../packages/database/src/index.ts';
import { parsePharmacyMeta, stringifyPharmacyMeta } from './pharmacyMeta.ts';

/**
 * License Key Service
 * Handles generation, validation, and management of PharmaSOFT licenses
 */

export interface LicenseInfo {
    licenseKey: string;
    tier: 'free' | 'professional' | 'enterprise';
    status: 'inactive' | 'active' | 'expired' | 'suspended';
    activatedAt?: Date;
    expiresAt?: Date;
    pharmacyId: number;
    features: string[];
}

export class LicenseService {

    /**
     * Generate a unique license key
     * Format: PHARMA-XXXX-XXXX-XXXX-XXXX
     */
    static generateLicenseKey(): string {
        const segments = [];
        for (let i = 0; i < 4; i++) {
            const segment = crypto.randomBytes(2).toString('hex').toUpperCase();
            segments.push(segment);
        }
        return `PHARMA-${segments.join('-')}`;
    }

    /**
     * Activate a license for a pharmacy
     */
    static async activateLicense(
        pharmacyId: number,
        tier: 'professional' | 'enterprise',
        durationMonths: number = 1
    ): Promise<string> {
        const licenseKey = this.generateLicenseKey();
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

        // Get tier limits
        const limits = this.getTierLimits(tier);
        const currentPharmacy = await prisma.pharmacy.findUnique({
            where: { id: pharmacyId },
            select: { featuresEnabled: true },
        });
        const meta = parsePharmacyMeta(currentPharmacy?.featuresEnabled);
        meta.features = [...limits.features];

        await prisma.pharmacy.update({
            where: { id: pharmacyId },
            data: {
                licenseKey,
                subscriptionTier: tier,
                licenseStatus: 'active',
                licenseActivatedAt: now,
                licenseExpiresAt: expiresAt,
                paymentStatus: 'paid',
                maxProducts: limits.maxProducts,
                maxUsers: limits.maxUsers,
                maxSalesPerMonth: limits.maxSalesPerMonth,
                featuresEnabled: stringifyPharmacyMeta(meta)
            }
        });

        return licenseKey;
    }

    /**
     * Validate a license key
     */
    static async validateLicense(licenseKey: string): Promise<{
        valid: boolean;
        pharmacy?: any;
        reason?: string;
    }> {
        const pharmacy = await prisma.pharmacy.findUnique({
            where: { licenseKey },
            select: {
                id: true,
                name: true,
                subscriptionTier: true,
                licenseStatus: true,
                licenseExpiresAt: true,
                paymentStatus: true,
                maxProducts: true,
                maxUsers: true,
                featuresEnabled: true
            }
        });

        if (!pharmacy) {
            return { valid: false, reason: 'Invalid license key' };
        }

        if (pharmacy.licenseStatus !== 'active') {
            return { valid: false, reason: 'License is not active' };
        }

        // Check expiration
        if (pharmacy.licenseExpiresAt && pharmacy.licenseExpiresAt < new Date()) {
            // Mark as expired
            await prisma.pharmacy.update({
                where: { licenseKey },
                data: { licenseStatus: 'expired' }
            });
            return { valid: false, reason: 'License has expired' };
        }

        if (pharmacy.paymentStatus === 'past_due' || pharmacy.paymentStatus === 'canceled') {
            return { valid: false, reason: 'Payment required' };
        }

        return { valid: true, pharmacy };
    }

    /**
     * Check if a pharmacy has access to a specific feature
     */
    static async hasFeature(pharmacyId: number, feature: string): Promise<boolean> {
        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: pharmacyId },
            select: { subscriptionTier: true, featuresEnabled: true }
        });

        if (!pharmacy) return false;

        const meta = parsePharmacyMeta(pharmacy.featuresEnabled);
        if (meta.features.length > 0) {
            return meta.features.includes(feature);
        }

        const limits = this.getTierLimits(pharmacy.subscriptionTier as any);
        return limits.features.includes(feature);
    }

    /**
     * Get tier limits and features
     */
    static getTierLimits(tier: 'free' | 'professional' | 'enterprise') {
        const tiers = {
            free: {
                maxProducts: 100,
                maxUsers: 1,
                maxSalesPerMonth: 50,
                features: [
                    'pos',
                    'inventory_basic',
                    'barcode_scan',
                    'low_stock_alerts',
                    'expiry_alerts',
                    'basic_reports'
                ]
            },
            professional: {
                maxProducts: -1, // unlimited
                maxUsers: 5,
                maxSalesPerMonth: -1, // unlimited
                features: [
                    'pos',
                    'inventory_advanced',
                    'barcode_scan',
                    'low_stock_alerts',
                    'expiry_alerts',
                    'advanced_reports',
                    'analytics_dashboard',
                    'cloud_backup',
                    'customer_management',
                    'invoice_generation',
                    'cnam_integration',
                    'thermal_printing',
                    'offline_mode',
                    'stock_adjustments',
                    'multi_payment_methods'
                ]
            },
            enterprise: {
                maxProducts: -1, // unlimited
                maxUsers: -1, // unlimited
                maxSalesPerMonth: -1, // unlimited
                features: [
                    'pos',
                    'inventory_advanced',
                    'barcode_scan',
                    'low_stock_alerts',
                    'expiry_alerts',
                    'advanced_reports',
                    'analytics_dashboard',
                    'cloud_backup',
                    'customer_management',
                    'invoice_generation',
                    'cnam_integration',
                    'thermal_printing',
                    'offline_mode',
                    'stock_adjustments',
                    'multi_payment_methods',
                    'multi_pharmacy',
                    'api_access',
                    'custom_integrations',
                    'dedicated_support',
                    'white_label'
                ]
            }
        };

        return tiers[tier];
    }

    /**
     * Start a free trial
     */
    static async startTrial(pharmacyId: number): Promise<void> {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

        const limits = this.getTierLimits('professional');
        const currentPharmacy = await prisma.pharmacy.findUnique({
            where: { id: pharmacyId },
            select: { featuresEnabled: true },
        });
        const meta = parsePharmacyMeta(currentPharmacy?.featuresEnabled);
        meta.features = [...limits.features];

        await prisma.pharmacy.update({
            where: { id: pharmacyId },
            data: {
                subscriptionTier: 'professional',
                trialEndsAt: trialEnd,
                licenseStatus: 'active',
                maxProducts: limits.maxProducts,
                maxUsers: limits.maxUsers,
                maxSalesPerMonth: limits.maxSalesPerMonth,
                featuresEnabled: stringifyPharmacyMeta(meta)
            }
        });
    }

    /**
     * Check and enforce limits
     */
    static async checkLimit(
        pharmacyId: number,
        limitType: 'products' | 'users' | 'sales'
    ): Promise<{ allowed: boolean; current: number; max: number }> {
        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: pharmacyId },
            select: {
                maxProducts: true,
                maxUsers: true,
                maxSalesPerMonth: true,
                products: { select: { id: true } },
                users: { select: { id: true } },
                sales: {
                    where: {
                        timestamp: {
                            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    },
                    select: { id: true }
                }
            }
        });

        if (!pharmacy) {
            return { allowed: false, current: 0, max: 0 };
        }

        let current = 0;
        let max = 0;

        switch (limitType) {
            case 'products':
                current = pharmacy.products.length;
                max = pharmacy.maxProducts;
                break;
            case 'users':
                current = pharmacy.users.length;
                max = pharmacy.maxUsers;
                break;
            case 'sales':
                current = pharmacy.sales.length;
                max = pharmacy.maxSalesPerMonth;
                break;
        }

        const allowed = max === -1 || current < max;
        return { allowed, current, max };
    }
}

