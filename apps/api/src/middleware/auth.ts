import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { db, ApiError } from '../lib/supabase';
import { getEffectivePermissions } from '../services/profile.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing bearer token', 'UNAUTHENTICATED'));
  }
  const token = header.slice(7);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    return next(new ApiError(401, 'Invalid or expired token', 'UNAUTHENTICATED'));
  }
  req.authUserId = data.user.id;
  next();
}

export function uid(req: Request): string {
  if (!req.authUserId) throw new ApiError(401, 'Unauthenticated', 'UNAUTHENTICATED');
  return req.authUserId;
}

export function requirePermission(key: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const perms = await getEffectivePermissions(uid(req));
      if (!perms.has(key)) {
        return next(new ApiError(403, 'You do not have permission for this action', 'PERMISSION_DENIED'));
      }
      res.locals.permissions = perms;
      next();
    } catch (e) {
      next(e);
    }
  };
}

export const generalLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false });
export const verifyLimiter  = rateLimit({ windowMs: 60_000, limit: 20,  standardHeaders: true, legacyHeaders: false });
export const authLimiter    = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
