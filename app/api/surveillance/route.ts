// charlie-live/app/api/surveillance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails, companyDetailsToContext } from '../../../lib/datagouv';
import { getCompanyAnnouncements, bodaccToContext } from '../../../lib/bodacc';
import { analyzeWithClaude, parseClaudeJsonRobust, PROMPT_SURVEILLANCE } from '../../../lib/claude';
import type { SurveillanceResult, SurveillanceConfig } from '../../../types';

export async function POST(req: NextRequest) {
  const body = await req.json() as { siren: string; config: SurveillanceConfig };
  const { siren, config } = body;

  if (!siren) {
    return NextResponse.json({ error: 'siren requis' }, { status: 400 });
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
    const result = await parseClaudeJsonRobust<SurveillanceResult>(raw);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/surveillance]', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
