// charlie-live/app/api/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails, companyDetailsToContext } from '../../../lib/datagouv';
import { analyzeWithClaude, parseClaudeJsonRobust, PROMPT_KYC } from '../../../lib/claude';
import type { KYCResult } from '../../../types';

export async function POST(req: NextRequest) {
  const body = await req.json() as { siren: string; nom: string; type: string };
  const { siren, nom, type } = body;

  if (!siren && !nom) {
    return NextResponse.json({ error: 'siren ou nom requis' }, { status: 400 });
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
    const result = await parseClaudeJsonRobust<KYCResult>(raw);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/kyc]', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
