// Automatic Medication Import from URLs
// Downloads XLSX files, converts to CSV, and imports automatically
// Usage: node import-auto.js [cnam|updates|complete|all]

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const config = JSON.parse(fs.readFileSync('./import-config.json', 'utf-8'));
const XLSX = require('xlsx'); // Will install this

// ============================
// UTILITY FUNCTIONS
// ============================

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    }[type] || 'ℹ️';

    console.log(`[${timestamp}] ${prefix} ${message}`);

    // Also save to log file
    const logDir = config.settings.log_directory || './logs';
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const logFile = path.join(logDir, `import-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, `[${timestamp}] [${type.toUpperCase()}] ${message}\n`);
}

function downloadFile(url, dest, retries = 3) {
    return new Promise((resolve, reject) => {
        log(`Downloading from: ${url}`);

        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);

        const options = url.startsWith('https') ? {
            rejectUnauthorized: false, // Bypass SSL certificate verification
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        } : {};

        const request = protocol.get(url, options, (response) => {
            // Handle redirects
            if (response.statusCode === 302 || response.statusCode === 301) {
                file.close();
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                return downloadFile(response.headers.location, dest, retries).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                file.close();
                if (fs.existsSync(dest)) fs.unlinkSync(dest);

                // Retry on failure
                if (retries > 0) {
                    log(`Download failed with status ${response.statusCode}, retrying... (${retries} attempts left)`, 'warning');
                    setTimeout(() => {
                        downloadFile(url, dest, retries - 1).then(resolve).catch(reject);
                    }, 2000);
                    return;
                }

                return reject(new Error(`Download failed: ${response.statusCode}`));
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                log(`Downloaded to: ${dest}`, 'success');
                resolve(dest);
            });
        });

        request.on('error', (err) => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);

            // Retry on error
            if (retries > 0) {
                log(`Download error: ${err.message}, retrying... (${retries} attempts left)`, 'warning');
                setTimeout(() => {
                    downloadFile(url, dest, retries - 1).then(resolve).catch(reject);
                }, 2000);
                return;
            }

            reject(err);
        });

        // Set timeout
        request.setTimeout(30000, () => {
            request.abort();
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            reject(new Error('Download timeout'));
        });
    });
}

function xlsxToCsv(xlsxPath, csvPath) {
    return new Promise((resolve, reject) => {
        try {
            log(`Converting XLSX to CSV: ${path.basename(xlsxPath)}`);

            // Read XLSX file
            const workbook = XLSX.readFile(xlsxPath);
            const sheetName = workbook.SheetNames[0]; // First sheet
            const worksheet = workbook.Sheets[sheetName];

            // Convert to CSV
            const csv = XLSX.utils.sheet_to_csv(worksheet);

            // Write CSV file
            fs.writeFileSync(csvPath, csv, 'utf-8');

            log(`Converted to CSV: ${path.basename(csvPath)}`, 'success');
            resolve(csvPath);
        } catch (error) {
            log(`Conversion failed: ${error.message}`, 'error');
            reject(error);
        }
    });
}

async function importCsv(csvPath, sourceType) {
    log(`Importing CSV to database: ${path.basename(csvPath)}`);

    try {
        // Use existing import scripts
        let importScript;
        switch (sourceType) {
            case 'updates':
                importScript = 'import-update.js';
                break;
            default:
                importScript = 'import-cnam.js';
        }

        // Copy CSV to standard location
        fs.copyFileSync(csvPath, './medicaments-cnam.csv');

        // Run import script
        const { stdout, stderr } = await execAsync(`node ${importScript}`);

        log('Import completed', 'success');
        console.log(stdout);
        if (stderr) log(stderr, 'warning');

        return true;
    } catch (error) {
        log(`Import failed: ${error.message}`, 'error');
        throw error;
    }
}

// ============================
// MAIN IMPORT FUNCTION
// ============================

async function processSource(sourceName, sourceConfig) {
    log(`\n${'='.repeat(60)}`);
    log(`Processing: ${sourceConfig.name}`);
    log(`${'='.repeat(60)}\n`);

    const downloadDir = config.settings.download_directory || './downloads';
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const xlsxPath = path.join(downloadDir, `${sourceName}_${timestamp}.xlsx`);
    const csvPath = path.join(downloadDir, `${sourceName}_${timestamp}.csv`);

    try {
        // Step 1: Download XLSX
        await downloadFile(sourceConfig.url, xlsxPath);

        // Step 2: Convert to CSV
        await xlsxToCsv(xlsxPath, csvPath);

        // Step 3: Import to database
        if (config.settings.auto_import) {
            await importCsv(csvPath, sourceName);
        } else {
            log('Auto-import disabled, CSV ready for manual import', 'warning');
        }

        log(`\n✅ ${sourceConfig.name} processed successfully!\n`, 'success');

        // Cleanup old files (keep last 5)
        cleanupOldFiles(downloadDir, sourceName);

        return true;
    } catch (error) {
        log(`\n❌ Failed to process ${sourceConfig.name}: ${error.message}\n`, 'error');
        return false;
    }
}

function cleanupOldFiles(dir, prefix) {
    const files = fs.readdirSync(dir)
        .filter(f => f.startsWith(prefix))
        .map(f => ({
            name: f,
            path: path.join(dir, f),
            time: fs.statSync(path.join(dir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

    // Keep last 5, delete rest
    files.slice(5).forEach(file => {
        fs.unlinkSync(file.path);
        log(`Cleaned up old file: ${file.name}`);
    });
}

// ============================
// CLI INTERFACE
// ============================

async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'all';

    console.log('\n🚀 AUTOMATIC MEDICATION IMPORT');
    console.log('================================\n');

    // Check for XLSX module
    try {
        require.resolve('xlsx');
    } catch (e) {
        console.log('❌ Module "xlsx" not found!');
        console.log('📦 Installing xlsx module...\n');
        try {
            await execAsync('npm install xlsx');
            console.log('✅ xlsx installed successfully!\n');
        } catch (error) {
            console.log('❌ Failed to install xlsx. Please run: npm install xlsx');
            process.exit(1);
        }
    }

    let results = {};

    if (mode === 'all') {
        log('Processing ALL sources...\n');
        for (const [name, sourceConfig] of Object.entries(config.sources)) {
            if (sourceConfig.url && sourceConfig.url !== 'PASTE_YOUR_URL_HERE') {
                results[name] = await processSource(name, sourceConfig);
            } else {
                log(`Skipping ${name}: URL not configured`, 'warning');
            }
        }
    } else if (config.sources[mode]) {
        results[mode] = await processSource(mode, config.sources[mode]);
    } else {
        console.log('❌ Invalid mode!');
        console.log('\nUsage: node import-auto.js [mode]');
        console.log('\nModes:');
        console.log('  all      - Process all configured sources');
        console.log('  cnam_reimbursed - CNAM reimbursed medications');
        console.log('  updates  - Monthly updates');
        console.log('  complete - Complete medication list');
        process.exit(1);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    const success = Object.values(results).filter(Boolean).length;
    const total = Object.values(results).length;
    console.log(`✅ Successful: ${success}/${total}`);
    console.log(`❌ Failed: ${total - success}/${total}`);
    console.log('\n✨ Done!\n');
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { processSource, downloadFile, xlsxToCsv };
