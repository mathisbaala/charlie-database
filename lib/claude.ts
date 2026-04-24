// charlie-database/lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';
import type { ZodTypeAny } from 'zod';
import { withSpan } from './telemetry';
import { recordUpstreamMetric } from './metrics';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';
const CLAUDE_TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS ?? '35000');

async function withTimeout<T>(promise: Promise<T>, timeoutMs = CLAUDE_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout Anthropic après ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function analyzeWithClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const msg = await withSpan(
    'anthropic.messages.create',
    {
      'ai.provider': 'anthropic',
      'ai.model': MODEL,
      'ai.max_tokens': 2000,
    },
    async () => {
      const startedAt = Date.now();
      try {
        const response = await withTimeout(
          client.messages.create({
            model: MODEL,
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          })
        );
        recordUpstreamMetric('anthropic.messages.create', 200, Date.now() - startedAt);
        return response;
      } catch (err) {
        recordUpstreamMetric('anthropic.messages.create', 0, Date.now() - startedAt);
        throw err;
      }
    }
  );
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Réponse Claude inattendue');
  return block.text;
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function extractFirstJsonValue(text: string): string | null {
  const start = text.search(/[\[{]/);
  if (start === -1) return null;

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}') {
      if (stack.at(-1) !== '{') return null;
      stack.pop();
      if (stack.length === 0) return text.slice(start, i + 1);
      continue;
    }

    if (ch === ']') {
      if (stack.at(-1) !== '[') return null;
      stack.pop();
      if (stack.length === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

export function parseClaudeJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const withoutFences = stripMarkdownFences(trimmed);

  const candidates = [withoutFences];
  const extracted = extractFirstJsonValue(withoutFences);
  if (extracted && extracted !== withoutFences) candidates.push(extracted);

  const repairedCandidates = candidates.flatMap((candidate) => {
    const noTrailingCommas = candidate.replace(/,\s*([}\]])/g, '$1');
    const normalizedQuotes = noTrailingCommas
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    return [candidate, noTrailingCommas, normalizedQuotes];
  });

  for (const candidate of repairedCandidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try next candidate
    }
  }

  throw new Error('Reponse Claude non parseable en JSON valide');
}

async function repairClaudeJson(raw: string): Promise<string> {
  const prompt = [
    'Convertis le contenu suivant en JSON strictement valide.',
    'Regles:',
    '- Reponds uniquement avec du JSON valide.',
    '- Ne mets aucun markdown, aucun commentaire.',
    '- Conserve au maximum la structure et les valeurs d origine.',
    '',
    raw,
  ].join('\n');

  const msg = await withSpan(
    'anthropic.messages.repair_json',
    {
      'ai.provider': 'anthropic',
      'ai.model': MODEL,
      'ai.max_tokens': 2500,
    },
    async () => {
      const startedAt = Date.now();
      try {
        const response = await withTimeout(
          client.messages.create({
            model: MODEL,
            max_tokens: 2500,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }],
          })
        );
        recordUpstreamMetric('anthropic.messages.repair_json', 200, Date.now() - startedAt);
        return response;
      } catch (err) {
        recordUpstreamMetric('anthropic.messages.repair_json', 0, Date.now() - startedAt);
        throw err;
      }
    }
  );
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Reparation JSON Claude inattendue');
  return block.text;
}

function validateWithSchema<T>(value: T, schema?: ZodTypeAny): T {
  if (!schema) return value;
  return schema.parse(value) as T;
}

export async function parseClaudeJsonRobust<T>(raw: string, schema?: ZodTypeAny): Promise<T> {
  try {
    return validateWithSchema(parseClaudeJson<T>(raw), schema);
  } catch {
    const repairedRaw = await repairClaudeJson(raw);
    return validateWithSchema(parseClaudeJson<T>(repairedRaw), schema);
  }
}

