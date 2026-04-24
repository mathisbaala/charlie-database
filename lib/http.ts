import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export function getRequestId(req: NextRequest): string {
  return req.headers.get('x-request-id')?.trim() || crypto.randomUUID();
}

export function jsonError(
  message: string,
  status: number,
  code: ApiErrorCode,
  details?: Record<string, unknown>,
  requestId?: string
) {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(requestId ? { request_id: requestId } : {}),
      ...(details ? { details } : {}),
    },
    {
      status,
      headers: requestId ? { 'x-request-id': requestId } : undefined,
    }
  );
}

export async function parseJsonBody<T>(req: NextRequest, schema: ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const requestId = getRequestId(req);
  try {
    const raw = await req.json();
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return {
        ok: false,
        response: jsonError('Payload invalide', 400, 'BAD_REQUEST', { issues }, requestId),
      };
    }

    return { ok: true, data: parsed.data };
  } catch {
    return {
      ok: false,
      response: jsonError('JSON invalide', 400, 'BAD_REQUEST', undefined, requestId),
    };
  }
}

export function jsonException(err: unknown, requestId: string): NextResponse {
  const message = err instanceof Error ? err.message : 'Erreur interne';
  const lowered = message.toLowerCase();
  const isUpstream =
    lowered.includes('timeout') ||
    lowered.includes('impossible de contacter le service') ||
    lowered.includes('http 429') ||
    lowered.includes('http 5');

  if (isUpstream) {
    return jsonError(message, 502, 'UPSTREAM_ERROR', undefined, requestId);
  }

  return jsonError(message, 500, 'INTERNAL_ERROR', undefined, requestId);
}
