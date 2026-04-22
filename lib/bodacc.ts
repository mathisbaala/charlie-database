// charlie-live/lib/bodacc.ts
// API : BODACC DILA — bodacc-datadila.opendatasoft.com (API Explorer v2.1)
// L'ancien endpoint datanova.fr est mort (NXDOMAIN). Toutes les annonces
// (A, B, C) sont désormais dans le dataset unique "annonces-commerciales".
import type { BODACCAnnouncement } from '../types';

const BODACC_BASE =
  'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';

/**
 * Convertit un record brut de l'API v2.1 en BODACCAnnouncement.
 * Le champ `registre` contient un tableau de chaînes [siret_sans_espace, siret_formaté].
 * On en extrait le SIREN (9 premiers chiffres).
 */
function recordToAnnouncement(r: Record<string, unknown>): BODACCAnnouncement {
  // registre : ['123456789', '123 456 789'] ou null
  const registre = r['registre'];
  let siren: string | undefined;
  if (Array.isArray(registre) && registre.length > 0) {
    // Prend le premier élément (sans espaces), tronque à 9 chars = SIREN
    siren = String(registre[0]).replace(/\s/g, '').slice(0, 9) || undefined;
  }

  return {
    siren,
    commercant:   r['commercant']     as string | undefined,
    ville:        r['ville']          as string | undefined,
    departement:  r['numerodepartement'] as string | undefined,
    date_parution: r['dateparution']  as string | undefined,
    famille_avis: r['familleavis_lib'] as string | undefined,
    type_annonce: r['typeavis_lib']   as string | undefined,
    tribunal:     r['tribunal']       as string | undefined,
    numero_annonce: String(r['numeroannonce'] ?? ''),
  };
}

/**
 * Récupère les annonces BODACC récentes (toutes entreprises).
 * Utilisé pour le use case "Signaux hebdomadaires".
 */
export async function getRecentAnnouncements(rows = 40): Promise<BODACCAnnouncement[]> {
  const url = new URL(BODACC_BASE);
  url.searchParams.set('limit', String(rows));
  url.searchParams.set('order_by', 'dateparution DESC');

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`BODACC HTTP ${res.status}`);
    const data = await res.json() as { results?: Record<string, unknown>[] };
    const results = data.results ?? [];
    return results
      .map(recordToAnnouncement)
      .filter((a) => a.siren && a.siren.length === 9);
  } catch (err) {
    console.error('[bodacc] getRecentAnnouncements:', err);
    return [];
  }
}

/**
 * Récupère les annonces BODACC pour un SIREN spécifique.
 * Recherche via le champ `registre` qui contient le SIRET (dont les 9 premiers chars = SIREN).
 */
export async function getCompanyAnnouncements(siren: string, rows = 10): Promise<BODACCAnnouncement[]> {
  const clean = siren.replace(/\s/g, '').slice(0, 9);
  const url = new URL(BODACC_BASE);
  // L'opérateur LIKE sur un champ multivalué (registre) cherche dans chaque élément du tableau
  url.searchParams.set('where', `registre like "${clean}"`);
  url.searchParams.set('limit', String(rows));
  url.searchParams.set('order_by', 'dateparution DESC');

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`BODACC HTTP ${res.status}`);
    const data = await res.json() as { results?: Record<string, unknown>[] };
    return (data.results ?? []).map(recordToAnnouncement);
  } catch (err) {
    console.error('[bodacc] getCompanyAnnouncements:', err);
    return [];
  }
}

/**
 * Formate les annonces BODACC en contexte texte pour Claude.
 */
export function bodaccToContext(announcements: BODACCAnnouncement[]): string {
  if (!announcements.length) return 'Aucune annonce BODACC récente.';
  return announcements.slice(0, 8).map((a) =>
    `- ${a.date_parution ?? 'N/D'} : ${a.famille_avis ?? a.type_annonce ?? 'N/D'} (${a.ville ?? 'N/D'}) — Tribunal : ${a.tribunal ?? 'N/D'}`
  ).join('\n');
}
