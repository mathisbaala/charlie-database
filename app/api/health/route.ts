import { NextRequest, NextResponse } from 'next/server';
import { getRequestId, jsonException } from '../../../lib/http';
import { logError, logInfo, logWarn } from '../../../lib/logger';
import { recordApiMetric } from '../../../lib/metrics';
import { getObservabilityHealth } from '../../../lib/observability';
import { enforceApiSecurity } from '../../../lib/security';

export async function GET(req: NextRequest) {
  const route = '/api/health';
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  logInfo('api.request.start', { route, method: 'GET', request_id: requestId });

  const denied = await enforceApiSecurity(req, 'health', requestId);
  if (denied) {
    recordApiMetric(route, denied.status, Date.now() - startedAt);
    logWarn('api.request.denied', {
      route,
      method: 'GET',
      request_id: requestId,
      status: denied.status,
      duration_ms: Date.now() - startedAt,
    });
    return denied;
  }

  try {
    const observability = await getObservabilityHealth();
    const healthy = observability.rate_limit.ok;
    const status = healthy ? 200 : 503;

    const payload = {
      status: healthy ? 'ok' : 'degraded',
      uptime_s: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      request_id: requestId,
      observability,
    };

    recordApiMetric(route, status, Date.now() - startedAt);
    logInfo('api.request.success', {
      route,
      method: 'GET',
      request_id: requestId,
      status,
      duration_ms: Date.now() - startedAt,
    });

    return NextResponse.json(payload, {
      status,
      headers: { 'x-request-id': requestId },
    });
  } catch (err) {
    const response = jsonException(err, requestId);
    recordApiMetric(route, response.status, Date.now() - startedAt);
    logError(
      'api.request.error',
      {
        route,
        method: 'GET',
        request_id: requestId,
        duration_ms: Date.now() - startedAt,
      },
      err
    );
    return response;
  }
}
