// charlie-live/app/api/brief-rdv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails, companyDetailsToContext } from '../../../lib/datagouv';
import { getCompanyAnnouncements, bodaccToContext } from '../../../lib/bodacc';
import { analyzeWithClaude, PROMPT_BRIEF_RDV } from '../../../lib/claude';
import type { BriefRDVResult } from '../../../types';

export async function POST(req: NextRequest) {
  const body = await req.json() as { siren: string; contexte_rdv?: string };
  const { siren, contexte_rdv } = body;

  if (!siren) {
    return NextResponse.json({ error: 'siren requis' }, { status: 400 });
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
    const result = JSON.parse(raw) as BriefRDVResult;

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/brief-rdv]', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
