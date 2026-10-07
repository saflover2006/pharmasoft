const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const defaultDbPath = path.resolve(__dirname, '..', 'packages', 'database', 'prisma', 'dev.db');
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:..')) {
    process.env.DATABASE_URL = `file:${defaultDbPath.replace(/\\/g, '/')}`;
}
const { prisma } = require('../packages/database/src/index.ts');
const { getProductCatalog, getPublicProductCatalog, getAdminProductCatalog, updateProductCatalogProduct, createProductCatalogProduct } = require('./product-catalog');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const DESKTOP_RELEASE_DIR = path.join(__dirname, '..', 'apps', 'desktop', 'release');
const WINDOWS_INSTALLER_NAME = 'PharmaSOFT Setup 0.0.0.exe';
const DENTFLOW_WEB_DIST_DIR = path.join(__dirname, '..', 'cabinet', 'frontend', 'dist');
const DENTFLOW_DESKTOP_RELEASE_DIR = path.join(__dirname, '..', 'cabinet', 'frontend', 'release');
const DENTFLOW_BACKEND_DIST_PATH = path.join(__dirname, '..', 'cabinet', 'backend', 'dist', 'src', 'main.js');
const DENTFLOW_BACKEND_WORKDIR = path.join(__dirname, '..', 'cabinet', 'backend');
const DENTFLOW_BACKEND_PORT = Number(process.env.DENTFLOW_BACKEND_PORT) || 3011;
const DENTFLOW_EMBEDDED_DATABASE_URL = process.env.DENTFLOW_DATABASE_URL || 'postgresql://dentflow_user:dentflow_password_2025@127.0.0.1:54329/dentflow_db';
const DENTFLOW_INTERNAL_API_KEY = process.env.DENTFLOW_INTERNAL_API_KEY || crypto.randomBytes(32).toString('hex');
const UPLOADS_DIR = process.env.WEBSITE_UPLOADS_DIR || path.join(os.tmpdir(), 'pharmasoft-website-uploads');
const UPLOAD_RETENTION_DAYS = Number(process.env.WEBSITE_UPLOAD_RETENTION_DAYS) || 30;
const UPLOAD_CLEANUP_HISTORY_FILE = path.join(os.tmpdir(), 'pharmasoft-website-upload-cleanup-history.json');
const UPLOAD_CLEANUP_HISTORY_LIMIT = 30;
const UPLOAD_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL = '30m';
const MAX_TICKET_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;
const EXPOSE_RESET_LINKS = process.env.WEBSITE_EXPOSE_RESET_LINKS === 'true';

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not set. Using an ephemeral website secret for this process.');
}

if (!process.env.DENTFLOW_INTERNAL_API_KEY) {
    console.warn('DENTFLOW_INTERNAL_API_KEY is not set. Using a random per-process internal key.');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(require('express').static(require('path').join(__dirname), { index: false }));
app.use('/downloads', express.static(DESKTOP_RELEASE_DIR));
app.use('/downloads/dentflow', express.static(DENTFLOW_DESKTOP_RELEASE_DIR));
app.use('/dentflow', express.static(DENTFLOW_WEB_DIST_DIR));

const WEBSITE_PAGES = new Set([
    'index.html',
    'admin.html',
    'admin-pro.html',
    'dashboard.html',
    'dashboard-user.html',
    'invoice.html',
    'reset-password.html',
]);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page', (req, res, next) => {
    const page = String(req.params.page || '');
    if (!WEBSITE_PAGES.has(page)) {
        return next();
    }

    return res.sendFile(path.join(__dirname, page));
});

let dentflowBackendProcess = null;
let dentflowBackendReadyPromise = null;

function hasDentflowWebApp() {
    return fs.existsSync(path.join(DENTFLOW_WEB_DIST_DIR, 'index.html'));
}

function hasDentflowDesktopDemo() {
    return Boolean(getDentflowDesktopArtifact());
}

