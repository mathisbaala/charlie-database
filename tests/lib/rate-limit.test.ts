import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('rate-limit', () => {
  it('applique la limite et bloque apres depassement', async () => {
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';
    process.env.API_RATE_LIMIT_PER_MIN = '2';
    process.env.API_RATE_LIMIT_WINDOW_MS = '60000';

    const key = `test-${Date.now()}-${Math.random()}`;

    const r1 = await checkRateLimit(key);
    const r2 = await checkRateLimit(key);
    const r3 = await checkRateLimit(key);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
    expect(r3.retryAfterSec).toBeGreaterThan(0);
  });
});
