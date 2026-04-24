// charlie-database/app/api/brief-rdv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails, companyDetailsToContext } from '../../../lib/datagouv';
import { getCompanyAnnouncements, bodaccToContext } from '../../../lib/bodacc';
import { analyzeWithClaude, parseClaudeJsonRobust, PROMPT_BRIEF_RDV } from '../../../lib/claude';
import { parseJsonBody, jsonError, jsonException, getRequestId } from '../../../lib/http';
import { logError, logInfo, logWarn } from '../../../lib/logger';
import { recordApiMetric } from '../../../lib/metrics';
import { enforceApiSecurity } from '../../../lib/security';
import { briefRdvRequestSchema, claudeSchemas } from '../../../lib/schemas';
import type { BriefRDVResult } from '../../../types';

export async function POST(req: NextRequest) {
  const route = '/api/brief-rdv';
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  logInfo('api.request.start', { route, method: 'POST', request_id: requestId });

  const denied = await enforceApiSecurity(req, 'brief-rdv', requestId);
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

  const parsedBody = await parseJsonBody(req, briefRdvRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { siren, contexte_rdv } = parsedBody.data;

  if (!siren) {
    return jsonError('siren requis', 400, 'BAD_REQUEST', undefined, requestId);
  }

  try {
    const [company, announcements] = await Promise.all([
      getCompanyDetails(siren),
      getCompanyAnnouncements(siren, 8),
    ]);

    const companyContext = companyDetailsToContext(company);
    const bodaccContext = bodaccToContext(announcements);
    const rdvContext = contexte_rdv ? `\n\nContexte du rendez-vous fourni par le conseiller :\n${contexte_rdv}` : '';

    const userMessage = [
      '=== DONNÉES ENTREPRISE (Registre National des Entreprises) ===',
      companyContext,
      '',
      '=== ANNONCES BODACC RÉCENTES ===',
      bodaccContext,
      rdvContext,
    ].join('\n');

    const raw = await analyzeWithClaude(PROMPT_BRIEF_RDV, userMessage);
    const result = await parseClaudeJsonRobust<BriefRDVResult>(raw, claudeSchemas.briefRdv);

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