function getDentflowDesktopArtifact() {
    if (!fs.existsSync(DENTFLOW_DESKTOP_RELEASE_DIR)) {
        return null;
    }

    const entries = fs.readdirSync(DENTFLOW_DESKTOP_RELEASE_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

    const preferredExecutables = files
        .filter((fileName) => fileName.toLowerCase().endsWith('.exe'))
        .sort((left, right) => left.localeCompare(right));

    if (preferredExecutables.length > 0) {
        const artifactName = preferredExecutables[0];
        const artifactPath = path.join(DENTFLOW_DESKTOP_RELEASE_DIR, artifactName);

        return {
            url: `/downloads/dentflow/${encodeURIComponent(artifactName)}`,
            version: '1.0.0',
            size: `${(fs.statSync(artifactPath).size / (1024 * 1024)).toFixed(1)} MB`,
            format: 'exe'
        };
    }

    const preferredArchives = files
        .filter((fileName) => fileName.toLowerCase().endsWith('.zip'))
        .sort((left, right) => left.localeCompare(right));

    if (preferredArchives.length > 0) {
        const artifactName = preferredArchives[0];
        const artifactPath = path.join(DENTFLOW_DESKTOP_RELEASE_DIR, artifactName);

        return {
            url: `/downloads/dentflow/${encodeURIComponent(artifactName)}`,
            version: '1.0.0',
            size: `${(fs.statSync(artifactPath).size / (1024 * 1024)).toFixed(1)} MB`,
            format: 'zip'
        };
    }

    return null;
}

async function waitForDentflowBackendReady(maxAttempts = 20, delayMs = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
            const response = await fetch(`http://127.0.0.1:${DENTFLOW_BACKEND_PORT}/api/auth/me`, {
                method: 'GET',
            });

            if (response.status >= 200) {
                return true;
            }
        } catch (error) {
            // Ignore connection errors while waiting for the child process to boot.
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('DentFlow backend did not become ready in time');
}

function startDentflowBackend() {
    if (!fs.existsSync(DENTFLOW_BACKEND_DIST_PATH)) {
        return Promise.reject(new Error(`DentFlow backend build not found at ${DENTFLOW_BACKEND_DIST_PATH}`));
    }

    if (dentflowBackendReadyPromise) {
        return dentflowBackendReadyPromise;
    }

    if (dentflowBackendProcess) {
        dentflowBackendReadyPromise = waitForDentflowBackendReady()
            .finally(() => {
                dentflowBackendReadyPromise = null;
            });
        return dentflowBackendReadyPromise;
    }

    dentflowBackendProcess = spawn(process.execPath, [DENTFLOW_BACKEND_DIST_PATH], {
        cwd: DENTFLOW_BACKEND_WORKDIR,
        env: {
            ...process.env,
            PORT: String(DENTFLOW_BACKEND_PORT),
            DB_MODE: 'embedded',
            DATABASE_URL: DENTFLOW_EMBEDDED_DATABASE_URL,
            DENTFLOW_INTERNAL_API_KEY,
            NODE_ENV: process.env.NODE_ENV || 'production',
        },
        stdio: 'pipe',
        windowsHide: true,
    });

    dentflowBackendProcess.stdout?.on('data', (chunk) => {
        const message = String(chunk).trim();
        if (message) {
            console.log(`[DentFlow] ${message}`);
        }
    });

    dentflowBackendProcess.stderr?.on('data', (chunk) => {
        const message = String(chunk).trim();
        if (message) {
            console.error(`[DentFlow] ${message}`);
        }
    });

    dentflowBackendProcess.on('exit', (code, signal) => {
        console.warn(`[DentFlow] backend stopped (code=${code}, signal=${signal})`);
        dentflowBackendProcess = null;
        dentflowBackendReadyPromise = null;
    });

    dentflowBackendReadyPromise = waitForDentflowBackendReady()
        .finally(() => {
            dentflowBackendReadyPromise = null;
        });

    return dentflowBackendReadyPromise;
}

async function proxyDentflowApi(req, res) {
    const targetUrl = `http://127.0.0.1:${DENTFLOW_BACKEND_PORT}/api${req.originalUrl.replace(/^\/dentflow\/api/, '')}`;

    try {
        const headers = {};
        const blockedHeaders = new Set(['host', 'content-length', 'connection', 'expect', 'transfer-encoding']);

        for (const [key, value] of Object.entries(req.headers)) {
            if (!value || blockedHeaders.has(key)) {
                continue;
            }

            headers[key] = value;
        }

        const requestOptions = {
            method: req.method,
            headers,
            redirect: 'manual',
        };

        if (!['GET', 'HEAD'].includes(req.method)) {
            requestOptions.body = JSON.stringify(req.body || {});
            if (!requestOptions.headers['content-type']) {
                requestOptions.headers['content-type'] = 'application/json';
            }
        }

        await startDentflowBackend();
        const response = await fetch(targetUrl, requestOptions);

        const payload = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type');

        if (contentType) {
            res.setHeader('content-type', contentType);
        }

        res.status(response.status).send(payload);
    } catch (error) {
        console.error('DentFlow API proxy error:', error);
        res.status(502).json({
            success: false,
            error: { message: 'DentFlow service is temporarily unavailable' }
        });
    }
}

app.use('/dentflow/api', proxyDentflowApi);

app.get('/dentflow', (req, res) => {
    res.redirect('/dentflow/');
});

app.get('/dentflow/', (req, res, next) => {
    if (!hasDentflowWebApp()) {
        return res.status(503).send('DentFlow web app is not built yet.');
    }

    return res.sendFile(path.join(DENTFLOW_WEB_DIST_DIR, 'index.html'));
});

function handleError(res, error) {
    console.error('Website API error:', error);

    if (error && error.code === 'P2002') {
        return res.status(400).json({
            success: false,
            error: { message: 'A record with that value already exists', code: 'P2002' }
        });
    }

    return res.status(500).json({
        success: false,
        error: { message: 'Internal server error' }
    });
}

function parseJson(value, fallback = null) {
    if (!value) {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        console.warn('Failed to parse JSON value:', error);
        return fallback;
    }
}

function getPasswordFingerprint(passwordHash) {
    return crypto.createHash('sha256').update(passwordHash).digest('hex');
}

function getPharmacyMeta(pharmacy = {}) {
    const parsed = parseJson(pharmacy.featuresEnabled, {}) || {};
    const meta = Array.isArray(parsed) ? { features: parsed } : parsed;

    if (!Array.isArray(meta.features)) {
        meta.features = [];
    }

    if (!Array.isArray(meta.billingHistory)) {
        meta.billingHistory = [];
    }

    if (meta.billingHistory.length === 0 && meta.lastInvoice) {
        meta.billingHistory = [buildBillingEntry(meta.lastInvoice)];
    }

    if (!meta.onboarding || typeof meta.onboarding !== 'object' || Array.isArray(meta.onboarding)) {
        meta.onboarding = {};
    }

    if (!meta.productAccess || typeof meta.productAccess !== 'object' || Array.isArray(meta.productAccess)) {
        meta.productAccess = {};
    }

    if (!meta.productAccess.pharmasoft || typeof meta.productAccess.pharmasoft !== 'object' || Array.isArray(meta.productAccess.pharmasoft)) {
        meta.productAccess.pharmasoft = {
            web: true,
            desktopPurchased: false,
            status: 'active',
        };
    }

    return meta;
}

function getDesktopTierFeatures(tier) {
    const normalizedTier = String(tier || 'free').toLowerCase();

    if (normalizedTier === 'enterprise') {
        return [
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
        ];
    }

    if (normalizedTier === 'professional') {
        return [
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
        ];
    }

    return [
        'pos',
        'inventory_basic',
        'barcode_scan',
        'low_stock_alerts',
        'expiry_alerts',
        'basic_reports'
    ];
}

function ensureProductAccess(meta, product) {
    const existing = meta.productAccess[product.id];
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        return existing;
    }

    meta.productAccess[product.id] = {
        productId: product.id,
        name: product.name,
        web: false,
        desktopPurchased: false,
        status: 'inactive',
    };

    return meta.productAccess[product.id];
}

async function savePharmacyMeta(pharmacyId, meta) {
    return prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: { featuresEnabled: JSON.stringify(meta) },
    });
}

function normalizeStatus(status, fallback = 'paid') {
    const normalized = String(status || fallback).toLowerCase();
    if (normalized === 'manual') {
        return 'manual';
    }

    if (normalized === 'unpaid' || normalized === 'canceled') {
        return 'unpaid';
    }

    if (normalized === 'failed' || normalized === 'past_due') {
        return 'failed';
    }

    if (normalized === 'pending') {
        return 'pending';
    }

    return 'paid';
}

function buildBillingEntry({
    id,
    amount,
    description,
    productId,
    planId,
    status,
    source,
    createdAt,
    nextBillingDate
}) {
    const created = createdAt ? new Date(createdAt) : new Date();

    return {
        id,
        date: created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: created.toISOString(),
        amount: Number(amount).toFixed(2),
        description,
        productId: productId || 'pharmasoft',
        planId: planId || 'monthly',
        status: normalizeStatus(status),
        source: source || 'self-service',
        nextBillingDate: nextBillingDate || null
    };
}

function appendBillingEntry(meta, entry) {
    const billingEntry = buildBillingEntry(entry);
    meta.lastInvoice = billingEntry;
    meta.billingHistory = [billingEntry, ...meta.billingHistory.filter((item) => item.id !== billingEntry.id)].slice(0, 50);
    return billingEntry;
}

function buildBillingState(pharmacy) {
    const meta = getPharmacyMeta(pharmacy);
    const invoices = [...meta.billingHistory].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return {
        currentPlan: pharmacy.subscriptionTier || 'free',
        paymentStatus: normalizeStatus(pharmacy.paymentStatus, 'unpaid'),
        renewalDate: pharmacy.licenseExpiresAt ? new Date(pharmacy.licenseExpiresAt).toISOString() : null,
        invoices
    };
}

