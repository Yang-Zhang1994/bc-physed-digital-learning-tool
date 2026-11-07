import { Request, Response, NextFunction } from 'express';
import { ENV } from '../utils/env';
import { ACCESS_COOKIE } from '../utils/cookies';
import { verifyAccessToken, UserRole } from '../utils/tokens';
import { User } from '../models/user';

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: UserRole;
  /** Access-token expiry (unix seconds), when present on the JWT */
  tokenExp?: number;
}

function extractAccessToken(req: Request): string | undefined {
  const fromCookie = (req as any).cookies?.[ACCESS_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    const payload = verifyAccessToken(token);
    if (!payload.id) return res.status(401).json({ msg: 'Invalid token' });
    req.userId = payload.id;
    req.userRole = (payload.role as UserRole) || 'student';
    if (typeof payload.exp === 'number') req.tokenExp = payload.exp;
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid or expired token' });
  }
}

/**
 * Fast role gate using the access-token claim.
 * Short access TTL limits how long a stale role can linger; sensitive
 * teacher routes should still re-check the DB (see requireTeacherFromDb).
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) return res.status(401).json({ msg: 'No token' });
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    next();
  };
}

/** DB-backed teacher check — role changes take effect before the access token expires. */
export async function requireTeacherFromDb(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const me = await User.findById(req.userId).select('type');
    if (!me) return res.status(404).json({ msg: 'User not found' });
    if (me.type !== 'teacher' && me.type !== 'admin') {
      return res.status(403).json({ msg: 'Teacher only' });
    }
    req.userRole = me.type as UserRole;
    next();
  } catch {
    res.status(500).json({ msg: 'Auth check failed' });
  }
}

/** @deprecated Prefer requireRole('teacher') + requireTeacherFromDb */
export function requireTeacher(req: AuthedRequest, res: Response, next: NextFunction) {
  return requireRole('teacher', 'admin')(req, res, next);
}

// Silence unused ENV import if tree-shaken oddly in some builds
void ENV;
