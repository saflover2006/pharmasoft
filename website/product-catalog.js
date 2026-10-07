const fs = require('fs');
const path = require('path');

const DEFAULT_PRODUCTS = {
    pharmasoft: {
        id: 'pharmasoft',
        name: 'PharmaSOFT',
        category: 'pharmacy',
        web: {
            access: 'account_required',
            pricing: 'free',
        },
        desktop: {
            access: 'purchase_required',
            pricing: 'paid',
            demoPublic: false,
        },
        purchasable: true,
        plans: {
            monthly: {
                amount: 29,
                tier: 'professional',
                label: 'Professional (Monthly)',
                licenseKeyPrefix: 'PRO',
                billingMonths: 1,
            },
            yearly: {
                amount: 290,
                tier: 'professional',
                label: 'Professional (Yearly)',
                licenseKeyPrefix: 'PRO',
                billingMonths: 12,
            },
            enterprise: {
                amount: 990,
                tier: 'enterprise',
                label: 'Enterprise',
                licenseKeyPrefix: 'ENT',
                billingMonths: 12,
            },
            lifetime: {
                amount: 999,
                tier: 'professional',
                label: 'Lifetime Access',
                licenseKeyPrefix: 'LIFE',
                billingMonths: null,
            },
        },
    },

};

const DATA_DIRECTORY = path.join(__dirname, 'data');
const CATALOG_FILE_PATH = path.join(DATA_DIRECTORY, 'product-catalog.json');

function ensureCatalogFile() {
    if (!fs.existsSync(DATA_DIRECTORY)) {
        fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
    }

    if (!fs.existsSync(CATALOG_FILE_PATH)) {
        fs.writeFileSync(CATALOG_FILE_PATH, JSON.stringify(DEFAULT_PRODUCTS, null, 2), 'utf8');
    }
}

function readCatalog() {
    ensureCatalogFile();
    return JSON.parse(fs.readFileSync(CATALOG_FILE_PATH, 'utf8'));
}

function writeCatalog(catalog) {
    ensureCatalogFile();
    fs.writeFileSync(CATALOG_FILE_PATH, JSON.stringify(catalog, null, 2), 'utf8');
}

function getProductCatalog() {
    return readCatalog();
}

function getPublicProductCatalog() {
    return Object.values(readCatalog()).map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        web: product.web,
        desktop: product.desktop,
        plans: Object.entries(product.plans).map(([planId, plan]) => ({
            planId,
            amount: plan.amount,
            tier: plan.tier,
            label: plan.label,
        })),
    }));
}

function getAdminProductCatalog() {
    return Object.values(readCatalog());
}

function updateProductCatalogProduct(productId, updates) {
    const catalog = readCatalog();
    const key = String(productId || '').toLowerCase();
    const existingProduct = catalog[key];

    if (!existingProduct) {
        throw new Error(`Unknown product: ${productId}`);
    }

    catalog[key] = {
        ...existingProduct,
        ...(typeof updates.name === 'string' ? { name: updates.name } : {}),
        ...(typeof updates.category === 'string' ? { category: updates.category } : {}),
        ...(typeof updates.purchasable === 'boolean' ? { purchasable: updates.purchasable } : {}),
        ...(updates.web && typeof updates.web === 'object' ? { web: { ...existingProduct.web, ...updates.web } } : {}),
        ...(updates.desktop && typeof updates.desktop === 'object' ? { desktop: { ...existingProduct.desktop, ...updates.desktop } } : {}),
        ...(updates.plans && typeof updates.plans === 'object'
            ? {
                plans: {
                    ...existingProduct.plans,
                    ...Object.fromEntries(
                        Object.entries(updates.plans).map(([planId, planUpdate]) => {
                            const currentPlan = existingProduct.plans[planId] || {};
                            return [
                                planId,
                                {
                                    ...currentPlan,
                                    ...planUpdate,
                                    ...(planUpdate.amount !== undefined ? { amount: Number(planUpdate.amount) || 0 } : {}),
                                },
                            ];
                        })
                    ),
                },
            }
            : {}),
    };

    writeCatalog(catalog);
    return catalog[key];
}

function buildPlanDefinitions(productId, plans = {}) {
    const prefixBase = String(productId || 'app').replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'APP';
    const definitions = {};

    if (plans.monthly !== undefined && plans.monthly !== null && plans.monthly !== '') {
        definitions.monthly = {
            amount: Number(plans.monthly) || 0,
            tier: 'professional',
            label: 'Professional (Monthly)',
            licenseKeyPrefix: `${prefixBase}PRO`,
            billingMonths: 1,
        };
    }

    if (plans.yearly !== undefined && plans.yearly !== null && plans.yearly !== '') {
        definitions.yearly = {
            amount: Number(plans.yearly) || 0,
            tier: 'professional',
            label: 'Professional (Yearly)',
            licenseKeyPrefix: `${prefixBase}PRO`,
            billingMonths: 12,
        };
    }

    if (plans.enterprise !== undefined && plans.enterprise !== null && plans.enterprise !== '') {
        definitions.enterprise = {
            amount: Number(plans.enterprise) || 0,
            tier: 'enterprise',
            label: 'Enterprise',
            licenseKeyPrefix: `${prefixBase}ENT`,
            billingMonths: 12,
        };
    }

    if (plans.lifetime !== undefined && plans.lifetime !== null && plans.lifetime !== '') {
        definitions.lifetime = {
            amount: Number(plans.lifetime) || 0,
            tier: 'professional',
            label: 'Lifetime Access',
            licenseKeyPrefix: `${prefixBase}LIFE`,
            billingMonths: null,
        };
    }

    return definitions;
}

function createProductCatalogProduct(input) {
    const catalog = readCatalog();
    const id = String(input.id || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!id) {
        throw new Error('Product id is required');
    }

    if (catalog[id]) {
        throw new Error(`Product already exists: ${id}`);
    }

    const name = String(input.name || '').trim();
    if (!name) {
        throw new Error('Product name is required');
    }

    const product = {
        id,
        name,
        category: String(input.category || 'general').trim().toLowerCase(),
        web: {
            access: String(input.web?.access || 'account_required'),
            pricing: String(input.web?.pricing || 'free'),
        },
        desktop: {
            access: String(input.desktop?.access || 'purchase_required'),
            pricing: String(input.desktop?.pricing || 'paid'),
            demoPublic: Boolean(input.desktop?.demoPublic),
        },
        purchasable: Boolean(input.purchasable),
        plans: buildPlanDefinitions(id, input.plans || {}),
    };

    catalog[id] = product;
    writeCatalog(catalog);
    return product;
}

module.exports = {
    getProductCatalog,
    getPublicProductCatalog,
    getAdminProductCatalog,
    updateProductCatalogProduct,
    createProductCatalogProduct,
};