function buildOnboardingTasks({ pharmacy, ticketCount }) {
    const meta = getPharmacyMeta(pharmacy);
    const onboarding = meta.onboarding || {};
    const paidTier = ['professional', 'enterprise'].includes((pharmacy.subscriptionTier || '').toLowerCase());

    return [
        {
            id: 'complete_profile',
            title: 'Review pharmacy profile',
            description: 'Confirm your store name and billing email.',
            completed: Boolean(pharmacy.name && pharmacy.email),
            manual: false
        },
        {
            id: 'review_billing',
            title: 'Review billing center',
            description: 'Open your invoice history and understand renewal dates.',
            completed: Boolean(onboarding.review_billing),
            manual: true
        },
        {
            id: 'download_desktop',
            title: 'Download the desktop app',
            description: 'Install the Windows desktop client for daily store operations.',
            completed: Boolean(onboarding.download_desktop),
            manual: true
        },
        {
            id: 'contact_support',
            title: 'Open your first support ticket',
            description: 'Reach support if you need onboarding help or setup assistance.',
            completed: ticketCount > 0,
            manual: false
        },
        {
            id: 'unlock_pro',
            title: 'Unlock Pro features',
            description: 'Upgrade when you are ready for license keys and desktop activation.',
            completed: paidTier,
            manual: false
        }
    ];
}

function sanitizeAttachments(attachments = []) {
    if (!attachments) {
        return [];
    }

    if (!Array.isArray(attachments)) {
        throw new Error('Attachments must be an array');
    }

    if (attachments.length > MAX_TICKET_ATTACHMENTS) {
        throw new Error(`You can attach up to ${MAX_TICKET_ATTACHMENTS} files per message`);
    }

    return attachments.map((attachment) => {
        const name = String(attachment?.name || '').trim().slice(0, 120);
        const type = String(attachment?.type || 'application/octet-stream').slice(0, 120);
        const dataUrl = String(attachment?.dataUrl || '');
        const size = Number(attachment?.size || 0);
        const allowedType = type.startsWith('image/') || type === 'application/pdf' || type === 'text/plain';
        const allowedDataUrl = dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:application/pdf') || dataUrl.startsWith('data:text/plain');

        if (!name || !dataUrl.startsWith('data:')) {
            throw new Error('Invalid attachment payload');
        }

        if (!allowedType || !allowedDataUrl) {
            throw new Error('Only image, PDF, and TXT attachments are supported');
        }

        if (!Number.isFinite(size) || size <= 0 || size > MAX_ATTACHMENT_SIZE) {
            throw new Error('Attachments must be under 2 MB each');
        }

        return { name, type, size, dataUrl };
    });
}

function sanitizeFilename(fileName) {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext).replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return `${base || 'attachment'}${ext.slice(0, 12)}`;
}

function parseAttachmentDataUrl(dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
        throw new Error('Attachment payload must be a base64 data URL');
    }

    return {
        mimeType: match[1],
        buffer: Buffer.from(match[2], 'base64')
    };
}

async function persistAttachments(attachments, ticketId, entryLabel) {
    if (!attachments || attachments.length === 0) {
        return [];
    }

    const ticketDirectory = path.join(UPLOADS_DIR, 'tickets', String(ticketId));
    await fs.promises.mkdir(ticketDirectory, { recursive: true });

    const savedAttachments = [];

    for (let index = 0; index < attachments.length; index += 1) {
        const attachment = attachments[index];
        const { mimeType, buffer } = parseAttachmentDataUrl(attachment.dataUrl);

        if (mimeType !== attachment.type) {
            throw new Error(`Attachment type mismatch for ${attachment.name}`);
        }

        const safeName = sanitizeFilename(attachment.name);
        const fileName = `${Date.now()}-${entryLabel}-${index}-${safeName}`;
        const filePath = path.join(ticketDirectory, fileName);

        await fs.promises.writeFile(filePath, buffer);

        savedAttachments.push({
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            url: `/api/support/attachments/${ticketId}/${encodeURIComponent(fileName)}`
        });
    }

    return savedAttachments;
}

async function ensureUploadsDirectory() {
    await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
}

async function readUploadCleanupHistory() {
    try {
        const contents = await fs.promises.readFile(UPLOAD_CLEANUP_HISTORY_FILE, 'utf8');
        const parsed = JSON.parse(contents);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }

        console.warn('[UPLOADS] Failed to read cleanup history:', error);
        return [];
    }
}

async function writeUploadCleanupHistory(entries) {
    await fs.promises.writeFile(
        UPLOAD_CLEANUP_HISTORY_FILE,
        JSON.stringify(entries.slice(0, UPLOAD_CLEANUP_HISTORY_LIMIT), null, 2),
        'utf8'
    );
}

async function recordUploadCleanupHistory(entry) {
    const history = await readUploadCleanupHistory();
    history.unshift(entry);
    await writeUploadCleanupHistory(history);
}

function normalizeUploadRelativePath(value) {
    return String(value || '')
        .split('?')[0]
        .split('#')[0]
        .replace(/^https?:\/\/[^/]+/i, '')
        .replace(/^\/?uploads\//i, '')
        .replace(/^\/?api\/support\/attachments\//i, 'tickets/')
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .join('/');
}

async function getReferencedUploadRelativePaths() {
    const tickets = await prisma.ticket.findMany({
        select: { responses: true }
    });
    const referencedPaths = new Set();

    for (const ticket of tickets) {
        const responses = parseJson(ticket.responses, []);
        if (!Array.isArray(responses)) {
            continue;
        }

        for (const response of responses) {
            const attachments = Array.isArray(response?.attachments) ? response.attachments : [];
            for (const attachment of attachments) {
                if (!attachment?.url) {
                    continue;
                }

                let decodedUrl = attachment.url;
                try {
                    decodedUrl = decodeURIComponent(attachment.url);
                } catch (error) {
                    // Keep the original URL if decoding fails.
                }

                referencedPaths.add(normalizeUploadRelativePath(decodedUrl));
            }
        }
    }

    return referencedPaths;
}

async function cleanupStaleUploads(maxAgeDays = UPLOAD_RETENTION_DAYS) {
    const maxAgeMs = Number(maxAgeDays) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - maxAgeMs;
    const referencedPaths = await getReferencedUploadRelativePaths();
    const summary = {
        removedFiles: 0,
        removedDirectories: 0,
        scannedDirectories: 0,
        keptReferencedFiles: 0
    };

    await ensureUploadsDirectory();

    async function walkDirectory(directory) {
        summary.scannedDirectories += 1;

        let entries = [];
        try {
            entries = await fs.promises.readdir(directory, { withFileTypes: true });
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }

            throw error;
        }

        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                await walkDirectory(fullPath);
                continue;
            }

            const stats = await fs.promises.stat(fullPath);
            const relativePath = normalizeUploadRelativePath(path.relative(UPLOADS_DIR, fullPath));
            if (referencedPaths.has(relativePath)) {
                summary.keptReferencedFiles += 1;
                continue;
            }

            if (stats.mtimeMs < cutoff) {
                await fs.promises.unlink(fullPath);
                summary.removedFiles += 1;
            }
        }

        const remainingEntries = await fs.promises.readdir(directory).catch((error) => {
            if (error.code === 'ENOENT') {
                return [];
            }

            throw error;
        });

        if (directory !== UPLOADS_DIR && remainingEntries.length === 0) {
            await fs.promises.rmdir(directory).catch((error) => {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            });
            summary.removedDirectories += 1;
            return true;
        }

        return false;
    }

    await walkDirectory(UPLOADS_DIR);
    return summary;
}