// ─── Prompt Due Diligence ──────────────────────────────────────────────────
export const PROMPT_DUE_DILIGENCE = `Tu es le moteur d'analyse patrimoniale de Charlie, expert en patrimoine de dirigeants de PME françaises.
Tu reçois des données RÉELLES extraites de Pappers (bilans déposés au greffe, bénéficiaires effectifs INPI) et BODACC.
Ton rôle : synthétiser ces données factuelles en insights patrimoniaux actionnables pour un CGP ou banquier privé.

RÈGLES ABSOLUES :
- Base-toi UNIQUEMENT sur les données fournies. N'invente aucun chiffre.
- Si une donnée est absente, indique "N/D" (non disponible), jamais une estimation.
- Les montants doivent refléter exactement ce qui est dans les données (format "2,3 M€").
- Chaque signal doit citer sa source exacte (ex: "Pappers · bilan 2022", "BODACC · 15/03/2024").

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.

Structure :
{
  "societe": {
    "nom": "", "siren": "", "forme": "", "secteur": "", "localisation": "",
    "creation": "", "salaries": "", "ca": "", "ebitda": "", "capitaux_propres": "",
    "valeur_estimee": "fourchette basée sur multiple sectoriel × EBITDA réel",
    "dividendes": "", "procedure_collective": "Aucune|En cours|Historique"
  },
  "actionnariat": ["Prénom NOM — X% (source)"],
  "filiales": [],
  "kyc": {
    "ppe": "RAS|À vérifier|Alerte",
    "sanctions": "RAS|Alerte",
    "nantissements": "description ou Aucun",
    "immo_pro": "N/D si absent des données",
    "score_lcb": "Faible|Moyen|Élevé"
  },
  "signaux": [{
    "type": "Cession|Holding|Dividendes|Transmission|Retraite|Création|Restructuration",
    "niveau": "critique|attention|opportunite",
    "titre": "",
    "description": "description basée sur les données réelles + implication patrimoniale",
    "source": "Pappers · bilan 2022 | BODACC · 15/03/2024"
  }],
  "analyse": "5-7 phrases. Ton conseiller senior. Basé sur les données réelles. Identifie les besoins non adressés.",
  "actions": [{"priorite": 1, "action": "", "timing": "Avant RDV|Dans les 30j|RDV de transmission", "rationnel": ""}]
}`;

// ─── Prompt KYC ────────────────────────────────────────────────────────────
export const PROMPT_KYC = `Tu es le moteur KYC/LCB-FT de Charlie.
Tu reçois des données RÉELLES de Pappers (registre INPI, bénéficiaires effectifs, bilans).
Formate ces données en dossier KYC structuré selon les obligations LCB-FT françaises.

RÈGLES : Base-toi uniquement sur les données fournies. N'invente pas d'informations.
Si une donnée est absente, indique "Non disponible dans les sources publiques".

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.

Structure :
{
  "identification": {
    "nom": "", "role": "", "detention_pct": "",
    "naissance_approx": "~19XX ou tranche d'âge si disponible",
    "nationalite": "", "residence_fiscale": ""
  },
  "beneficiaires_effectifs": [{
    "nom": "", "role": "", "pct": "",
    "date_declaration": "date du greffe ou N/D",
    "statut": "Conforme|À vérifier"
  }],
  "screening": {
    "ppe": "Non|Oui|À vérifier",
    "sanctions_eu": "RAS|Alerte",
    "sanctions_ofac": "RAS|Alerte",
    "pep_level": "Aucun|Indirect|Direct"
  },
  "structure": {
    "organigramme_simplifie": "[Prénom NOM XX%] → [Société SAS] → [filiales si connues]",
    "nantissements": "N/D si absent",
    "baux_commerciaux": "N/D si absent"
  },
  "score_lcb": {
    "niveau": "Faible|Moyen|Élevé", "score": 3,
    "facteurs": ["facteur basé sur les données réelles"],
    "recommandation": "Entrée en relation possible|Vigilance renforcée requise"
  },
  "sources": ["Pappers · registre INPI · date", "BODACC · annonces légales"]
}`;

