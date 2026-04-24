import { type ReactNode } from 'react';
import type { RequestState } from './request-state';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function toLabel(key: string): string {
  const labels: Record<string, string> = {
    societe: 'Societe',
    entreprise: 'Entreprise',
    identification: 'Identification',
    actionnariat: 'Actionnariat',
    filiales: 'Filiales',
    screening: 'Screening',
    structure: 'Structure',
    score_lcb: 'Score LCB-FT',
    score_vigilance: 'Score de vigilance',
    alertes: 'Alertes',
    signaux: 'Signaux',
    actions: 'Actions recommandees',
    analyse: 'Analyse',
    synthese: 'Synthese',
    depuis_dernier_rdv: 'Depuis le dernier RDV',
    sujets_a_aborder: 'Sujets a aborder',
    questions_preparees: 'Questions preparees',
    procedure_collective: 'Procedure collective',
    part_patrimoine: 'Part du patrimoine',
    valeur_participation: 'Valeur de participation',
    profil_risque: 'Profil de risque',
    date_evenement: 'Date evenement',
    description_courte: 'Description',
    description_personnalisee: 'Description personnalisee',
    action_suggeree: 'Action suggeree',
    potentiel_min: 'Potentiel min',
    potentiel_max: 'Potentiel max',
  };
  if (labels[key]) return labels[key];

  return key
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function formatPrimitive(value: string | number | boolean | null): string {
  if (value === null) return '-';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
}

function getTone(value: string): 'success' | 'warn' | 'danger' | null {
  const raw = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const successValues = ['ras', 'saine', 'aucune', 'faible', 'conforme', 'non', 'opportunite'];
  const warnValues = ['vigilance', 'moyen', 'a verifier'];
  const dangerValues = ['alerte', 'critique', 'eleve', 'en cours'];

  if (successValues.includes(raw)) return 'success';
  if (warnValues.includes(raw)) return 'warn';
  if (dangerValues.includes(raw)) return 'danger';
  return null;
}

function resolveCardTitle(value: Record<string, unknown>, index: number): string {
  const keys = ['titre', 'nom', 'societe', 'entreprise', 'categorie', 'type', 'siren'];
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return `Element ${index + 1}`;
}

type OverviewItem = {
  label: string;
  value: string;
  tone: 'success' | 'warn' | 'danger' | null;
};

type Overview = {
  title: string | null;
  subtitle: string | null;
  items: OverviewItem[];
};

const ARRAY_META_KEYS = [
  'signal_niveau',
  'niveau',
  'urgence',
  'type',
  'categorie',
  'date_evenement',
  'source',
  'siren',
];

function getPathValue(source: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return current;
}

function getFirstText(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function buildOverview(data: unknown): Overview | null {
  if (!isRecord(data)) return null;

  const primary = (['societe', 'entreprise', 'identification']
    .map((key) => data[key])
    .find((item) => isRecord(item)) as Record<string, unknown> | undefined) ?? data;

  const title = getFirstText(primary, ['nom', 'nom_entreprise']) ?? null;
  const siren = getFirstText(primary, ['siren']);
  const role = getFirstText(primary, ['role']);
  const subtitle = [siren ? `SIREN ${siren}` : null, role].filter(Boolean).join(' • ') || null;

  const items: OverviewItem[] = [];
  const statusPaths: Array<{ label: string; path: string[] }> = [
    { label: 'Sante', path: ['entreprise', 'sante'] },
    { label: 'Procedure', path: ['entreprise', 'procedure'] },
    { label: 'Procedure', path: ['societe', 'procedure_collective'] },
    { label: 'PPE', path: ['screening', 'ppe'] },
    { label: 'Sanctions EU', path: ['screening', 'sanctions_eu'] },
    { label: 'Sanctions OFAC', path: ['screening', 'sanctions_ofac'] },
    { label: 'Niveau LCB', path: ['score_lcb', 'niveau'] },
  ];

  for (const target of statusPaths) {
    if (items.some((item) => item.label === target.label)) continue;
    const value = getPathValue(data, target.path);
    if (!isPrimitive(value) || value === null) continue;
    const text = formatPrimitive(value);
    items.push({
      label: target.label,
      value: text,
      tone: typeof value === 'string' ? getTone(value) : null,
    });
  }

  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value) || items.length >= 8) continue;
    items.push({
      label: toLabel(key),
      value: `${value.length}`,
      tone: null,
    });
  }

  return { title, subtitle, items };
}

