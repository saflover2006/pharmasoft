// Daily Automatic Update - Runs at Midnight
// Downloads and imports: Updates + CNAM Reimbursed lists
// Uses FAST bulk import (40x faster!)
// Usage: node daily-update.js

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

// URLs to update daily
const DAILY_SOURCES = ['updates', 'cnam_reimbursed'];

// ============================
// LOGGING
// ============================

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' }[type] || 'ℹ️';

    console.log(`[${timestamp}] ${prefix} ${message}`);

    // Save to daily log
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const logFile = path.join(LOG_DIR, `daily-update-${new Date().toISOString().split('T')[0]}.log`);
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

async function dailyUpdate() {
    console.log('\n🌙 DAILY MIDNIGHT UPDATE');
    console.log('========================');
    console.log(`Date: ${new Date().toLocaleString('fr-FR')}\n`);

    log('Starting daily update');

    if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

    const results = {};
    const startTime = Date.now();

    for (const sourceName of DAILY_SOURCES) {
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
            // Download
            await downloadFile(sourceConfig.url, xlsxPath);

            // Convert
            await xlsxToCsv(xlsxPath, csvPath);

            // Fast Import
            await fastImport(csvPath);

            results[sourceName] = 'success';
            log(`${sourceConfig.name} - SUCCESS`, 'success');

        } catch (error) {
            results[sourceName] = 'failed';
            log(`${sourceConfig.name} - FAILED: ${error.message}`, 'error');
        }
    }

    // Summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('DAILY UPDATE SUMMARY');
    console.log('='.repeat(60));

    const success = Object.values(results).filter(r => r === 'success').length;
    const failed = Object.values(results).filter(r => r === 'failed').length;

    console.log(`✅ Successful: ${success}/${DAILY_SOURCES.length}`);
    console.log(`❌ Failed: ${failed}/${DAILY_SOURCES.length}`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log('\n📊 Details:');

    for (const [source, result] of Object.entries(results)) {
        const icon = result === 'success' ? '✅' : '❌';
        console.log(`   ${icon} ${source}: ${result}`);
    }

    console.log('\n✨ Daily update complete!\n');

    log('Daily update completed', success === DAILY_SOURCES.length ? 'success' : 'warning');

    // Return exit code
    process.exit(failed > 0 ? 1 : 0);
}

// Run
dailyUpdate().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    process.exit(1);
});
