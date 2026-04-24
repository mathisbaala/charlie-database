import { Redis } from '@upstash/redis';

type Bucket = {
  count: number;
  resetAt: number;
};

type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type CounterResult = {
  count: number;
  ttlMs: number;
};

const memoryBuckets = new Map<string, Bucket>();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

function getRateLimitConfig() {
  const requests = Number(process.env.API_RATE_LIMIT_PER_MIN ?? '30');
  const windowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? '60000');
  return {
    requests: Number.isFinite(requests) && requests >= 0 ? requests : 30,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60000,
  };
}

function incrementMemory(key: string, windowMs: number): CounterResult {
  const now = Date.now();
  const current = memoryBuckets.get(key);

  if (!current || now >= current.resetAt) {
    const next = { count: 1, resetAt: now + windowMs };
    memoryBuckets.set(key, next);
    return { count: 1, ttlMs: windowMs };
  }

  current.count += 1;
  return { count: current.count, ttlMs: Math.max(1, current.resetAt - now) };
}

async function incrementRedis(key: string, windowMs: number): Promise<CounterResult> {
  if (!redis) return incrementMemory(key, windowMs);

  const ttlSec = Math.max(1, Math.ceil(windowMs / 1000));
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, ttlSec);
    return { count, ttlMs: windowMs };
  }

  const ttl = await redis.ttl(key);
  return { count, ttlMs: Math.max(1, ttl * 1000) };
}

export async function checkRateLimit(key: string): Promise<LimitResult> {
  const { requests, windowMs } = getRateLimitConfig();

  if (requests === 0) {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, retryAfterSec: 0 };
  }

  try {
    const { count, ttlMs } = await incrementRedis(key, windowMs);

    if (count > requests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, requests - count),
      retryAfterSec: 0,
    };
  } catch {
    const fallback = incrementMemory(key, windowMs);
    if (fallback.count > requests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.max(1, Math.ceil(fallback.ttlMs / 1000)),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, requests - fallback.count),
      retryAfterSec: 0,
    };
  }
}

export async function getRateLimitHealth(): Promise<{
  mode: 'redis' | 'memory';
  ok: boolean;
  details?: string;
}> {
  if (!redis) {
    return { mode: 'memory', ok: true, details: 'Upstash non configuré, fallback mémoire actif' };
  }

  try {
    const pong = await redis.ping();
    return { mode: 'redis', ok: String(pong).toUpperCase() === 'PONG' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { mode: 'redis', ok: false, details: message };
  }
}
