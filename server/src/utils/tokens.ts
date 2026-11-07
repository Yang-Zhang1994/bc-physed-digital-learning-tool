import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from './env';
import { RefreshToken } from '../models/refreshToken';

export type UserRole = 'student' | 'teacher' | 'admin';

export type AccessTokenPayload = {
  id: string;
  role: UserRole;
  /** Standard JWT expiry (seconds since epoch) — always set by jsonwebtoken via expiresIn */
  exp?: number;
  iat?: number;
};

export type RefreshTokenPayload = {
  id: string;
  jti: string;
  exp?: number;
  iat?: number;
};

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function parseDurationToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/i.exec(ttl.trim());
  if (!match) {
    // Fallback: treat bare numbers as seconds
    const n = Number(ttl);
    return Number.isFinite(n) ? n * 1000 : 7 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return amount * mult;
}

export function signAccessToken(userId: string, role: UserRole): string {
  const payload: AccessTokenPayload = {
    id: userId,
    role: role || 'student',
  };
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ENV.JWT_SECRET) as AccessTokenPayload;
}

export async function issueRefreshToken(userId: string): Promise<{ raw: string; expiresAt: Date }> {
  const jti = crypto.randomUUID();
  const payload: RefreshTokenPayload = { id: userId, jti };
  const raw = jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.REFRESH_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });

  const expiresAt = new Date(Date.now() + parseDurationToMs(ENV.REFRESH_TOKEN_TTL));
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(raw),
    expiresAt,
  });

  return { raw, expiresAt };
}

export async function rotateRefreshToken(
  rawRefresh: string
): Promise<{ userId: string; raw: string; expiresAt: Date } | null> {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(rawRefresh, ENV.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    return null;
  }

  const tokenHash = hashToken(rawRefresh);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    // Possible reuse after theft — revoke all sessions for this user if we know them
    if (payload?.id) {
      await RefreshToken.updateMany(
        { userId: payload.id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
    return null;
  }

  stored.revokedAt = new Date();
  await stored.save();

  const next = await issueRefreshToken(String(stored.userId));
  return { userId: String(stored.userId), raw: next.raw, expiresAt: next.expiresAt };
}

export async function revokeRefreshToken(rawRefresh: string | undefined): Promise<void> {
  if (!rawRefresh) return;
  const tokenHash = hashToken(rawRefresh);
  await RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
