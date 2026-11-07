import { Response, CookieOptions } from 'express';
import { ENV } from './env';

export const ACCESS_COOKIE = 'accessToken';
export const REFRESH_COOKIE = 'refreshToken';

function ttlToMs(ttl: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/i.exec(ttl.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return amount * mult;
}

function baseCookieOptions(): CookieOptions {
  // Cross-origin (Vercel → Render) needs SameSite=None + Secure.
  // Localhost (Vite :5173 → API :5000) is same-site, so Lax + Secure=false works on HTTP.
  const crossSite = ENV.COOKIE_SECURE;
  return {
    httpOnly: true,
    secure: ENV.COOKIE_SECURE,
    sameSite: crossSite ? 'none' : 'lax',
    path: '/',
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: ttlToMs(ENV.ACCESS_TOKEN_TTL, 15 * 60 * 1000),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: ttlToMs(ENV.REFRESH_TOKEN_TTL, 7 * 24 * 60 * 60 * 1000),
    // Only sent to auth routes — refresh/logout — which lowers CSRF surface
    path: '/api/auth',
  });
}

export function clearAuthCookies(res: Response) {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, { ...opts, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...opts, path: '/api/auth' });
  // Clear legacy path if an older build set refresh on /
  res.clearCookie(REFRESH_COOKIE, { ...opts, path: '/' });
}
