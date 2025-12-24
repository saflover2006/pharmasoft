// Smart Auto-Update - Runs once per day when internet available
// Checks if already updated today before running
// Usage: node smart-update.js

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const XLSX = require('xlsx');

// Configuration
const config = JSON.parse(fs.readFileSync('./import-config.json', 'utf-8'));
const LOG_DIR = './logs';
const DOWNLOAD_DIR = './downloads';
const STATE_FILE = './logs/last-update.json';

// Lists to update
const UPDATE_SOURCES = ['updates', 'cnam_reimbursed'];

// ============================
// STATE MANAGEMENT
// ============================

function getLastUpdateDate() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
            return state.lastUpdate;
        }
    } catch (error) {
        return null;
    }
    return null;
}

function setLastUpdateDate() {
    const state = {
        lastUpdate: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    };
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isAlreadyUpdatedToday() {
    const lastUpdate = getLastUpdateDate();
    const today = new Date().toISOString().split('T')[0];
    return lastUpdate === today;
}

// ============================
// INTERNET CHECK
// ============================

function checkInternet() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'spot.tn',
            port: 443,
            path: '/',
            method: 'HEAD',
            timeout: 5000
        };

        const req = https.request(options, (res) => {
            resolve(res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

// ============================
// LOGGING
// ============================

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' }[type] || 'ℹ️';

    console.log(`[${timestamp}] ${prefix} ${message}`);

    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const logFile = path.join(LOG_DIR, `smart-update-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, `[${timestamp}] [${type.toUpperCase()}] ${message}\n`);
}

// ============================
// DOWNLOAD & CONVERT
// ============================

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        log(`Downloading: ${path.basename(dest)}`);

        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);

        protocol.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                file.close();
                fs.unlinkSync(dest);
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(dest);
                return reject(new Error(`Download failed: ${response.statusCode}`));
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                log(`Downloaded: ${path.basename(dest)}`, 'success');
                resolve(dest);
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            reject(err);
        });
    });
}

function xlsxToCsv(xlsxPath, csvPath) {
    return new Promise((resolve, reject) => {
        try {
            log(`Converting to CSV: ${path.basename(xlsxPath)}`);
            const workbook = XLSX.readFile(xlsxPath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            fs.writeFileSync(csvPath, csv, 'utf-8');
            log(`Converted: ${path.basename(csvPath)}`, 'success');
            resolve(csvPath);
        } catch (error) {
            log(`Conversion failed: ${error.message}`, 'error');
            reject(error);
        }
    });
}

async function fastImport(csvPath) {
    log(`Fast importing: ${path.basename(csvPath)}`);

    try {
        const { stdout, stderr } = await execAsync(`node import-bulk.js "${csvPath}"`);
        console.log(stdout);
        if (stderr) log(stderr, 'warning');
        log('Import completed', 'success');
        return true;
    } catch (error) {
        log(`Import failed: ${error.message}`, 'error');
        throw error;
    }
}

// ============================
// MAIN UPDATE PROCESS
// ============================

async function smartUpdate() {
    console.log('\n🌐 SMART AUTO-UPDATE');
    console.log('====================');
    console.log(`Date: ${new Date().toLocaleString('fr-FR')}\n`);

    // Check if already updated today
    if (isAlreadyUpdatedToday()) {
        console.log('✅ Already updated today!');
        log('Update skipped - already updated today', 'info');
        console.log(`Last update: ${getLastUpdateDate()}`);
        console.log('\nNo update needed. Exiting.\n');
        return;
    }

    log('Starting smart update check');

    // Check internet connection
    console.log('🔍 Checking internet connection...');
    const hasInternet = await checkInternet();

    if (!hasInternet) {
        console.log('❌ No internet connection!');
        log('Update skipped - no internet connection', 'warning');
        console.log('\nWill try again next time internet is available.\n');
        return;
    }

    console.log('✅ Internet connected!\n');
    log('Internet connection confirmed');

    if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

    const results = {};
    const startTime = Date.now();

    for (const sourceName of UPDATE_SOURCES) {
        const sourceConfig = config.sources[sourceName];

        if (!sourceConfig || !sourceConfig.url) {
            log(`Skipping ${sourceName}: Not configured`, 'warning');
            continue;
        }

        log(`\n${'='.repeat(60)}`);
        log(`Processing: ${sourceConfig.name}`);
        log('='.repeat(60));

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const xlsxPath = path.join(DOWNLOAD_DIR, `${sourceName}_${timestamp}.xlsx`);
        const csvPath = path.join(DOWNLOAD_DIR, `${sourceName}_${timestamp}.csv`);

        try {
            await downloadFile(sourceConfig.url, xlsxPath);
            await xlsxToCsv(xlsxPath, csvPath);
            await fastImport(csvPath);

            results[sourceName] = 'success';
            log(`${sourceConfig.name} - SUCCESS`, 'success');

        } catch (error) {
            results[sourceName] = 'failed';
            log(`${sourceConfig.name} - FAILED: ${error.message}`, 'error');
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SMART UPDATE SUMMARY');
    console.log('='.repeat(60));

    const success = Object.values(results).filter(r => r === 'success').length;
    const failed = Object.values(results).filter(r => r === 'failed').length;

    console.log(`✅ Successful: ${success}/${UPDATE_SOURCES.length}`);
    console.log(`❌ Failed: ${failed}/${UPDATE_SOURCES.length}`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log('\n📊 Details:');

    for (const [source, result] of Object.entries(results)) {
        const icon = result === 'success' ? '✅' : '❌';
        console.log(`   ${icon} ${source}: ${result}`);
    }

    // Mark as updated
    if (success > 0) {
        setLastUpdateDate();
        console.log(`\n📅 Last update saved: ${new Date().toISOString().split('T')[0]}`);
        log('Update completed and marked for today', 'success');
    }

    console.log('\n✨ Smart update complete!\n');

    process.exit(failed > 0 ? 1 : 0);
}

// Run
smartUpdate().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    process.exit(1);
});
