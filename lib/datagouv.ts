// charlie-live/lib/datagouv.ts
// API : recherche-entreprises.api.gouv.fr — gratuite, sans clé
import type { CompanySearchResult } from '../types';

const BASE = 'https://recherche-entreprises.api.gouv.fr';
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [350, 900, 1800];

// ─── Types internes bruts API ─────────────────────────────────────────────

interface RawDirigeant {
  nom?: string;
  prenoms?: string;
  annee_de_naissance?: string;
  qualite?: string;
  type_dirigeant?: string;
  siren?: string;
  denomination?: string;
}

interface RawSiege {
  siret?: string;
  adresse?: string;
  code_postal?: string;
  commune?: string;
  departement?: string;
  region?: string;
  libelle_commune?: string;
  activite_principale?: string;
  libelle_activite_principale?: string;
  tranche_effectif_salarie?: string;
  annee_tranche_effectif_salarie?: string;
  date_creation?: string;
  est_siege?: boolean;
  latitude?: string;
  longitude?: string;
}

interface RawFinances {
  [annee: string]: {
    ca?: number;
    resultat_net?: number;
    bilan?: number;
  };
}

interface RawCompany {
  siren: string;
  nom_complet: string;
  nom_raison_sociale?: string;
  forme_juridique?: string;
  nature_juridique?: string;
  date_creation?: string;
  date_fermeture?: string;
  etat_administratif?: string;
  categorie_entreprise?: string;
  tranche_effectif_salarie?: string;
  annee_tranche_effectif_salarie?: string;
  activite_principale?: string;
  libelle_activite_principale?: string;
  section_activite_principale?: string;
  siege?: RawSiege;
  matching_etablissements?: RawSiege[];
  dirigeants?: RawDirigeant[];
  finances?: RawFinances;
  complements?: Record<string, unknown>;
}

// ─── Type enrichi exposé à l'app ─────────────────────────────────────────

export interface CompanyDetails {
  siren: string;
  nom: string;
  forme_juridique?: string;
  date_creation?: string;
  etat_administratif?: string;
  categorie_entreprise?: string;           // PE, ETI, GE…
  tranche_effectif?: string;
  activite_naf?: string;
  libelle_activite?: string;
  siege?: {
    adresse?: string;
    code_postal?: string;
    ville?: string;
    departement?: string;
    region?: string;
  };
  dirigeants: Array<{
    nom: string;
    prenoms?: string;
    annee_naissance?: string;
    qualite?: string;
    type?: string;
  }>;
  finances: Array<{
    annee: number;
    ca?: number;
    resultat_net?: number;
    bilan?: number;
  }>;
}

