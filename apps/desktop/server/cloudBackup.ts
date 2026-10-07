// Cloud Backup Service - Per-Pharmacy Implementation
// Each pharmacy uses their own Supabase account

import fs from 'fs';
import fetch from 'node-fetch';
import { prisma } from '../../../packages/database/src/index.ts';
import { resolveDatabaseFilePath } from './databasePath.ts';

interface CloudBackupConfig {
    supabaseUrl: string;
    supabaseKey: string;
    bucketName: string;
}

interface CloudBackup {
    id: string;
    name: string;
    size: number;
    createdAt: Date;
    pharmacyId: number;
}

class CloudBackupService {
    private getDatabasePath() {
        return resolveDatabaseFilePath();
    }

    /**
     * Load cloud configuration for a specific pharmacy
     */
    private async getPharmacyConfig(pharmacyId: number): Promise<CloudBackupConfig> {
        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: pharmacyId },
            select: {
                cloudEnabled: true,
                cloudUrl: true,
                cloudApiKey: true,
                cloudBucketName: true
            }
        });

        if (!pharmacy) {
            throw new Error('Pharmacy not found');
        }

        if (!pharmacy.cloudEnabled) {
            throw new Error('Cloud backup is not enabled for this pharmacy. Please configure in Settings.');
        }

        if (!pharmacy.cloudUrl || !pharmacy.cloudApiKey) {
            throw new Error('Cloud credentials not configured. Please add your Supabase URL and API key in Settings.');
        }

        return {
            supabaseUrl: pharmacy.cloudUrl,
            supabaseKey: pharmacy.cloudApiKey,
            bucketName: pharmacy.cloudBucketName || 'pharmasoft-backups'
        };
    }

    /**
     * Upload database backup to pharmacy's own cloud
     */
    async uploadBackup(pharmacyId: number, description?: string): Promise<CloudBackup> {
        try {
            // Load THIS pharmacy's cloud config
            const config = await this.getPharmacyConfig(pharmacyId);

            // Read database file
            const dbContent = await fs.promises.readFile(this.getDatabasePath());

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `pharmacy_${pharmacyId}_${timestamp}.db`;

            // Create metadata file
            const metadata = {
                pharmacyId,
                description: description || 'Cloud backup',
                createdAt: new Date().toISOString(),
                size: dbContent.length,
                version: '1.0.0'
            };

            // Upload to THIS pharmacy's Supabase
            const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucketName}/${filename}`;

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.supabaseKey}`,
                    'Content-Type': 'application/octet-stream'
                },
                body: dbContent
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            // Upload metadata
            const metadataFilename = `${filename}.json`;
            const metadataUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucketName}/${metadataFilename}`;

            await fetch(metadataUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            });

            console.log(`[CLOUD-BACKUP] Uploaded to cloud: ${filename}`);

            return {
                id: filename,
                name: filename,
                size: dbContent.length,
                createdAt: new Date(),
                pharmacyId
            };

        } catch (error: any) {
            console.error('[CLOUD-BACKUP] Upload failed:', error);
            throw new Error(`Cloud backup failed: ${error.message}`);
        }
    }

    /**
     * List all cloud backups for a pharmacy
     */
    async listBackups(pharmacyId: number): Promise<CloudBackup[]> {
        try {
            const config = await this.getPharmacyConfig(pharmacyId);
            const listUrl = `${config.supabaseUrl}/storage/v1/object/list/${config.bucketName}`;

            const response = await fetch(listUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prefix: `pharmacy_${pharmacyId}_`,
                    limit: 100,
                    sortBy: { column: 'created_at', order: 'desc' }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Supabase list error:', response.status, errorText);
                throw new Error(`Failed to list backups: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const files = await response.json();

            // Filter .db files only (exclude .json metadata)
            const backups = files
                .filter((file: any) => file.name.endsWith('.db'))
                .map((file: any) => ({
                    id: file.name,
                    name: file.name,
                    size: file.metadata?.size || 0,
                    createdAt: new Date(file.created_at),
                    pharmacyId
                }));

            return backups;

        } catch (error: any) {
            console.error('[CLOUD-BACKUP] List failed:', error);
            throw new Error(`Failed to list cloud backups: ${error.message}`);
        }
    }

    /**
     * Download and restore backup from cloud
     */
    async restoreBackup(pharmacyId: number, filename: string): Promise<void> {
        try {
            const config = await this.getPharmacyConfig(pharmacyId);
            // Download from Supabase
            const downloadUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucketName}/${filename}`;

            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${config.supabaseKey}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download backup');
            }

            const buffer = await response.buffer();
            const dbPath = this.getDatabasePath();

            // Create backup of current database
            const backupPath = `${dbPath}.before-cloud-restore`;
            await fs.promises.copyFile(dbPath, backupPath);

            // Restore downloaded backup
            await fs.promises.writeFile(dbPath, buffer);

            console.log(`[CLOUD-BACKUP] Restored from cloud: ${filename}`);
            console.log(`[CLOUD-BACKUP] Previous database backed up to: ${backupPath}`);

        } catch (error: any) {
            console.error('[CLOUD-BACKUP] Restore failed:', error);
            throw new Error(`Cloud restore failed: ${error.message}`);
        }
    }

    /**
     * Delete cloud backup
     */
    async deleteBackup(pharmacyId: number, filename: string): Promise<void> {
        try {
            const config = await this.getPharmacyConfig(pharmacyId);
            const deleteUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucketName}/${filename}`;

            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${config.supabaseKey}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete backup');
            }

            // Also delete metadata file
            const metadataFilename = `${filename}.json`;
            await fetch(`${config.supabaseUrl}/storage/v1/object/${config.bucketName}/${metadataFilename}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${config.supabaseKey}`
                }
            });

            console.log(`[CLOUD-BACKUP] Deleted from cloud: ${filename}`);

        } catch (error: any) {
            console.error('[CLOUD-BACKUP] Delete failed:', error);
            throw new Error(`Failed to delete cloud backup: ${error.message}`);
        }
    }

    /**
     * Test cloud connection for a pharmacy
     */
    /**
     * Test cloud connection for a pharmacy
     */
    async testConnection(pharmacyId: number, overrideConfig?: Partial<CloudBackupConfig>): Promise<boolean> {
        try {
            let config: CloudBackupConfig;

            // If full overrides are provided (URL and Key), use them directly (for testing before save)
            if (overrideConfig?.supabaseUrl && overrideConfig?.supabaseKey) {
                config = {
                    supabaseUrl: overrideConfig.supabaseUrl,
                    supabaseKey: overrideConfig.supabaseKey,
                    bucketName: overrideConfig.bucketName || 'pharmasoft-backups'
                };
                console.log('Test Connection: Using full override config');
            } else {
                // Load from database and merge any partial overrides
                const pharmacy = await prisma.pharmacy.findUnique({
                    where: { id: pharmacyId },
                    select: {
                        cloudUrl: true,
                        cloudApiKey: true,
                        cloudBucketName: true
                    }
                });

                if (!pharmacy) {
                    throw new Error('Pharmacy not found');
                }

                // Merge: use override values if provided, otherwise use database values
                config = {
                    supabaseUrl: overrideConfig?.supabaseUrl || pharmacy.cloudUrl || '',
                    supabaseKey: overrideConfig?.supabaseKey || pharmacy.cloudApiKey || '',
                    bucketName: overrideConfig?.bucketName || pharmacy.cloudBucketName || 'pharmasoft-backups'
                };
                console.log('Test Connection: Using merged config (overrides + database)');
            }

            // Validate config
            if (!config.supabaseUrl || !config.supabaseKey) {
                console.error('Test Connection: Missing URL or Key');
                return false;
            }

            console.log(`Test Connection: Testing ${config.supabaseUrl}/storage/v1/object/list/${config.bucketName}`);

            // Use objects/list API instead of bucket metadata - works with storage.objects policies
            const response = await fetch(`${config.supabaseUrl}/storage/v1/object/list/${config.bucketName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.supabaseKey}`,
                    'apikey': config.supabaseKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prefix: '', limit: 1 })
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`Test Connection Failed: ${response.status} ${text}`);
                throw new Error(text);
            }

            console.log('Test Connection: SUCCESS!');
            return response.ok;
        } catch (error) {
            console.error('Test Connection Error:', error);
            throw error; // Propagate error to frontend
        }
    }
}

export const cloudBackupService = new CloudBackupService();
export type { CloudBackup, CloudBackupConfig };
