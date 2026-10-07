import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveDatabaseFilePath } from './databasePath.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backup directory
const BACKUP_DIR = path.join(__dirname, '../../../backups');
const BACKUP_FILENAME_PATTERN = /^[A-Za-z0-9._-]+\.db$/;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export interface BackupInfo {
    filename: string;
    size: number;
    createdAt: Date;
}

function resolveBackupFilePath(filename: string): string {
    if (path.basename(filename) !== filename || !BACKUP_FILENAME_PATTERN.test(filename)) {
        throw new Error('Invalid backup filename');
    }

    return path.join(BACKUP_DIR, filename);
}

/**
 * Create a backup of the database
 */
export async function createBackup(description?: string): Promise<BackupInfo> {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const isAutomaticBackup = /automatic|server start|pre-restore/i.test(description || '');
        const filename = isAutomaticBackup
            ? `backup_${timestamp}.db`
            : `backup_manual_${timestamp}.db`;
        const backupPath = path.join(BACKUP_DIR, filename);
        const dbPath = resolveDatabaseFilePath();

        // Copy database file
        await fs.promises.copyFile(dbPath, backupPath);

        // Get file stats
        const stats = await fs.promises.stat(backupPath);

        // Save metadata
        const metadataPath = backupPath + '.json';
        const metadata = {
            filename,
            description: description || 'Manual backup',
            createdAt: new Date().toISOString(),
            size: stats.size,
        };
        await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        return {
            filename,
            size: stats.size,
            createdAt: new Date(),
        };
    } catch (error: any) {
        console.error('Backup creation failed:', error);
        throw new Error('Failed to create backup: ' + error.message);
    }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<BackupInfo[]> {
    try {
        const files = await fs.promises.readdir(BACKUP_DIR);
        const backupFiles = files.filter(f => f.endsWith('.db'));

        const backups: BackupInfo[] = [];

        for (const file of backupFiles) {
            const filepath = path.join(BACKUP_DIR, file);
            const stats = await fs.promises.stat(filepath);

            // Try to read metadata
            const metadataPath = filepath + '.json';
            let metadata: any = {};
            try {
                const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
                metadata = JSON.parse(metadataContent);
            } catch (e) {
                // Metadata doesn't exist, use defaults
            }

            backups.push({
                filename: file,
                size: stats.size,
                createdAt: metadata.createdAt ? new Date(metadata.createdAt) : stats.mtime,
            });
        }

        // Sort by creation date (newest first)
        backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return backups;
    } catch (error: any) {
        console.error('Failed to list backups:', error);
        throw new Error('Failed to list backups: ' + error.message);
    }
}

/**
 * Restore database from backup
 */
export async function restoreBackup(filename: string): Promise<void> {
    try {
        const backupPath = resolveBackupFilePath(filename);
        const dbPath = resolveDatabaseFilePath();

        // Validate backup file exists
        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file not found');
        }

        // Create a backup of current database before restoring
        await createBackup('Pre-restore backup');

        // Restore the backup
        await fs.promises.copyFile(backupPath, dbPath);

        console.log(`Database restored from backup: ${filename}`);
    } catch (error: any) {
        console.error('Restore failed:', error);
        throw new Error('Failed to restore backup: ' + error.message);
    }
}

/**
 * Delete a backup file
 */
export async function deleteBackup(filename: string): Promise<void> {
    try {
        const backupPath = resolveBackupFilePath(filename);
        const metadataPath = backupPath + '.json';

        // Delete backup file
        if (fs.existsSync(backupPath)) {
            await fs.promises.unlink(backupPath);
        }

        // Delete metadata file
        if (fs.existsSync(metadataPath)) {
            await fs.promises.unlink(metadataPath);
        }

        console.log(`Backup deleted: ${filename}`);
    } catch (error: any) {
        console.error('Delete failed:', error);
        throw new Error('Failed to delete backup: ' + error.message);
    }
}

/**
 * Auto-backup scheduler (call this on server start)
 */
export function scheduleAutoBackup() {
    // Create backup every 24 hours
    const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    setInterval(async () => {
        try {
            console.log('[AUTO-BACKUP] Creating scheduled backup...');
            await createBackup('Automatic daily backup');
            console.log('[AUTO-BACKUP] Backup completed successfully');

            // Clean up old backups (keep last 7 days)
            await cleanupOldBackups(7);
        } catch (error) {
            console.error('[AUTO-BACKUP] Failed:', error);
        }
    }, BACKUP_INTERVAL);

    // Also create initial backup on server start
    setTimeout(async () => {
        try {
            console.log('[AUTO-BACKUP] Creating initial backup on server start...');
            await createBackup('Server start backup');
        } catch (error) {
            console.error('[AUTO-BACKUP] Initial backup failed:', error);
        }
    }, 5000); // Wait 5 seconds after server start
}

/**
 * Clean up old backups
 */
async function cleanupOldBackups(keepDays: number) {
    try {
        const backups = await listBackups();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - keepDays);

        for (const backup of backups) {
            if (backup.createdAt < cutoffDate && !backup.filename.includes('manual')) {
                await deleteBackup(backup.filename);
                console.log(`[AUTO-BACKUP] Cleaned up old backup: ${backup.filename}`);
            }
        }
    } catch (error) {
        console.error('[AUTO-BACKUP] Cleanup failed:', error);
    }
}