function formatAmount(euros?: number): string {
  if (!euros) return 'N/D';
  if (euros >= 1_000_000_000) return `${(euros / 1_000_000_000).toFixed(1).replace('.', ',')} Md€`;
  if (euros >= 1_000_000) return `${(euros / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  if (euros >= 1_000) return `${(euros / 1_000).toFixed(0)} K€`;
  return `${euros} €`;
}

export { formatAmount };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, revalidate: number): Promise<Response> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) return res;
    if (!RETRYABLE_STATUSES.has(res.status)) return res;
    if (attempt === RETRY_DELAYS_MS.length) return res;

    await sleep(RETRY_DELAYS_MS[attempt]);
  }

  throw new Error('recherche-entreprises: impossible de contacter le service');
}

function rawToDetails(r: RawCompany): CompanyDetails {
  const siegeRaw = r.siege ?? r.matching_etablissements?.[0];

  // Finances : transformer l'objet { "2022": { ca: ... } } en tableau trié
  const finances = Object.entries(r.finances ?? {})
    .map(([annee, vals]) => ({ annee: Number(annee), ...vals }))
    .sort((a, b) => b.annee - a.annee);

  return {
    siren: r.siren,
    nom: r.nom_complet ?? r.nom_raison_sociale ?? r.siren,
    forme_juridique: r.forme_juridique,
    date_creation: r.date_creation,
    etat_administratif: r.etat_administratif,
    categorie_entreprise: r.categorie_entreprise,
    tranche_effectif: r.tranche_effectif_salarie,
    activite_naf: r.activite_principale ?? siegeRaw?.activite_principale,
    libelle_activite: r.libelle_activite_principale ?? siegeRaw?.libelle_activite_principale,
    siege: siegeRaw ? {
      adresse: siegeRaw.adresse,
      code_postal: siegeRaw.code_postal,
      ville: siegeRaw.libelle_commune,
      departement: siegeRaw.departement,
      region: siegeRaw.region,
    } : undefined,
    dirigeants: (r.dirigeants ?? []).map((d) => ({
      nom: d.nom ?? d.denomination ?? 'N/D',
      prenoms: d.prenoms,
      annee_naissance: d.annee_de_naissance,
      qualite: d.qualite,
      type: d.type_dirigeant,
    })),
    finances,
  };
}

/**
 * Récupère les données complètes d'une entreprise par SIREN.
 * Source : recherche-entreprises.api.gouv.fr (gratuit, sans clé).
 * Inclut : dirigeants, finances (CA, résultat net), siège, effectif.
 */
export async function getCompanyDetails(siren: string): Promise<CompanyDetails> {
  const clean = siren.replace(/\s/g, '');
  const url = new URL(`${BASE}/search`);
  url.searchParams.set('q', clean);
  url.searchParams.set('per_page', '1');

  const res = await fetchWithRetry(url.toString(), 300);

  if (!res.ok) throw new Error(`recherche-entreprises: ${res.status}`);

  const data = await res.json() as { results?: RawCompany[] };
  const company = (data.results ?? []).find((r) => r.siren === clean) ?? data.results?.[0];
  if (!company) throw new Error(`Entreprise ${siren} introuvable`);

  return rawToDetails(company);
}

/**
 * Formate les données d'une entreprise en contexte texte pour Claude.
 */
export function companyDetailsToContext(c: CompanyDetails): string {
  const latestFinance = c.finances[0];
  const lines: string[] = [
    `Société : ${c.nom} (${c.forme_juridique ?? 'N/D'})`,
    `SIREN : ${c.siren}`,
    `Création : ${c.date_creation ?? 'N/D'}`,
    `Catégorie : ${c.categorie_entreprise ?? 'N/D'}`,
    `Secteur NAF : ${c.activite_naf ?? 'N/D'} — ${c.libelle_activite ?? 'N/D'}`,
    `Effectif (tranche) : ${c.tranche_effectif ?? 'N/D'}`,
    `Siège : ${[c.siege?.adresse, c.siege?.code_postal, c.siege?.ville].filter(Boolean).join(' ') || 'N/D'}`,
  ];

  if (latestFinance) {
    lines.push(`--- Finances ${latestFinance.annee} (source : Registre National des Entreprises) ---`);
    if (latestFinance.ca)           lines.push(`Chiffre d'affaires : ${formatAmount(latestFinance.ca)}`);
    if (latestFinance.resultat_net) lines.push(`Résultat net : ${formatAmount(latestFinance.resultat_net)}`);
    if (latestFinance.bilan)        lines.push(`Total bilan : ${formatAmount(latestFinance.bilan)}`);
  } else {
    lines.push(`Finances : non disponibles dans les sources publiques`);
  }

  if (c.dirigeants.length) {
    lines.push(`Dirigeants (${c.dirigeants.length}) :`);
    c.dirigeants.slice(0, 6).forEach((d) =>
      lines.push(`  - ${d.prenoms ?? ''} ${d.nom} (${d.qualite ?? 'N/D'})${d.annee_naissance ? ` — né en ${d.annee_naissance}` : ''}`)
    );
  }

  return lines.join('\n');
}

/**
 * Recherche d'entreprises — utilisée pour l'autocomplete frontend.
 */
export async function searchEntreprises(query: string): Promise<CompanySearchResult[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 3) return [];

  const url = new URL(`${BASE}/search`);
  url.searchParams.set('q', trimmedQuery);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '8');

  const res = await fetchWithRetry(url.toString(), 60);

  if (!res.ok) throw new Error(`recherche-entreprises: ${res.status}`);

  const data = await res.json() as { results?: RawCompany[] };

  return (data.results ?? []).map((r) => ({
    siren: r.siren,
    nom: r.nom_complet,
    forme_juridique: r.forme_juridique,
    ville: r.matching_etablissements?.[0]?.libelle_commune ?? r.siege?.libelle_commune,
    secteur: r.libelle_activite_principale ?? r.activite_principale,
    effectif: r.tranche_effectif_salarie,
  } as CompanySearchResult));
}
