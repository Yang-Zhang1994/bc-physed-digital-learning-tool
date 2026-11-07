import 'dotenv/config';

export const ENV = {
  PORT: process.env.PORT || '5000',
  MONGO_URI: process.env.MONGO_URI ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  /** Separate secret for refresh tokens when provided; falls back to JWT_SECRET. */
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  /** Access token lifetime (short-lived). */
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? '15m',
  /** Refresh token lifetime (long-lived). */
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL ?? '7d',
  /**
   * Force Secure cookies. Defaults to true whenever NODE_ENV=production
   * (required for SameSite=None cross-origin Vercel → Render).
   */
  COOKIE_SECURE:
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production'),
};

if (!ENV.MONGO_URI || !ENV.JWT_SECRET) {
  throw new Error('Missing env vars: MONGO_URI or JWT_SECRET');
}
