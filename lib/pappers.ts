// charlie-database/lib/pappers.ts
import type { PappersCompany } from '../types';
import { withSpan } from './telemetry';
import { recordUpstreamMetric } from './metrics';

const BASE = 'https://api.pappers.fr/v2';
const FETCH_TIMEOUT_MS = Number(process.env.UPSTREAM_FETCH_TIMEOUT_MS ?? '12000');

function getToken(): string {
  const t = process.env.PAPPERS_API_KEY;
  if (!t || t === 'VOTRE_CLE_PAPPERS_ICI') {
    throw new Error('PAPPERS_API_KEY manquante — ajoutez-la dans .env.local');
  }
  return t;
}

function formatAmount(euros?: number): string {
  if (euros == null) return 'N/D';
  if (euros >= 1_000_000) return `${(euros / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  if (euros >= 1_000) return `${(euros / 1_000).toFixed(0)} K€`;
  return `${euros} €`;
}

export { formatAmount };

/**
 * Récupère les données complètes d'une entreprise par SIREN.
 * Inclut : finances, dirigeants, bénéficiaires effectifs, publications BODACC,
 * procédures collectives.
 */
export async function getCompany(siren: string): Promise<PappersCompany> {
  const url = new URL(`${BASE}/entreprise`);
  url.searchParams.set('siren', siren.replace(/\s/g, ''));
  url.searchParams.set('api_token', getToken());
  url.searchParams.set('extrait_kbis', '1');
  url.searchParams.set('statuts', '1');
  url.searchParams.set('publications_bodacc', '1');
  url.searchParams.set('beneficiaires', '1');

  const res = await withSpan(
    'upstream.pappers.company',
    {
      'upstream.name': 'pappers',
      'company.siren': siren,
      'http.url': url.toString(),
    },
    async () => {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      return fetch(url.toString(), {
        next: { revalidate: 300 },
        signal: controller.signal,
      })
        .then((response) => {
          recordUpstreamMetric('pappers.company', response.status, Date.now() - startedAt);
          return response;
        })
        .catch((err) => {
          recordUpstreamMetric('pappers.company', 0, Date.now() - startedAt);
          throw err;
        })
        .finally(() => clearTimeout(timeoutId));
    }
  );
  if (!res.ok) throw new Error(`Pappers entreprise ${siren}: ${res.status}`);

  return res.json() as Promise<PappersCompany>;
}

/**
 * Helper : extrait les données financières les plus récentes.
 */
function getLatestFinance(company: PappersCompany) {
  if (!company.finances?.length) return null;
  return [...company.finances].sort((a, b) => b.annee - a.annee)[0];
}

/**
 * Helper : formate une entreprise Pappers en contexte texte pour Claude.
 */
export function companyToContext(company: PappersCompany): string {
  const finance = getLatestFinance(company);
  const lines: string[] = [
    `Société : ${company.nom_entreprise} (${company.forme_juridique ?? 'N/D'})`,
    `SIREN : ${company.siren_formate}`,
    `Création : ${company.date_creation ?? 'N/D'}`,
    `Adresse siège : ${company.siege?.adresse_ligne_1 ?? ''} ${company.siege?.code_postal ?? ''} ${company.siege?.ville ?? ''}`.trim(),
    `Secteur NAF : ${company.siege?.code_naf ?? ''} — ${company.siege?.libelle_code_naf ?? 'N/D'}`,
    `Effectif : ${company.tranche_effectif ?? 'N/D'} salariés`,
  ];

  if (finance) {
    lines.push(`Chiffre d'affaires (${finance.annee}) : ${formatAmount(finance.chiffre_affaires)}`);
    lines.push(`Résultat net (${finance.annee}) : ${formatAmount(finance.resultat_net)}`);
    lines.push(`Capitaux propres (${finance.annee}) : ${formatAmount(finance.capitaux_propres)}`);
  }

  if (company.dirigeants?.length) {
    lines.push(`Dirigeants : ${company.dirigeants.map((d) => `${d.prenom ?? ''} ${d.nom} (${d.qualite})`).join(', ')}`);
  }

  if (company.beneficiaires?.length) {
    lines.push(`Bénéficiaires effectifs : ${company.beneficiaires.map((b) => `${b.prenom ?? ''} ${b.nom} ${b.pourcentage_parts}%`).join(', ')}`);
  }

  if (company.procedures_collectives?.length) {
    lines.push(`ALERTE procédures collectives : ${company.procedures_collectives.map((p) => p.type).join(', ')}`);
  } else {
    lines.push(`Procédures collectives : Aucune`);
  }

  const bodacc = company.publications_bodacc?.slice(0, 5) ?? [];
  if (bodacc.length) {
    lines.push(`Publications BODACC récentes :`);
    bodacc.forEach((p) => lines.push(`  - ${p.date ?? 'N/D'} : ${p.famille_libelle ?? p.type_publication ?? 'N/D'} — ${p.libelle ?? ''}`));
  }

  return lines.join('\n');
}
