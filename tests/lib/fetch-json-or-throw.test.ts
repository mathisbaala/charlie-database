import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, fetchJsonOrThrow } from '@/hooks/use-api-request';

describe('fetchJsonOrThrow', () => {
  it('injecte x-request-id si absent', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const requestId = headers.get('x-request-id');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: requestId ? { 'x-request-id': requestId } : undefined,
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJsonOrThrow<{ ok: boolean }>('/api/test');
    expect(result.ok).toBe(true);

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get('x-request-id')).toBeTruthy();
  });

  it('remonte une erreur enrichie avec request_id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'Boom', code: 'INTERNAL_ERROR', request_id: 'req-123' }), {
          status: 500,
          headers: { 'x-request-id': 'req-123' },
        })
      )
    );

    await expect(fetchJsonOrThrow('/api/test')).rejects.toBeInstanceOf(ApiRequestError);

    try {
      await fetchJsonOrThrow('/api/test');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      const e = err as ApiRequestError;
      expect(e.requestId).toBe('req-123');
      expect(e.message).toContain('request_id: req-123');
    }
  });
});
