import { prisma } from '../../../packages/database/src/index.ts';

export interface AuditLogEntry {
    pharmacyId: number;
    userId?: number;
    action: string;
    entityType?: string;
    entityId?: number;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Log an activity to the audit trail
 */
export async function logActivity(entry: AuditLogEntry): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                pharmacyId: entry.pharmacyId,
                userId: entry.userId,
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                details: entry.details ? JSON.stringify(entry.details) : null,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
            },
        });
    } catch (error) {
        console.error('[AUDIT] Failed to log activity:', error);
        // Don't throw - logging failure shouldn't break the main operation
    }
}

/**
 * Middleware to automatically log activities
 */
export function createAuditMiddleware(action: string, entityType?: string) {
    return async (req: any, res: any, next: any) => {
        // Store original methods
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        // Intercept successful responses
        res.json = function (data: any) {
            if (res.statusCode >= 200 && res.statusCode < 300 && data.success) {
                // Log after successful operation
                setImmediate(() => {
                    logActivity({
                        pharmacyId: req.user?.pharmacyId,
                        userId: req.user?.id,
                        action,
                        entityType,
                        entityId: data.data?.id,
                        details: {
                            method: req.method,
                            path: req.path,
                            body: req.body,
                        },
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get('user-agent'),
                    });
                });
            }
            return originalJson(data);
        };

        res.send = function (data: any) {
            return originalSend(data);
        };

        next();
    };
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filters: {
    pharmacyId: number;
    userId?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}) {
    const where: any = {
        pharmacyId: filters.pharmacyId,
    };

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.action) {
        where.action = { contains: filters.action };
    }

    if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
            where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
            where.createdAt.lte = filters.endDate;
        }
    }

    const logs = await prisma.auditLog.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    role: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: filters.limit || 100,
        skip: filters.offset || 0,
    });

    const total = await prisma.auditLog.count({ where });

    return {
        logs,
        total,
    };
}
