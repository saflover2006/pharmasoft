import type { CartItem } from '../types';

export interface CNAMCalculation {
    totalPrice: number;
    cnamPortion: number;      // Part remboursée par CNAM
    patientPortion: number;   // Ticket modérateur (part patient)
    cnamRate: number;
}

/**
 * Calculate CNAM reimbursement for a single item
 */
export function calculateCNAM(
    price: number,
    isCNAMReimbursable: boolean,
    cnamRate: number | null | undefined
): CNAMCalculation {
    if (!isCNAMReimbursable || !cnamRate) {
        return {
            totalPrice: price,
            cnamPortion: 0,
            patientPortion: price,
            cnamRate: 0
        };
    }

    const cnamPortion = price * (cnamRate / 100);
    const patientPortion = price - cnamPortion;

    return {
        totalPrice: price,
        cnamPortion,
        patientPortion,
        cnamRate
    };
}

/**
 * Calculate CNAM totals for entire cart
 */
export function calculateCartCNAM(cart: CartItem[]) {
    let totalCNAM = 0;
    let totalPatient = 0;
    let totalPrice = 0;

    cart.forEach(item => {
        const itemPrice = item.product.public_price * item.quantity;
        const calc = calculateCNAM(
            itemPrice,
            (item.product as any).cnam_reimbursable || false,
            (item.product as any).cnam_rate
        );

        totalCNAM += calc.cnamPortion;
        totalPatient += calc.patientPortion;
        totalPrice += calc.totalPrice;
    });

    return {
        totalCNAM,
        totalPatient,
        totalPrice,
        hasCNAMItems: totalCNAM > 0
    };
}

/**
 * Format CNAM rate for display
 */
export function formatCNAMRate(rate: number | null | undefined): string {
    if (!rate) return '';
    return `${rate.toFixed(0)}%`;
}

/**
 * Get therapeutic class display name
 */
export const THERAPEUTIC_CLASSES = [
    { value: 'Antalgique', label: 'Antalgique' },
    { value: 'Antibiotique', label: 'Antibiotique' },
    { value: 'Anti-inflammatoire', label: 'Anti-inflammatoire' },
    { value: 'Antidiabétique', label: 'Antidiabétique' },
    { value: 'Antihypertenseur', label: 'Antihypertenseur' },
    { value: 'Cardiovasculaire', label: 'Cardiovasculaire' },
    { value: 'Gastro-intestinal', label: 'Gastro-intestinal' },
    { value: 'Respiratoire', label: 'Respiratoire' },
    { value: 'Dermatologique', label: 'Dermatologique' },
    { value: 'Neurologique', label: 'Neurologique' },
    { value: 'Autre', label: 'Autre' }
];

/**
 * CNAM reimbursement rates
 */
export const CNAM_RATES = [
    { value: 85, label: '85% (Normal)' },
    { value: 100, label: '100% (Maladies chroniques)' },
    { value: 70, label: '70% (Autres)' },
    { value: 50, label: '50% (Confort)' }
];
