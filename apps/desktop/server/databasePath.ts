import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveDatabaseFilePath(): string {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
    }

    if (!databaseUrl.startsWith('file:')) {
        throw new Error('Backup utilities only support file-based SQLite databases');
    }

    try {
        return fileURLToPath(databaseUrl);
    } catch {
        return path.resolve(databaseUrl.replace(/^file:/, ''));
    }
}
