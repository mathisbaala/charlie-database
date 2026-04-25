// charlie-database/app/api/due-diligence/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails, companyDetailsToContext, formatAmount } from '../../../lib/datagouv';
import { getCompanyAnnouncements, bodaccToContext } from '../../../lib/bodacc';
import { analyzeWithClaude, parseClaudeJsonRobust, PROMPT_DUE_DILIGENCE } from '../../../lib/claude';
import { parseJsonBody, jsonError, jsonException, getRequestId } from '../../../lib/http';
import { logError, logInfo, logWarn } from '../../../lib/logger';
import { recordApiMetric } from '../../../lib/metrics';
import { enforceApiSecurity } from '../../../lib/security';
import { dueDiligenceRequestSchema, claudeSchemas } from '../../../lib/schemas';
import type { BODACCAnnouncement, DueDiligenceResult } from '../../../types';

function inferProcedureCollective(announcements: BODACCAnnouncement[]): DueDiligenceResult['societe']['procedure_collective'] {
  const lowered = announcements
    .map((a) => `${a.famille_avis ?? ''} ${a.type_annonce ?? ''}`.toLowerCase())
    .filter(Boolean);

  const hasProcedureMention = lowered.some((item) =>
    /(procedure collective|redressement|liquidation|sauvegarde|cessation des paiements|faillite)/.test(item)
  );
  if (!hasProcedureMention) return 'Aucune';

  const hasClosure = lowered.some((item) => /(cloture|clôture|radiation|plan arrete|plan arrêté)/.test(item));
  return hasClosure ? 'Historique' : 'En cours';
}

function sanitizeSignalSource(source: string): string {
  const clean = source.trim();
  if (!clean) return 'Source publique non verifiable (RNE/BODACC)';
  if (/(rne|registre national des entreprises|bodacc)/i.test(clean)) return clean;
  return 'Source publique non verifiable (RNE/BODACC)';
}

function buildFallbackActions(signals: DueDiligenceResult['signaux']): DueDiligenceResult['actions'] {
  if (signals.length === 0) {
    return [
      {
        priorite: 1,
        action: 'Valider les informations cles directement avec le dirigeant',
        timing: 'Avant RDV',
        rationnel:
          'Les sources publiques disponibles sont partielles. Confirmer structure, projet et points de vigilance avant formalisation des recommandations.',
      },
    ];
  }

  return signals.slice(0, 3).map((signal, index) => ({
    priorite: index + 1,
    action: `Qualifier l'impact de "${signal.titre}"`,
    timing: index === 0 ? 'Avant RDV' : 'Dans les 30j',
    rationnel: `Signal observe: ${signal.source}. Documenter l'impact patrimonial et cadrer la recommandation avec le client.`,
  }));
}

function normalizeActions(
  actions: DueDiligenceResult['actions'],
  signals: DueDiligenceResult['signaux']
): DueDiligenceResult['actions'] {
  const fallbackSource = signals[0]?.source?.trim() || 'RNE/BODACC';

  const normalized = actions
    .filter((action) => action.action?.trim().length > 0)
    .slice(0, 5)
    .sort((a, b) => a.priorite - b.priorite)
    .map((action, index) => {
      const timing = action.timing?.trim() || 'Dans les 30j';
      const rationnel = action.rationnel?.trim() || `Source: ${fallbackSource}.`;
      const withSource = /(rne|registre national des entreprises|bodacc)/i.test(rationnel)
        ? rationnel
        : `${rationnel} Source: ${fallbackSource}.`;

      return {
        priorite: index + 1,
        action: action.action.trim(),
        timing,
        rationnel: withSource,
      };
    });

  if (normalized.length > 0) return normalized.slice(0, 3);
  return buildFallbackActions(signals);
}

function buildFactualSociete(
  company: Awaited<ReturnType<typeof getCompanyDetails>>,
  announcements: BODACCAnnouncement[],
  modelSociete: DueDiligenceResult['societe']
): DueDiligenceResult['societe'] {
  const latestFinance = company.finances[0];
  const secteur = [company.activite_naf, company.libelle_activite].filter(Boolean).join(' — ');
  const localisation = [company.siege?.ville, company.siege?.departement].filter(Boolean).join(', ');

  return {
    nom: company.nom || modelSociete.nom || 'N/D',
    siren: company.siren || modelSociete.siren || 'N/D',
    forme: company.forme_juridique || modelSociete.forme || 'N/D',
    secteur: secteur || modelSociete.secteur || 'N/D',
    localisation: localisation || modelSociete.localisation || 'N/D',
    creation: company.date_creation || modelSociete.creation || 'N/D',
    salaries: company.tranche_effectif || modelSociete.salaries || 'N/D',
    ca: latestFinance?.ca != null ? formatAmount(latestFinance.ca) : modelSociete.ca || 'N/D',
    ebitda: 'N/D',
    capitaux_propres: 'N/D',
    valeur_estimee: 'N/D',
    dividendes: 'N/D',
    procedure_collective: inferProcedureCollective(announcements),
  };
}

export async function POST(req: NextRequest) {
  const route = '/api/due-diligence';
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  logInfo('api.request.start', { route, method: 'POST', request_id: requestId });

  const denied = await enforceApiSecurity(req, 'due-diligence', requestId);
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

  const parsedBody = await parseJsonBody(req, dueDiligenceRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { siren, context } = parsedBody.data;

  if (!siren) {
    return jsonError('siren requis', 400, 'BAD_REQUEST', undefined, requestId);
  }

  try {
    const [company, bodaccAnnouncements] = await Promise.all([
      getCompanyDetails(siren),
      getCompanyAnnouncements(siren, 8),
    ]);

    const companyContext = companyDetailsToContext(company);
    const bodaccContext = bodaccToContext(bodaccAnnouncements);
    const userContext = context ? `\n\nContexte additionnel fourni par le conseiller :\n${context}` : '';

    const userMessage = [
      '=== DONNÉES ENTREPRISE (Registre National des Entreprises — source officielle) ===',
      companyContext,
      '',
      '=== ANNONCES BODACC ===',
      bodaccContext,
      userContext,
    ].join('\n');

    const raw = await analyzeWithClaude(PROMPT_DUE_DILIGENCE, userMessage);
    const parsed = await parseClaudeJsonRobust<DueDiligenceResult>(raw, claudeSchemas.dueDiligence);
    const result: DueDiligenceResult = {
      ...parsed,
      societe: buildFactualSociete(company, bodaccAnnouncements, parsed.societe),
      signaux: parsed.signaux.map((signal) => ({
        ...signal,
        source: sanitizeSignalSource(signal.source ?? ''),
      })),
      actions: normalizeActions(parsed.actions, parsed.signaux),
    };

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
