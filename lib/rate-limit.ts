import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Süresi dolmuş kayıtları temizle (her 5 dakikada)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(
  identifier: string,
  limit = 100,
  windowMs = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Sıkı limit: auth ve kayıt endpoint'leri için (dakikada 10 istek)
export const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 };

// Normal limit: genel API endpoint'leri için (dakikada 200 istek)
export const API_RATE_LIMIT = { limit: 200, windowMs: 60 * 1000 };
