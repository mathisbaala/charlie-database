// charlie-live/app/api/due-diligence/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails, companyDetailsToContext } from '../../../lib/datagouv';
import { getCompanyAnnouncements, bodaccToContext } from '../../../lib/bodacc';
import { analyzeWithClaude, parseClaudeJsonRobust, PROMPT_DUE_DILIGENCE } from '../../../lib/claude';
import type { DueDiligenceResult } from '../../../types';

export async function POST(req: NextRequest) {
  const body = await req.json() as { siren: string; context?: string };
  const { siren, context } = body;

  if (!siren) {
    return NextResponse.json({ error: 'siren requis' }, { status: 400 });
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
    const result = await parseClaudeJsonRobust<DueDiligenceResult>(raw);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/due-diligence]', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
