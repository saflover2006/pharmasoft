import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const devDatabasePath = path.resolve(currentDirectory, '../../../packages/database/prisma/dev.db');

process.env.DATABASE_URL ??= `file:${devDatabasePath.replace(/\\/g, '/')}`;

const { startServer } = await import('./index.ts');

startServer().catch((error) => {
    console.error('Failed to start backend server:', error);
    process.exit(1);
});