async function runUploadCleanup({ trigger = 'manual', maxAgeDays = UPLOAD_RETENTION_DAYS } = {}) {
    const startedAt = new Date().toISOString();
    const summary = await cleanupStaleUploads(maxAgeDays);
    const historyEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        trigger,
        maxAgeDays: Number(maxAgeDays),
        startedAt,
        completedAt: new Date().toISOString(),
        ...summary
    };

    await recordUploadCleanupHistory(historyEntry);
    return historyEntry;
}

function buildPasswordResetLink(req, user) {
    const token = jwt.sign(
        {
            type: 'password-reset',
            id: user.id,
            fp: getPasswordFingerprint(user.password)
        },
        JWT_SECRET,
        { expiresIn: PASSWORD_RESET_TTL }
    );

    return `${req.protocol}://${req.get('host')}/reset-password.html?token=${encodeURIComponent(token)}`;
}

async function verifyPasswordResetToken(token) {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!payload || payload.type !== 'password-reset' || !payload.id || !payload.fp) {
        throw new Error('Invalid reset token');
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id },
        include: { pharmacy: true }
    });

    if (!user) {
        throw new Error('User not found');
    }

    if (payload.fp !== getPasswordFingerprint(user.password)) {
        throw new Error('This password reset link is no longer valid');
    }

    return user;
}

async function buildAdminBillingOverview() {
    const pharmacies = await prisma.pharmacy.findMany({
        select: {
            id: true,
            name: true,
            subscriptionTier: true,
            paymentStatus: true,
            licenseExpiresAt: true,
            featuresEnabled: true
        }
    });

    const transactions = [];
    let failedPayments = 0;
    let upcomingRenewals = 0;

    for (const pharmacy of pharmacies) {
        const billing = buildBillingState(pharmacy);

        if (billing.paymentStatus === 'failed') {
            failedPayments += 1;
        }

        if (billing.renewalDate) {
            const renewalDate = new Date(billing.renewalDate);
            const daysUntilRenewal = (renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            if (daysUntilRenewal >= 0 && daysUntilRenewal <= 30) {
                upcomingRenewals += 1;
            }
        }

        billing.invoices.forEach((invoice) => {
            transactions.push({
                ...invoice,
                pharmacyId: pharmacy.id,
                pharmacyName: pharmacy.name,
                plan: pharmacy.subscriptionTier
            });
        });
    }

    transactions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const totalRevenue = transactions.reduce((sum, invoice) => {
        return invoice.status === 'paid' ? sum + Number(invoice.amount || 0) : sum;
    }, 0);

    return {
        totalRevenue,
        upcomingRenewals,
        failedPayments,
        recentTransactions: transactions.slice(0, 20)
    };
}

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
            pharmacyId: user.pharmacyId
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function buildUserResponse(user) {
    const pharmacy = user.pharmacy || {};
    const meta = getPharmacyMeta(pharmacy);

    return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        pharmacyId: user.pharmacyId,
        pharmacyName: pharmacy.name || '',
        email: pharmacy.email || '',
        phone: pharmacy.phone || '',
        isActive: pharmacy.isActive,
        subscriptionTier: pharmacy.subscriptionTier || 'free',
        licenseKey: pharmacy.licenseKey || null,
        trialEndsAt: pharmacy.trialEndsAt,
        subscriptionMeta: meta
    };
}

function isWebsiteSuperAdmin(user) {
    return user?.role === 'admin' && user?.username === 'superadmin';
}

async function getAuthenticatedUserFromToken(token) {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserWithPharmacyById(payload.id);

    if (!user || !user.pharmacy) {
        return null;
    }

    if (!user.pharmacy.isActive || user.pharmacy.licenseStatus === 'suspended') {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        role: user.role,
        pharmacyId: user.pharmacyId,
        pharmacyName: user.pharmacy.name,
    };
}

async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: { message: 'No token provided' } });
    }

    try {
        const user = await getAuthenticatedUserFromToken(token);
        if (!user) {
            return res.status(401).json({ success: false, error: { message: 'User not found' } });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, error: { message: 'Invalid or expired token' } });
    }
}

function requireSuperAdmin(req, res, next) {
    if (!isWebsiteSuperAdmin(req.user)) {
        return res.status(403).json({ success: false, error: { message: 'Superadmin access required' } });
    }

    next();
}

async function getUserWithPharmacyById(userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        include: { pharmacy: true }
    });
}

function getPlanDetails(productId, planId, amount) {
    const catalog = getProductCatalog();
    const product = catalog[String(productId || 'pharmasoft').toLowerCase()];

    if (!product) {
        throw new Error(`Unknown product: ${productId}`);
    }

    if (!product.purchasable) {
        throw new Error(`${product.name} self-service desktop pricing is not configured yet`);
    }

    const normalizedPlanId = String(planId || 'monthly').toLowerCase();
    const plan = product.plans[normalizedPlanId] || product.plans.monthly;

    if (!plan) {
        throw new Error(`Unknown plan: ${planId}`);
    }

    const numericAmount = plan.amount;
    let expiresAt = null;

    if (typeof plan.billingMonths === 'number') {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + plan.billingMonths);
    }

    return {
        productId: product.id,
        productName: product.name,
        planId: normalizedPlanId,
        amount: numericAmount,
        tier: plan.tier,
        label: plan.label,
        licenseKeyPrefix: plan.licenseKeyPrefix,
        expiresAt,
    };
}

function buildInvoice(planDetails) {
    const createdAt = new Date();
    return {
        id: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: createdAt.toISOString(),
        amount: planDetails.amount.toFixed(2),
        description: `${planDetails.productName} ${planDetails.label}`,
        planId: planDetails.planId,
        productId: planDetails.productId,
        status: 'paid',
        source: 'self-service',
        nextBillingDate: planDetails.expiresAt ? planDetails.expiresAt.toISOString() : null
    };
}

