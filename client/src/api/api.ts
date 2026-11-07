import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  // Production: set VITE_API_URL to the Render API origin (no trailing slash).
  // Local: client/.env → http://localhost:5000
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // send / receive HttpOnly auth cookies
});

// Drop legacy Bearer tokens from older builds so we don't mix auth modes.
try {
  localStorage.removeItem('token');
} catch {
  /* ignore */
}

/** @deprecated Tokens live in HttpOnly cookies — kept as a no-op for call sites. */
export function setAuthToken(_token?: string) {
  try {
    localStorage.removeItem('token');
  } catch {
    /* ignore */
  }
  delete api.defaults.headers.common['Authorization'];
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/api/auth/refresh')
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url || '';

    const isAuthPath =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/logout');

    if (status === 401 && original && !original._retry && !isAuthPath) {
      original._retry = true;
      const ok = await tryRefresh();
      if (ok) return api.request(original);
    }
    return Promise.reject(error);
  }
);
