// charlie-live/app/api/signaux/route.ts
import { NextResponse } from 'next/server';
import { getRecentAnnouncements } from '../../../lib/bodacc';
import { getCompany, companyToContext } from '../../../lib/pappers';
import { analyzeWithClaude, parseClaudeJsonRobust, PROMPT_SIGNAUX } from '../../../lib/claude';
import type { SignalHebdo } from '../../../types';

export async function GET() {
  try {
    // 1. Récupère les annonces BODACC récentes
    const announcements = await getRecentAnnouncements(40);

    // 2. Déduplique les SIRENs pour enrichissement Pappers
    const uniqueSirens = [...new Set(announcements.map((a) => a.siren).filter(Boolean))] as string[];
    const sirenSample = uniqueSirens.slice(0, 12); // limite les appels API

    // 3. Enrichit avec Pappers (en parallèle, ignore les erreurs individuelles)
    const enriched = await Promise.allSettled(
      sirenSample.map(async (siren) => {
        try {
          const company = await getCompany(siren);
          return { siren, context: companyToContext(company) };
        } catch {
          return { siren, context: 'Données Pappers non disponibles.' };
        }
      })
    );

    const pappersMap = enriched
      .filter((r): r is PromiseFulfilledResult<{ siren: string; context: string }> => r.status === 'fulfilled')
      .reduce<Record<string, string>>((acc, r) => {
        acc[r.value.siren] = r.value.context;
        return acc;
      }, {});

    // 4. Formate le message pour Claude
    const bodaccLines = announcements.slice(0, 20).map((a) =>
      `SIREN: ${a.siren} | ${a.date_parution ?? 'N/D'} | ${a.famille_avis ?? a.type_annonce ?? 'N/D'} | ${a.commercant ?? 'N/D'} | ${a.ville ?? 'N/D'}`
    );

    const pappersLines = Object.entries(pappersMap).map(
      ([siren, ctx]) => `--- SIREN ${siren} ---\n${ctx}`
    );

    const userMessage = [
      '=== ANNONCES BODACC RÉCENTES ===',
      bodaccLines.join('\n'),
      '',
      '=== DONNÉES PAPPERS (enrichissement) ===',
      pappersLines.join('\n\n'),
    ].join('\n');

    const raw = await analyzeWithClaude(PROMPT_SIGNAUX, userMessage);
    const result = await parseClaudeJsonRobust<SignalHebdo[]>(raw);

    return NextResponse.json({ signaux: result });
  } catch (err) {
    console.error('[/api/signaux]', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