function generateLicenseKey(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 11).toUpperCase()}-${new Date().getFullYear()}`;
}

async function addNotification(pharmacyId, title, message, type = 'info', link = null) {
    try {
        await prisma.notification.create({
            data: {
                pharmacyId,
                title,
                message,
                type,
                link
            }
        });
    } catch (error) {
        console.warn('Failed to create notification:', error);
    }
}

function getDownloadManifest() {
    const windowsInstallerPath = path.join(DESKTOP_RELEASE_DIR, WINDOWS_INSTALLER_NAME);
    const windowsExists = fs.existsSync(windowsInstallerPath);
    const dentflowWindows = getDentflowDesktopArtifact();

    return {
        windows: windowsExists ? {
            url: `/downloads/${encodeURIComponent(WINDOWS_INSTALLER_NAME)}`,
            version: '0.0.0',
            size: `${(fs.statSync(windowsInstallerPath).size / (1024 * 1024)).toFixed(1)} MB`
        } : null,
        dentflow: dentflowWindows ? {
            windows: dentflowWindows,
            web: hasDentflowWebApp() ? {
                url: '/dentflow/'
            } : null
        } : {
            windows: null,
            web: hasDentflowWebApp() ? {
                url: '/dentflow/'
            } : null
        },
        mac: null,
        linux: null
    };
}

app.post('/api/auth/register', async (req, res) => {
    try {
        const { pharmacyName, email, password, phone, username } = req.body;
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanPharmacyName = String(pharmacyName || '').trim();
        const cleanPassword = String(password || '');
        const cleanPhone = String(phone || '').trim();

        if (!cleanPharmacyName || !cleanEmail || !cleanPassword) {
            return res.status(400).json({
                success: false,
                error: { message: 'Pharmacy name, email, and password are required' }
            });
        }

        // Check if this pharmacy email is already registered
        const existingPharmacy = await prisma.pharmacy.findFirst({
            where: { email: cleanEmail }
        });
        if (existingPharmacy) {
            return res.status(400).json({
                success: false,
                error: { message: 'An account with this email already exists. Please log in instead.' }
            });
        }

        // Pick a unique username
        let finalUsername = String(username || cleanEmail.split('@')[0]).trim();
        if (!finalUsername) finalUsername = cleanEmail;

        const existingUsername = await prisma.user.findUnique({ where: { username: finalUsername } });
        if (existingUsername) {
            const existingEmailUser = await prisma.user.findUnique({ where: { username: cleanEmail } });
            if (!existingEmailUser) {
                finalUsername = cleanEmail;
            } else {
                finalUsername = `${finalUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            }
        }

        const hashedPassword = await bcrypt.hash(cleanPassword, 10);

        const result = await prisma.$transaction(async (tx) => {
            const pharmacy = await tx.pharmacy.create({
                data: {
                    name: cleanPharmacyName,
                    email: cleanEmail,
                    phone: cleanPhone || null,
                    subscription: 'free',
                    subscriptionTier: 'free',
                    paymentStatus: 'unpaid',
                    isActive: true
                }
            });

            const user = await tx.user.create({
                data: {
                    pharmacyId: pharmacy.id,
                    username: finalUsername,
                    password: hashedPassword,
                    role: 'admin',
                    name: `${cleanPharmacyName} Admin`
                },
                include: { pharmacy: true }
            });

            return { pharmacy, user };
        });

        const token = createToken(result.user);
        const userData = buildUserResponse(result.user);

        await addNotification(
            result.pharmacy.id,
            'Welcome to PharmaSOFT',
            'Your free web workspace is ready. Upgrade any time to unlock the desktop license.',
            'success'
        );

        res.json({
            success: true,
            token,
            user: userData,
            data: { token, user: userData }
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, username, login, password } = req.body;
        const cleanIdentifier = String(login || username || email || '').trim();
        const cleanPassword = String(password || '');

        if (!cleanIdentifier || !cleanPassword) {
            return res.status(400).json({ success: false, error: { message: 'Username or email and password are required' } });
        }

        // Multi-strategy lookup: by username (exact/case-insensitive) or pharmacy.email
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: cleanIdentifier },
                    { username: cleanIdentifier.toLowerCase() },
                    { pharmacy: { email: cleanIdentifier } },
                    { pharmacy: { email: cleanIdentifier.toLowerCase() } }
                ]
            },
            include: { pharmacy: true }
        });

        // Fallback: If input has @, check if username matches prefix before @
        if (!user && cleanIdentifier.includes('@')) {
            const prefix = cleanIdentifier.split('@')[0];
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: prefix },
                        { username: prefix.toLowerCase() }
                    ]
                },
                include: { pharmacy: true }
            });
        }

        // Fallback: If input has no @, check if any pharmacy email starts with identifier@
        if (!user && !cleanIdentifier.includes('@')) {
            const prefixMatch = cleanIdentifier.toLowerCase();
            const candidates = await prisma.user.findMany({
                where: {
                    pharmacy: {
                        email: { startsWith: prefixMatch + '@' }
                    }
                },
                include: { pharmacy: true }
            });
            if (candidates.length === 1) {
                user = candidates[0];
            }
        }

        if (!user) {
            return res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
        }

        let validPassword = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
            validPassword = await bcrypt.compare(cleanPassword, user.password);
        } else {
            // Support plaintext password and auto-upgrade
            validPassword = (cleanPassword === user.password);
            if (validPassword) {
                const newHash = await bcrypt.hash(cleanPassword, 10);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: newHash }
                }).catch(() => {});
            }
        }

        if (!validPassword) {
            return res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
        }

        if (!user.pharmacy.isActive || user.pharmacy.licenseStatus === 'suspended') {
            return res.status(403).json({ success: false, error: { message: 'This pharmacy account is suspended' } });
        }

        const token = createToken(user);
        const userData = buildUserResponse(user);

        res.json({
            success: true,
            token,
            user: userData,
            data: { token, user: userData }
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const identifier = String(req.body.username || req.body.email || '').trim();

        if (!identifier) {
            return res.status(400).json({ success: false, error: { message: 'Username or email is required' } });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { pharmacy: { email: identifier } }
                ]
            },
            include: { pharmacy: true }
        });

        if (!user) {
            return res.json({
                success: true,
                data: {
                    message: 'If that account exists, a password reset link has been generated.'
                }
            });
        }

        const resetLink = buildPasswordResetLink(req, user);
        const data = {
            message: 'If that account exists, password reset instructions have been prepared.'
        };

        if (EXPOSE_RESET_LINKS) {
            data.message = 'Password reset link generated.';
            data.resetLink = resetLink;
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/auth/reset-password/validate', async (req, res) => {
    try {
        const token = String(req.query.token || '');

        if (!token) {
            return res.status(400).json({ success: false, error: { message: 'Reset token is required' } });
        }

        const user = await verifyPasswordResetToken(token);
        res.json({
            success: true,
            data: {
                username: user.username,
                pharmacyName: user.pharmacy?.name || ''
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: { message: error.message || 'Reset link is invalid or expired' } });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const token = String(req.body.token || '');
        const password = String(req.body.password || '');

        if (!token || !password) {
            return res.status(400).json({ success: false, error: { message: 'Reset token and new password are required' } });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, error: { message: 'Password must be at least 8 characters long' } });
        }

        const user = await verifyPasswordResetToken(token);
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        await addNotification(
            user.pharmacyId,
            'Password updated',
            'Your PharmaSOFT password was reset successfully.',
            'success'
        );

        res.json({ success: true, data: { message: 'Password reset successful' } });
    } catch (error) {
        res.status(400).json({ success: false, error: { message: error.message || 'Reset link is invalid or expired' } });
    }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const user = await getUserWithPharmacyById(req.user.id);

        if (!user) {
            return res.status(401).json({ success: false, error: { message: 'User not found' } });
        }

        const userData = buildUserResponse(user);
        res.json({ success: true, user: userData, data: { user: userData } });
    } catch (error) {
        handleError(res, error);
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { pharmacyName, email, phone } = req.body;

        await prisma.pharmacy.update({
            where: { id: req.user.pharmacyId },
            data: {
                ...(pharmacyName ? { name: pharmacyName } : {}),
                ...(typeof email === 'string' ? { email } : {}),
                ...(typeof phone === 'string' ? { phone } : {})
            }
        });

        const user = await getUserWithPharmacyById(req.user.id);
        const userData = buildUserResponse(user);
        res.json({ success: true, data: { user: userData } });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/billing/history', authenticateToken, async (req, res) => {
    try {
        const user = await getUserWithPharmacyById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'User not found' } });
        }

        res.json({
            success: true,
            data: buildBillingState(user.pharmacy)
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/onboarding', authenticateToken, async (req, res) => {
    try {
        const [user, ticketCount] = await Promise.all([
            getUserWithPharmacyById(req.user.id),
            prisma.ticket.count({ where: { pharmacyId: req.user.pharmacyId } })
        ]);

        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'User not found' } });
        }

        const tasks = buildOnboardingTasks({
            pharmacy: user.pharmacy,
            ticketCount
        });

        const completedCount = tasks.filter((task) => task.completed).length;

        res.json({
            success: true,
            data: {
                tasks,
                completedCount,
                totalCount: tasks.length,
                progressPercent: Math.round((completedCount / tasks.length) * 100)
            }
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.patch('/api/onboarding/tasks/:taskId', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const pharmacy = await prisma.pharmacy.findUnique({ where: { id: req.user.pharmacyId } });

        if (!pharmacy) {
            return res.status(404).json({ success: false, error: { message: 'Pharmacy not found' } });
        }

        const allowedTaskIds = ['review_billing', 'download_desktop'];
        if (!allowedTaskIds.includes(taskId)) {
            return res.status(400).json({ success: false, error: { message: 'That onboarding task is not manually editable' } });
        }

        const meta = getPharmacyMeta(pharmacy);
        meta.onboarding[taskId] = new Date().toISOString();

        await prisma.pharmacy.update({
            where: { id: pharmacy.id },
            data: {
                featuresEnabled: JSON.stringify(meta)
            }
        });

        const ticketCount = await prisma.ticket.count({ where: { pharmacyId: pharmacy.id } });
        const tasks = buildOnboardingTasks({ pharmacy: { ...pharmacy, featuresEnabled: JSON.stringify(meta) }, ticketCount });
        const completedCount = tasks.filter((task) => task.completed).length;

        res.json({
            success: true,
            data: {
                tasks,
                completedCount,
                totalCount: tasks.length,
                progressPercent: Math.round((completedCount / tasks.length) * 100)
            }
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/subscription/checkout', authenticateToken, async (req, res) => {
    try {
        if (process.env.ALLOW_SIMULATED_BILLING !== 'true') {
            return res.status(503).json({
                success: false,
                error: { message: 'Simulated checkout is disabled' }
            });
        }

        const productId = req.body.productId || 'pharmasoft';
        const planDetails = getPlanDetails(productId, req.body.planId, req.body.amount);
        const pharmacyId = Number(req.user.pharmacyId);
        const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });

        if (!pharmacy) {
            return res.status(404).json({ success: false, error: { message: 'Pharmacy not found' } });
        }

        const subscriptionMeta = getPharmacyMeta(pharmacy);
        const invoice = appendBillingEntry(subscriptionMeta, buildInvoice(planDetails));
        const currentProductAccess = subscriptionMeta.productAccess[planDetails.productId] || {};

        subscriptionMeta.productAccess[planDetails.productId] = {
            ...currentProductAccess,
            productId: planDetails.productId,
            name: planDetails.productName,
            web: planDetails.productId === 'pharmasoft' ? true : Boolean(currentProductAccess.web),
            desktopPurchased: true,
            planId: planDetails.planId,
            status: 'active',
            lastPurchasedAt: new Date().toISOString(),
        };

        const updateData = {
            paymentStatus: 'paid',
            isActive: true,
            featuresEnabled: JSON.stringify(subscriptionMeta)
        };

        if (planDetails.productId === 'pharmasoft') {
            subscriptionMeta.features = getDesktopTierFeatures(planDetails.tier);
            updateData.subscription = planDetails.tier;
            updateData.subscriptionTier = planDetails.tier;
            updateData.licenseStatus = 'active';
            updateData.licenseActivatedAt = new Date();
            updateData.licenseExpiresAt = planDetails.expiresAt;
            updateData.licenseKey = pharmacy.licenseKey || generateLicenseKey(planDetails.licenseKeyPrefix);
            subscriptionMeta.productAccess.pharmasoft = {
                ...subscriptionMeta.productAccess.pharmasoft,
                web: true,
                desktopPurchased: true,
                planId: planDetails.planId,
                status: 'active',
                lastPurchasedAt: new Date().toISOString(),
                licenseKey: updateData.licenseKey,
            };
            updateData.featuresEnabled = JSON.stringify(subscriptionMeta);
        }

        const updatedPharmacy = await prisma.pharmacy.update({
            where: { id: pharmacyId },
            data: updateData
        });

        await addNotification(
            pharmacyId,
            'Subscription upgraded',
            `Your ${planDetails.label} plan is active and your license key is ready.`,
            'success'
        );

        res.json({
            success: true,
            data: {
                message: 'Payment successful',
                productId: planDetails.productId,
                tier: planDetails.productId === 'pharmasoft' ? updatedPharmacy.subscriptionTier : planDetails.tier,
                licenseKey: planDetails.productId === 'pharmasoft' ? updatedPharmacy.licenseKey : null,
                invoice
            }
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { pharmacyId: req.user.pharmacyId },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma.notification.count({
                where: { pharmacyId: req.user.pharmacyId, read: false }
            })
        ]);

        res.json({ success: true, data: { notifications, unreadCount } });
    } catch (error) {
        handleError(res, error);
    }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const notification = await prisma.notification.findFirst({
            where: { id, pharmacyId: req.user.pharmacyId }
        });

        if (!notification) {
            return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        handleError(res, error);
    }
});

app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { pharmacyId: req.user.pharmacyId, read: false },
            data: { read: true }
        });

        res.json({ success: true });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/support/tickets', authenticateToken, async (req, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            where: { pharmacyId: req.user.pharmacyId },
            include: {
                pharmacy: {
                    select: { name: true, email: true, phone: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: tickets });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/support/tickets', authenticateToken, async (req, res) => {
    try {
        const { subject, category, message } = req.body;
        const attachments = sanitizeAttachments(req.body.attachments);

        if (!subject || !message) {
            return res.status(400).json({ success: false, error: { message: 'Subject and message are required' } });
        }

        const ticket = await prisma.ticket.create({
            data: {
                pharmacyId: req.user.pharmacyId,
                subject,
                category: category || 'other',
                message,
                status: 'open',
                priority: 'normal'
            }
        });

        let updatedTicket;
        try {
            const storedAttachments = await persistAttachments(attachments, ticket.id, 'initial');
            updatedTicket = await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    responses: JSON.stringify([{
                        sender: 'user',
                        name: req.user.username,
                        message,
                        date: new Date().toISOString(),
                        attachments: storedAttachments,
                        isInitial: true
                    }])
                }
            });
        } catch (error) {
            await prisma.ticket.delete({ where: { id: ticket.id } });
            throw error;
        }

        await addNotification(
            req.user.pharmacyId,
            'Support ticket created',
            `We received your ticket: ${subject}`,
            'info',
            String(ticket.id)
        );

        res.json({ success: true, data: updatedTicket });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/support/tickets/:id/reply', authenticateToken, async (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        const { message } = req.body;
        const attachments = sanitizeAttachments(req.body.attachments);

        if (!message && attachments.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'Reply message is required' } });
        }

        const ticket = await prisma.ticket.findFirst({
            where: { id: ticketId, pharmacyId: req.user.pharmacyId }
        });

        if (!ticket) {
            return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
        }

        const responses = parseJson(ticket.responses, []);
        const storedAttachments = await persistAttachments(attachments, ticketId, 'user');
        responses.push({
            sender: 'user',
            name: req.user.username,
            message,
            attachments: storedAttachments,
            date: new Date().toISOString()
        });

        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                responses: JSON.stringify(responses),
                status: 'open'
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/support/attachments/:ticketId/:fileName', async (req, res) => {
    try {
        const token = String(req.query.token || req.headers.authorization?.split(' ')[1] || '');
        if (!token) {
            return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
        }

        const user = await getAuthenticatedUserFromToken(token);
        if (!user) {
            return res.status(403).json({ success: false, error: { message: 'Invalid or expired token' } });
        }

        const ticketId = Number(req.params.ticketId);
        const fileName = decodeURIComponent(String(req.params.fileName || ''));
        if (!Number.isInteger(ticketId) || ticketId <= 0 || path.basename(fileName) !== fileName) {
            return res.status(400).json({ success: false, error: { message: 'Invalid attachment request' } });
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { pharmacyId: true, responses: true },
        });

        if (!ticket) {
            return res.status(404).json({ success: false, error: { message: 'Attachment not found' } });
        }

        if (!isWebsiteSuperAdmin(user) && ticket.pharmacyId !== user.pharmacyId) {
            return res.status(404).json({ success: false, error: { message: 'Attachment not found' } });
        }

        const requestedRelativePath = normalizeUploadRelativePath(`tickets/${ticketId}/${fileName}`);
        const responses = parseJson(ticket.responses, []);
        const isReferenced = Array.isArray(responses) && responses.some((entry) => {
            const attachments = Array.isArray(entry?.attachments) ? entry.attachments : [];
            return attachments.some((attachment) => normalizeUploadRelativePath(attachment?.url) === requestedRelativePath);
        });

        if (!isReferenced) {
            return res.status(404).json({ success: false, error: { message: 'Attachment not found' } });
        }

        const absolutePath = path.join(UPLOADS_DIR, requestedRelativePath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, error: { message: 'Attachment not found' } });
        }

        return res.sendFile(absolutePath);
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/admin/pharmacies', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const pharmacies = await prisma.pharmacy.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                        sales: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: pharmacies });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/admin/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const [total, free, professional, enterprise, trials, paid] = await Promise.all([
            prisma.pharmacy.count(),
            prisma.pharmacy.count({ where: { subscriptionTier: 'free' } }),
            prisma.pharmacy.count({ where: { subscriptionTier: 'professional' } }),
            prisma.pharmacy.count({ where: { subscriptionTier: 'enterprise' } }),
            prisma.pharmacy.count({
                where: {
                    trialEndsAt: { gt: new Date() }
                }
            }),
            prisma.pharmacy.count({
                where: {
                    paymentStatus: 'paid',
                    subscriptionTier: { in: ['professional', 'enterprise'] }
                }
            })
        ]);

        const mrr = professional * 29 + enterprise * 99;

        res.json({
            success: true,
            data: {
                total,
                free,
                professional,
                enterprise,
                trials,
                paid,
                mrr,
                arr: mrr * 12
            }
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/admin/billing/overview', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            data: await buildAdminBillingOverview()
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/admin/uploads/history', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            data: await readUploadCleanupHistory()
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/admin/uploads/cleanup', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const requestedDays = Number(req.body?.maxAgeDays);
        const maxAgeDays = Number.isFinite(requestedDays) && requestedDays > 0 ? requestedDays : UPLOAD_RETENTION_DAYS;

        res.json({
            success: true,
            data: await runUploadCleanup({ trigger: 'manual', maxAgeDays })
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/admin/pharmacy/:id/upgrade', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const pharmacyId = Number(req.params.id);
        const tier = String(req.body.tier || 'professional').toLowerCase();
        const durationMonths = Number(req.body.durationMonths) || 12;
        const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });

        if (!pharmacy) {
            return res.status(404).json({ success: false, error: { message: 'Pharmacy not found' } });
        }

        let expiresAt = null;
        if (tier !== 'free') {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
        }

        const licenseKey = tier === 'free' ? null : (pharmacy.licenseKey || generateLicenseKey(tier === 'enterprise' ? 'ENT' : 'PRO'));
        const meta = getPharmacyMeta(pharmacy);
        meta.features = getDesktopTierFeatures(tier);

        if (tier !== 'free') {
            appendBillingEntry(meta, {
                id: `ADM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                amount: tier === 'enterprise' ? 99 : 29,
                description: `Manual ${tier === 'enterprise' ? 'Enterprise' : 'Professional'} upgrade`,
                planId: tier === 'enterprise' ? 'enterprise' : 'yearly',
                status: 'manual',
                source: 'admin',
                nextBillingDate: expiresAt ? expiresAt.toISOString() : null,
                createdAt: new Date().toISOString()
            });
        }

        const updated = await prisma.pharmacy.update({
            where: { id: pharmacyId },
            data: {
                subscription: tier,
                subscriptionTier: tier,
                paymentStatus: tier === 'free' ? 'unpaid' : 'paid',
                licenseStatus: tier === 'free' ? 'inactive' : 'active',
                licenseActivatedAt: tier === 'free' ? null : new Date(),
                licenseExpiresAt: expiresAt,
                licenseKey,
                isActive: true,
                featuresEnabled: JSON.stringify(meta)
            }
        });

        await addNotification(
            pharmacyId,
            tier === 'free' ? 'Plan downgraded' : 'Plan upgraded',
            tier === 'free'
                ? 'Your subscription was moved back to the Free plan.'
                : `Your subscription was updated to ${tier}.`,
            tier === 'free' ? 'warning' : 'success'
        );

        res.json({
            success: true,
            data: {
                message: 'Pharmacy updated successfully',
                tier: updated.subscriptionTier,
                licenseKey: updated.licenseKey
            }
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/admin/pharmacy/:id/suspend', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const pharmacyId = Number(req.params.id);

        await prisma.pharmacy.update({
            where: { id: pharmacyId },
            data: {
                isActive: false,
                licenseStatus: 'suspended'
            }
        });

        await addNotification(pharmacyId, 'Account suspended', 'Please contact PharmaSOFT support for help restoring access.', 'warning');
        res.json({ success: true, data: { message: 'Pharmacy suspended successfully' } });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/admin/pharmacy/:id/reactivate', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const pharmacyId = Number(req.params.id);

        await prisma.pharmacy.update({
            where: { id: pharmacyId },
            data: {
                isActive: true,
                licenseStatus: 'active'
            }
        });

        await addNotification(pharmacyId, 'Account reactivated', 'Your access has been restored.', 'success');
        res.json({ success: true, data: { message: 'Pharmacy reactivated successfully' } });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/admin/activity', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const [recentSignups, recentTickets] = await Promise.all([
            prisma.pharmacy.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    subscriptionTier: true,
                    createdAt: true
                }
            }),
            prisma.ticket.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    pharmacy: {
                        select: { name: true }
                    }
                }
            })
        ]);

        res.json({ success: true, data: { recentSignups, recentTickets } });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/admin/tickets', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            include: {
                pharmacy: { select: { name: true, email: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: tickets });
    } catch (error) {
        handleError(res, error);
    }
});

app.put('/api/admin/tickets/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        const { status } = req.body;
        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: { status }
        });

        if (status === 'resolved') {
            await addNotification(updated.pharmacyId, 'Ticket resolved', `Your ticket "${updated.subject}" was marked as resolved.`, 'success', String(updated.id));
        }

        res.json({ success: true, data: updated });
    } catch (error) {
        handleError(res, error);
    }
});

app.post('/api/admin/tickets/:id/reply', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        const { message } = req.body;
        const attachments = sanitizeAttachments(req.body.attachments);

        if (!message && attachments.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'Reply message is required' } });
        }

        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
        }

        const responses = parseJson(ticket.responses, []);
        const storedAttachments = await persistAttachments(attachments, ticketId, 'admin');
        responses.push({
            sender: 'admin',
            name: req.user.username,
            message,
            attachments: storedAttachments,
            date: new Date().toISOString()
        });

        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                responses: JSON.stringify(responses),
                status: 'in_progress'
            }
        });

        await addNotification(
            ticket.pharmacyId,
            'New reply to your ticket',
            `Support replied to: ${ticket.subject}`,
            'info',
            String(ticket.id)
        );

        res.json({ success: true, data: updated });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/downloads', async (req, res) => {
    res.json({ success: true, data: getDownloadManifest() });
});

app.get('/api/products', async (req, res) => {
    res.json({ success: true, data: getPublicProductCatalog() });
});

app.post('/api/products/:productId/session', authenticateToken, async (req, res) => {
    try {
        const productId = String(req.params.productId || '').toLowerCase();
        const product = getProductCatalog()[productId];

        if (!product) {
            return res.status(404).json({ success: false, error: { message: 'Product not found' } });
        }

        if (productId !== 'dentflow') {
            return res.status(400).json({ success: false, error: { message: 'Direct session launch is not supported for this product' } });
        }

        const account = await getUserWithPharmacyById(req.user.id);
        if (!account || !account.pharmacy) {
            return res.status(404).json({ success: false, error: { message: 'Account not found' } });
        }

        const meta = getPharmacyMeta(account.pharmacy);
        const productAccess = ensureProductAccess(meta, product);

        if (!productAccess.web) {
            if (product.web?.pricing !== 'free') {
                return res.status(403).json({ success: false, error: { message: 'Web access is not enabled for this product' } });
            }

            productAccess.web = true;
            productAccess.status = 'active';
            productAccess.activatedAt = new Date().toISOString();
            await savePharmacyMeta(account.pharmacyId, meta);
        }

        await startDentflowBackend();

        const dentflowResponse = await fetch(`http://127.0.0.1:${DENTFLOW_BACKEND_PORT}/api/auth/internal/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': DENTFLOW_INTERNAL_API_KEY,
            },
            body: JSON.stringify({
                email: account.pharmacy.email || account.username,
                fullName: account.name || account.username,
                practiceName: account.pharmacy.name || account.name || 'DentFlow Practice',
                practicePhone: account.pharmacy.phone || '',
                practiceAddress: account.pharmacy.address || '',
            }),
        });

        const dentflowData = await dentflowResponse.json();

        if (!dentflowResponse.ok || !dentflowData.access_token || !dentflowData.user) {
            return res.status(502).json({ success: false, error: { message: dentflowData.error?.message || 'Failed to start DentFlow session' } });
        }

        res.json({
            success: true,
            data: {
                token: dentflowData.access_token,
                user: dentflowData.user,
                launchUrl: '/dentflow/',
            },
        });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/admin/products', authenticateToken, requireSuperAdmin, async (req, res) => {
    res.json({ success: true, data: getAdminProductCatalog() });
});

