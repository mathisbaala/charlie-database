// charlie-database/app/api/surveillance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails, companyDetailsToContext } from '../../../lib/datagouv';
import { getCompanyAnnouncements, bodaccToContext } from '../../../lib/bodacc';
import { analyzeWithClaude, parseClaudeJsonRobust, PROMPT_SURVEILLANCE } from '../../../lib/claude';
import { parseJsonBody, jsonError, jsonException, getRequestId } from '../../../lib/http';
import { logError, logInfo, logWarn } from '../../../lib/logger';
import { recordApiMetric } from '../../../lib/metrics';
import { enforceApiSecurity } from '../../../lib/security';
import { surveillanceRequestSchema, claudeSchemas } from '../../../lib/schemas';
import type { SurveillanceResult, SurveillanceConfig } from '../../../types';

export async function POST(req: NextRequest) {
  const route = '/api/surveillance';
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  logInfo('api.request.start', { route, method: 'POST', request_id: requestId });

  const denied = await enforceApiSecurity(req, 'surveillance', requestId);
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

  const parsedBody = await parseJsonBody(req, surveillanceRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { siren, config } = parsedBody.data as { siren: string; config?: SurveillanceConfig };

  if (!siren) {
    return jsonError('siren requis', 400, 'BAD_REQUEST', undefined, requestId);
  }

  try {
    const [company, announcements] = await Promise.all([
      getCompanyDetails(siren),
      getCompanyAnnouncements(siren, 10),
    ]);

    const companyContext = companyDetailsToContext(company);
    const bodaccContext = bodaccToContext(announcements);

    const profileLines = config ? [
      `Profil client : ${config.profil_risque ?? 'N/D'}`,
      `Part de l'entreprise dans le patrimoine : ${config.part_patrimoine ?? 'N/D'}`,
      `Valeur estimée de la participation : ${config.valeur_participation ?? 'N/D'}`,
      `Objectifs patrimoniaux : ${config.objectifs?.join(', ') ?? 'N/D'}`,
    ] : [];

    const userMessage = [
      ...(profileLines.length ? ['=== PROFIL CLIENT CGP ===', ...profileLines, ''] : []),
      '=== DONNÉES ENTREPRISE (Registre National des Entreprises) ===',
      companyContext,
      '',
      '=== ANNONCES BODACC RÉCENTES ===',
      bodaccContext,
    ].join('\n');

    const raw = await analyzeWithClaude(PROMPT_SURVEILLANCE, userMessage);
    const result = await parseClaudeJsonRobust<SurveillanceResult>(raw, claudeSchemas.surveillance);

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