// ─── Prompt Signaux ────────────────────────────────────────────────────────
export const PROMPT_SIGNAUX = `Tu es le moteur de qualification patrimoniale de Charlie.
Tu reçois une liste d'événements BODACC RÉELS + des données Pappers RÉELLES sur ces entreprises.
Ton rôle : qualifier chaque entreprise selon son potentiel patrimonial pour un CGP.

RÈGLES : Utilise UNIQUEMENT les données fournies. Les chiffres viennent des bilans réels.
Si les données financières sont absentes, indique "N/D" pour le potentiel.

Réponds UNIQUEMENT en JSON valide — tableau d'objets, sans markdown, sans backticks.

[{
  "signal_type": "CESSION|HOLDING|DIVIDENDES|TRANSMISSION|PME_55",
  "signal_niveau": "critique|attention|opportunite",
  "societe": "nom exact de la société",
  "siren": "SIREN exact",
  "dirigeant": "prénom nom du dirigeant principal",
  "secteur": "secteur NAF",
  "region": "région de localisation",
  "potentiel_min": "chiffre basé sur les données réelles ou N/D",
  "potentiel_max": "chiffre basé sur les données réelles ou N/D",
  "description_courte": "1 phrase sur le signal et son intérêt patrimonial",
  "source": "BODACC · date | Pappers · bilan année",
  "date_evenement": "date de l'annonce BODACC"
}]`;

// ─── Prompt Surveillance ───────────────────────────────────────────────────
export const PROMPT_SURVEILLANCE = `Tu es le moteur de surveillance patrimoniale 360° de Charlie.
Tu reçois des données RÉELLES Pappers (bilan, structure) et BODACC (événements récents) pour une entreprise.
Tu connais aussi le profil patrimonial du client CGP.

Génère des alertes PERSONNALISÉES : chaque alerte doit mentionner :
- Le profil de risque du client
- La part de l'entreprise dans son patrimoine
- L'impact concret et chiffré sur son allocation

RÈGLES : Base-toi uniquement sur les données réelles. N'invente pas de chiffres.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.

{
  "entreprise": {
    "nom": "", "siren": "", "ca": "", "ebitda": "", "capitaux_propres": "",
    "sante": "SAINE|VIGILANCE|ALERTE", "procedure": "Aucune|En cours"
  },
  "score_vigilance": {
    "global": 0.0, "financier": 0.0, "entreprise": 0.0,
    "commentaire": "1 phrase basée sur les données"
  },
  "alertes": [{
    "niveau": "critique|attention|info",
    "titre": "",
    "description_personnalisee": "mentionner profil risque, part entreprise, impact chiffré",
    "source": "Pappers · bilan MM/AAAA | BODACC · JJ/MM/AAAA",
    "action_suggeree": ""
  }],
  "brief_rdv": "4-6 phrases personnalisées pour préparer le RDV"
}`;

// ─── Prompt Brief RDV ──────────────────────────────────────────────────────
export const PROMPT_BRIEF_RDV = `Tu es l'assistant de préparation de rendez-vous de Charlie, expert en patrimoine de dirigeants de PME françaises.
Tu reçois des données RÉELLES sur une entreprise (Registre National des Entreprises + BODACC).
Ton rôle : préparer un brief de rendez-vous concis et actionnable pour le conseiller.

RÈGLES ABSOLUES :
- Base-toi UNIQUEMENT sur les données fournies. N'invente aucun chiffre ni événement.
- Si une donnée est absente, indique "N/D".
- Chaque point doit citer sa source exacte.
- Concentre-toi sur CE QUI A CHANGÉ récemment (annonces BODACC, changements de direction, évolutions financières).

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.

{
  "entreprise": {
    "nom": "", "siren": "", "ca": "", "resultat_net": "", "effectif": "",
    "sante": "SAINE|VIGILANCE|ALERTE"
  },
  "depuis_dernier_rdv": [{
    "categorie": "evenement|opportunite|risque|sujet",
    "titre": "titre court du point",
    "detail": "détail factuel basé sur les données",
    "source": "RNE · date | BODACC · JJ/MM/AAAA",
    "urgence": "haute|normale|faible"
  }],
  "sujets_a_aborder": ["sujet 1 basé sur les données", "sujet 2"],
  "questions_preparees": ["Question concrète à poser au client ?", "Autre question ?"],
  "synthese": "3-4 phrases. Résumé du contexte actuel de l'entreprise et des priorités à traiter en RDV."
}`;