app.post('/api/admin/products', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const createdProduct = createProductCatalogProduct(req.body || {});
        res.json({ success: true, data: createdProduct });
    } catch (error) {
        handleError(res, error);
    }
});

app.put('/api/admin/products/:productId', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const updatedProduct = updateProductCatalogProduct(req.params.productId, req.body || {});
        res.json({ success: true, data: updatedProduct });
    } catch (error) {
        handleError(res, error);
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

let server;
let uploadCleanupTimer;

async function startServer() {
    await ensureUploadsDirectory();
    // DentFlow backend starts on-demand if requested

    const cleanupSummary = await runUploadCleanup({ trigger: 'startup' });
    if (cleanupSummary.removedFiles || cleanupSummary.removedDirectories) {
        console.log(`[UPLOADS] Removed ${cleanupSummary.removedFiles} stale files and ${cleanupSummary.removedDirectories} empty directories on startup`);
    }

    uploadCleanupTimer = setInterval(async () => {
        try {
            const summary = await runUploadCleanup({ trigger: 'scheduled' });
            if (summary.removedFiles || summary.removedDirectories) {
                console.log(`[UPLOADS] Periodic cleanup removed ${summary.removedFiles} files and ${summary.removedDirectories} directories`);
            }
        } catch (error) {
            console.error('[UPLOADS] Cleanup failed:', error);
        }
    }, UPLOAD_CLEANUP_INTERVAL_MS);
    uploadCleanupTimer.unref();

    server = app.listen(PORT, () => {
        console.log(`✅ Website backend running on http://localhost:${PORT}`);
        console.log(`✅ API ready at http://localhost:${PORT}/api`);
    });
}

async function shutdown() {
    if (uploadCleanupTimer) {
        clearInterval(uploadCleanupTimer);
    }

    if (dentflowBackendProcess && !dentflowBackendProcess.killed) {
        dentflowBackendProcess.kill();
        dentflowBackendProcess = null;
    }

    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }

    await prisma.$disconnect();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer().catch(async (error) => {
    console.error('Failed to start website server:', error);
    await prisma.$disconnect();
    process.exit(1);
});
