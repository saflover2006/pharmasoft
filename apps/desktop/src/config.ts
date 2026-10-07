// Application Configuration

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005/api';

export const APP_CONFIG = {
    name: 'PharmaSOFT POS',
    version: '1.0.0',
    locale: 'fr-TN',
    currency: 'TND',
    taxRate: 0.07, // 7% VAT
};
