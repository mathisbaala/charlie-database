// charlie-database/app/api/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails, companyDetailsToContext } from '../../../lib/datagouv';
import { analyzeWithClaude, parseClaudeJsonRobust, PROMPT_KYC } from '../../../lib/claude';
import { parseJsonBody, jsonError, jsonException, getRequestId } from '../../../lib/http';
import { logError, logInfo, logWarn } from '../../../lib/logger';
import { recordApiMetric } from '../../../lib/metrics';
import { enforceApiSecurity } from '../../../lib/security';
import { kycRequestSchema, claudeSchemas } from '../../../lib/schemas';
import type { KYCResult } from '../../../types';

export async function POST(req: NextRequest) {
  const route = '/api/kyc';
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  logInfo('api.request.start', { route, method: 'POST', request_id: requestId });

  const denied = await enforceApiSecurity(req, 'kyc', requestId);
  if (denied) {
    recordApiMetric(route, denied.status, Date.now() - startedAt);
    logWarn('api.request.denied', {
      route,
      method: 'POST',
      request_id: requestId,
      status: denied.status,
      duration_ms: Date.now() - startedAt,
    });
    return denied;
  }

  const parsedBody = await parseJsonBody(req, kycRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { siren, nom, type } = parsedBody.data;

  if (!siren && !nom) {
    return jsonError('siren ou nom requis', 400, 'BAD_REQUEST', undefined, requestId);
  }

  try {
    const company = siren ? await getCompanyDetails(siren) : null;
    const companyContext = company
      ? companyDetailsToContext(company)
      : 'SIREN non fourni — analyse sur la base du nom uniquement.';

    const userMessage = [
      `Client : ${nom || company?.nom || 'N/D'}`,
      `Type : ${type}`,
      `SIREN : ${siren || 'Non fourni'}`,
      '',
      '=== DONNÉES ENTREPRISE (Registre National des Entreprises) ===',
      companyContext,
    ].join('\n');

    const raw = await analyzeWithClaude(PROMPT_KYC, userMessage);
    const result = await parseClaudeJsonRobust<KYCResult>(raw, claudeSchemas.kyc);

    logInfo('api.request.success', {
      route,
      method: 'POST',
      request_id: requestId,
      status: 200,
      duration_ms: Date.now() - startedAt,
    });
    recordApiMetric(route, 200, Date.now() - startedAt);
    return NextResponse.json(result, { headers: { 'x-request-id': requestId } });
  } catch (err) {
    const response = jsonException(err, requestId);
    recordApiMetric(route, response.status, Date.now() - startedAt);
    logError(
      'api.request.error',
      {
        route,
        method: 'POST',
        request_id: requestId,
        duration_ms: Date.now() - startedAt,
      },
      err
    );
    return response;
  }
}
