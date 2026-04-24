import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_HEALTH } from '@/app/api/health/route';
import { GET as GET_METRICS } from '@/app/api/metrics/route';

describe('/api/health and /api/metrics', () => {
  it('health retourne 401 sans token quand requis', async () => {
    process.env.API_INTERNAL_TOKEN = 'secret';

    const req = new NextRequest('http://localhost/api/health', { method: 'GET' });
    const res = await GET_HEALTH(req);
    const body = (await res.json()) as { code?: string };

    expect(res.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('health expose un statut et observability', async () => {
    process.env.API_INTERNAL_TOKEN = '';

    const req = new NextRequest('http://localhost/api/health', { method: 'GET' });
    const res = await GET_HEALTH(req);
    const body = (await res.json()) as {
      status?: string;
      observability?: { rate_limit?: { mode?: string } };
    };

    expect([200, 503]).toContain(res.status);
    expect(body.status).toBeTruthy();
    expect(body.observability?.rate_limit?.mode).toBeTruthy();
  });

  it('metrics retourne un snapshot', async () => {
    process.env.API_INTERNAL_TOKEN = '';

    const req = new NextRequest('http://localhost/api/metrics', { method: 'GET' });
    const res = await GET_METRICS(req);
    const body = (await res.json()) as {
      generated_at?: string;
      api?: Record<string, unknown>;
      upstream?: Record<string, unknown>;
    };

    expect(res.status).toBe(200);
    expect(body.generated_at).toBeTruthy();
    expect(typeof body.api).toBe('object');
    expect(typeof body.upstream).toBe('object');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});
