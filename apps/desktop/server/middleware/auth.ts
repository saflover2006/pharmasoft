import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../../packages/database/src/index.ts';

export const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const PLATFORM_ADMIN_USERNAME = 'superadmin';

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not set. Using an ephemeral desktop secret for this process.');
}

export interface AuthenticatedUserContext {
    id: number;
    username: string;
    role: string;
    pharmacyId: number;
    pharmacyName: string;
    isPlatformAdmin: boolean;
}

export interface AuthRequest extends Request {
    user?: AuthenticatedUserContext;
}

export const isPlatformAdmin = (user: { username?: string; role?: string } | null | undefined) => {
    return user?.role === 'admin' && user?.username?.trim().toLowerCase() === PLATFORM_ADMIN_USERNAME;
};

export const isReservedUsername = (username?: string | null) => {
    return username?.trim().toLowerCase() === PLATFORM_ADMIN_USERNAME;
};

const buildAuthenticatedUser = (user: {
    id: number;
    username: string;
    role: string;
    pharmacyId: number;
    pharmacy: { id: number; name: string; isActive: boolean; licenseStatus: string };
}): AuthenticatedUserContext => ({
    id: user.id,
    username: user.username,
    role: user.role,
    pharmacyId: user.pharmacyId,
    pharmacyName: user.pharmacy.name,
    isPlatformAdmin: isPlatformAdmin(user),
});

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: { message: 'No token provided' } });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { id: number };
        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            include: {
                pharmacy: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        licenseStatus: true,
                    },
                },
            },
        });

        if (!user || !user.pharmacy) {
            return res.status(401).json({ success: false, error: { message: 'User not found' } });
        }

        if (!user.pharmacy.isActive || user.pharmacy.licenseStatus === 'suspended') {
            return res.status(403).json({ success: false, error: { message: 'This pharmacy account is suspended' } });
        }

        req.user = buildAuthenticatedUser(user);
        return next();
    } catch {
        return res.status(403).json({ success: false, error: { message: 'Invalid or expired token' } });
    }
};

export const requirePharmacyAdmin = (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        return false;
    }

    return true;
};

export const requirePlatformAdmin = (req: AuthRequest, res: Response) => {
    if (!isPlatformAdmin(req.user)) {
        res.status(403).json({ success: false, error: { message: 'Platform admin access required' } });
        return false;
    }

    return true;
};
