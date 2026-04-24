import { NextRequest, NextResponse } from 'next/server';
import { getRequestId, jsonException } from '../../../lib/http';
import { logError, logInfo, logWarn } from '../../../lib/logger';
import { getMetricsSnapshot, recordApiMetric } from '../../../lib/metrics';
import { getObservabilityHealth } from '../../../lib/observability';
import { enforceApiSecurity } from '../../../lib/security';

export async function GET(req: NextRequest) {
  const route = '/api/metrics';
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  logInfo('api.request.start', { route, method: 'GET', request_id: requestId });

  const denied = await enforceApiSecurity(req, 'metrics', requestId);
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
    const snapshot = getMetricsSnapshot();
    const observability = await getObservabilityHealth();

    const payload = {
      request_id: requestId,
      ...snapshot,
      observability,
    };

    recordApiMetric(route, 200, Date.now() - startedAt);
    logInfo('api.request.success', {
      route,
      method: 'GET',
      request_id: requestId,
      status: 200,
      duration_ms: Date.now() - startedAt,
    });

    return NextResponse.json(payload, {
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