function ResultOverview({ data }: { data: unknown }) {
  const overview = buildOverview(data);
  if (!overview || (!overview.title && overview.items.length === 0)) return null;

  return (
    <section className="result-overview">
      <div className="result-overview-main">
        {overview.title && <h4>{overview.title}</h4>}
        {overview.subtitle && <p>{overview.subtitle}</p>}
      </div>
      {overview.items.length > 0 && (
        <div className="result-overview-list">
          {overview.items.map((item, index) => (
            <span key={`${item.label}-${index}`} className={item.tone ? `overview-chip overview-chip-${item.tone}` : 'overview-chip'}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function splitCardRecord(record: Record<string, unknown>) {
  const meta: Array<{ key: string; value: string | number | boolean | null; tone: 'success' | 'warn' | 'danger' | null }> = [];
  const rest: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (
      meta.length < 4 &&
      ARRAY_META_KEYS.includes(key) &&
      isPrimitive(value)
    ) {
      meta.push({
        key,
        value,
        tone: typeof value === 'string' ? getTone(value) : null,
      });
      continue;
    }
    rest[key] = value;
  }

  return { meta, rest };
}

function getDominantTone(meta: Array<{ tone: 'success' | 'warn' | 'danger' | null }>): 'success' | 'warn' | 'danger' | null {
  if (meta.some((entry) => entry.tone === 'danger')) return 'danger';
  if (meta.some((entry) => entry.tone === 'warn')) return 'warn';
  if (meta.some((entry) => entry.tone === 'success')) return 'success';
  return null;
}

function PrimitiveValue({ value }: { value: string | number | boolean | null }) {
  const text = formatPrimitive(value);
  const tone = typeof value === 'string' ? getTone(value) : null;

  if (!tone) return <span className="kv-value">{text}</span>;
  return <span className={`kv-value kv-value-${tone}`}>{text}</span>;
}

function ResultValue({ value, level = 0 }: { value: unknown; level?: number }): ReactNode {
  if (isPrimitive(value)) return <PrimitiveValue value={value} />;
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="empty-note">Aucune donnee.</p>;

    const onlyPrimitives = value.every((item) => isPrimitive(item));
    if (onlyPrimitives) {
      return (
        <ul className="value-list">
          {value.map((item, idx) => (
            <li key={idx}>
              <PrimitiveValue value={item as string | number | boolean | null} />
            </li>
          ))}
        </ul>
      );
    }

    const onlyObjects = value.every((item) => isRecord(item));
    if (onlyObjects) {
      return (
        <div className="result-array-grid">
          {value.map((item, idx) => {
            const record = item as Record<string, unknown>;
            const { meta, rest } = splitCardRecord(record);
            const cardValue = Object.keys(rest).length > 0 ? rest : record;
            const dominantTone = getDominantTone(meta);
            return (
              <article
                key={idx}
                className={dominantTone ? `array-card array-card-${dominantTone}` : 'array-card'}
              >
                <div className="array-card-head">
                  <p className="array-title">{resolveCardTitle(record, idx)}</p>
                  {meta.length > 0 && (
                    <div className="array-meta">
                      {meta.map((entry) => (
                        <span
                          key={entry.key}
                          className={entry.tone ? `array-meta-chip array-meta-chip-${entry.tone}` : 'array-meta-chip'}
                        >
                          <strong>{toLabel(entry.key)}</strong>
                          <span>{formatPrimitive(entry.value)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ResultValue value={cardValue} level={level + 1} />
              </article>
            );
          })}
        </div>
      );
    }

    return (
      <div className="mixed-list">
        {value.map((item, idx) => (
          <div key={idx} className="mixed-item">
            <ResultValue value={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);
    const primitiveEntries = entries.filter(([, current]) => isPrimitive(current));
    const complexEntries = entries.filter(([, current]) => !isPrimitive(current));

    return (
      <div className={level === 0 ? 'result-object' : 'result-object result-object-nested'}>
        {primitiveEntries.length > 0 && (
          <div className="kv-grid">
            {primitiveEntries.map(([key, current]) => {
              const textBlock =
                typeof current === 'string' && (current.length > 110 || current.includes('\n'));
              return (
                <div key={key} className={textBlock ? 'kv-item kv-item-text' : 'kv-item'}>
                  <span className="kv-key">{toLabel(key)}</span>
                  <div className="kv-content">
                    <ResultValue value={current} level={level + 1} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {complexEntries.length > 0 && (
          <div className="result-subsections">
            {complexEntries.map(([key, current]) => (
              <section key={key} className="result-subsection">
                <h4>{Array.isArray(current) ? `${toLabel(key)} (${current.length})` : toLabel(key)}</h4>
                <ResultValue value={current} level={level + 1} />
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span className="kv-value">{String(value)}</span>;
}

export function ResultBlock<T>({
  title,
  state,
  className,
  eyebrow,
}: {
  title: string;
  state: RequestState<T>;
  className?: string;
  eyebrow?: string;
}) {
  if (state.loading) return <p className="state state-loading">Chargement...</p>;
  if (state.error) return <p className="state state-error">{state.error}</p>;
  if (!state.data) return null;

  return (
    <section className={className ? `result-block ${className}` : 'result-block'}>
      <div className="result-head">
        {eyebrow && <span className="result-eyebrow">{eyebrow}</span>}
        <h3>{title}</h3>
      </div>
      <div className="result-readable">
        <ResultOverview data={state.data} />
        <ResultValue value={state.data} />
      </div>
    </section>
  );
}
