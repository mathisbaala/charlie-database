import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);

  if (!headers.get('x-request-id')) {
    headers.set('x-request-id', crypto.randomUUID());
  }

  const response = NextResponse.next({
    request: {
      headers,
    },
  });

  response.headers.set('x-request-id', headers.get('x-request-id') || '');
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
