export interface PharmacyMeta {
    features: string[];
    receiptFooter?: string;
    lastInvoice?: unknown;
    billingHistory?: unknown[];
    onboarding?: Record<string, unknown>;
    productAccess?: Record<string, unknown>;
    [key: string]: unknown;
}

export function parsePharmacyMeta(featuresEnabled?: string | null): PharmacyMeta {
    if (!featuresEnabled) {
        return { features: [] };
    }

    try {
        const parsed = JSON.parse(featuresEnabled) as unknown;

        if (Array.isArray(parsed)) {
            return {
                features: parsed.filter((value): value is string => typeof value === 'string'),
            };
        }

        if (!parsed || typeof parsed !== 'object') {
            return { features: [] };
        }

        const meta = parsed as Record<string, unknown>;
        return {
            ...meta,
            features: Array.isArray(meta.features)
                ? meta.features.filter((value): value is string => typeof value === 'string')
                : [],
        };
    } catch {
        return { features: [] };
    }
}

export function stringifyPharmacyMeta(meta: PharmacyMeta): string {
    return JSON.stringify({
        ...meta,
        features: Array.isArray(meta.features)
            ? meta.features.filter((value): value is string => typeof value === 'string')
            : [],
    });
}
