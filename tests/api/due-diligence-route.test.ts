import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/due-diligence/route';

describe('/api/due-diligence', () => {
  it('retourne 401 quand le token est requis et absent', async () => {
    process.env.API_INTERNAL_TOKEN = 'secret';

    const req = new NextRequest('http://localhost/api/due-diligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siren: '123456789' }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { code?: string };

    expect(res.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('retourne 400 sur payload invalide', async () => {
    process.env.API_INTERNAL_TOKEN = '';

    const req = new NextRequest('http://localhost/api/due-diligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siren: 'abc' }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { code?: string; details?: { issues?: unknown[] } };

    expect(res.status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
    expect(Array.isArray(body.details?.issues)).toBe(true);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('retourne 400 si context est trop long', async () => {
    process.env.API_INTERNAL_TOKEN = '';

    const req = new NextRequest('http://localhost/api/due-diligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siren: '123456789',
        context: 'x'.repeat(2500),
      }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { code?: string };

    expect(res.status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });
});
