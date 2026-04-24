import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from './http';
import { checkRateLimit } from './rate-limit';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';

  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();

  return 'unknown';
}

export async function enforceApiSecurity(req: NextRequest, routeId: string, requestId?: string): Promise<NextResponse | null> {
  const expectedToken = process.env.API_INTERNAL_TOKEN?.trim();
  if (expectedToken) {
    const provided = req.headers.get('x-api-token')?.trim();
    if (!provided || provided !== expectedToken) {
      return jsonError('Accès non autorisé', 401, 'UNAUTHORIZED', undefined, requestId);
    }
  }

  const ip = getClientIp(req);
  const rateKey = `${routeId}:${ip}`;
  const rate = await checkRateLimit(rateKey);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'Trop de requêtes, réessayez plus tard',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSec),
          'X-RateLimit-Remaining': '0',
          ...(requestId ? { 'x-request-id': requestId } : {}),
        },
      }
    );
  }

  return null;
}
