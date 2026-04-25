'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { fetchJsonOrThrow } from '@/hooks/use-api-request';
import type { ActionRDV, CompanySearchResult, DueDiligenceResult, Signal } from '@/types';

type RiskTone = 'critical' | 'warning' | 'positive' | 'neutral';

type StrongSignal = {
  tone: RiskTone;
  title: string;
  detail: string;
};

type TimelineEvent = {
  year: number | null;
  tone: RiskTone;
  title: string;
  detail: string;
};

type Metric = {
  label: string;
  value: string;
};

type AnalysisDigest = {
  headline: string;
  points: string[];
};

type TimelineGroup = {
  yearLabel: string;
  items: TimelineEvent[];
};

type StructureEntry = {
  main: string;
  meta: string | null;
};

type SignalDigest = {
  headline: string;
  bullets: string[];
};

type QuickRead = {
  label: string;
  value: string;
  tone: RiskTone;
};

type SearchHeroProps = {
  isLanding: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  context: string;
  onContextChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  results: CompanySearchResult[];
  open: boolean;
  activeIndex: number;
  onActiveIndexChange: (value: number) => void;
  onCloseResults: () => void;
  onSelectResult: (value: CompanySearchResult) => void;
  onFocusInput: () => void;
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\u0300-\u036f]/g, '');
}

function getSignalTone(level: string): RiskTone {
  const key = normalize(level);
  if (key === 'critique' || key === 'alerte' || key === 'eleve') return 'critical';
  if (key === 'attention' || key === 'vigilance' || key === 'moyen') return 'warning';
  if (key === 'opportunite' || key === 'ras' || key === 'faible') return 'positive';
  return 'neutral';
}

function toneLabel(tone: RiskTone): string {
  if (tone === 'critical') return 'Critique';
  if (tone === 'warning') return 'Vigilance';
  if (tone === 'positive') return 'Sain';
  return 'Info';
}

function scoreFromTone(tone: RiskTone): number {
  if (tone === 'critical') return 3;
  if (tone === 'warning') return 2;
  if (tone === 'positive') return 1;
  return 0;
}

function extractYear(text: string): number | null {
  const currentYear = new Date().getFullYear();
  const maxPlausibleYear = currentYear + 1;
  const allYears = Array.from(text.matchAll(/\b(19|20)\d{2}\b/g))
    .map((match) => ({ value: Number(match[0]), index: match.index ?? 0 }))
    .filter((entry) => entry.value >= 1900 && entry.value <= maxPlausibleYear);

  if (allYears.length === 0) return null;

  const ignoredContexts = ['liasse', 'imprime', 'imprimé', 'cerfa', 'formulaire', 'article'];
  const plausible = allYears.filter((entry) => {
    const start = Math.max(0, entry.index - 18);
    const end = Math.min(text.length, entry.index + 18);
    const around = text
      .slice(start, end)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return !ignoredContexts.some((keyword) => around.includes(keyword));
  });

  const selected = (plausible.length > 0 ? plausible : allYears)[0];
  return selected?.value ?? null;
}

function highestTone(signals: StrongSignal[]): RiskTone {
  if (signals.some((item) => item.tone === 'critical')) return 'critical';
  if (signals.some((item) => item.tone === 'warning')) return 'warning';
  if (signals.some((item) => item.tone === 'positive')) return 'positive';
  return 'neutral';
}

function toStatus(result: DueDiligenceResult): { label: string; tone: RiskTone } {
  const procedure = normalize(result.societe.procedure_collective ?? '');
  const maxSignal = highestTone(
    result.signaux.map((signal) => ({
      tone: getSignalTone(signal.niveau),
      title: signal.titre,
      detail: signal.description,
    }))
  );

  if (procedure === 'en cours' || maxSignal === 'critical') {
    return { label: 'Signal critique', tone: 'critical' };
  }

  if (procedure === 'historique' || maxSignal === 'warning') {
    return { label: 'Sous vigilance', tone: 'warning' };
  }

  return { label: 'Actif', tone: 'positive' };
}

function getQuickReads(result: DueDiligenceResult): QuickRead[] {
  const status = toStatus(result);
  const warningCount = result.signaux.filter((signal) => getSignalTone(signal.niveau) === 'warning').length;
  const criticalCount = result.signaux.filter((signal) => getSignalTone(signal.niveau) === 'critical').length;
  const hasRecentMove = result.actions.some((action) => extractYear(`${action.timing} ${action.rationnel}`) !== null);

  return [
    {
      label: 'Risque',
      value: status.tone === 'critical' ? 'Eleve' : status.tone === 'warning' ? 'Modere' : 'Faible',
      tone: status.tone,
    },
    {
      label: 'Opportunite',
      value: criticalCount > 0 ? 'A cadrer' : warningCount > 0 ? 'A explorer' : 'Stable',
      tone: criticalCount > 0 ? 'warning' : 'positive',
    },
    {
      label: 'Mouvement recent',
      value: hasRecentMove ? 'Oui' : 'Non',
      tone: hasRecentMove ? 'warning' : 'positive',
    },
  ];
}

function buildSummary(result: DueDiligenceResult): string {
  const critical = result.signaux.filter((signal) => getSignalTone(signal.niveau) === 'critical').length;
  const warning = result.signaux.filter((signal) => getSignalTone(signal.niveau) === 'warning').length;

  if (critical > 0) {
    return `${critical} signal${critical > 1 ? 'x' : ''} critique${critical > 1 ? 's' : ''} detecte${critical > 1 ? 's' : ''} - revue immediate recommandee.`;
  }

  if (warning > 0) {
    return `Activite globalement stable avec ${warning} point${warning > 1 ? 's' : ''} de vigilance recent${warning > 1 ? 's' : ''}.`;
  }

  return 'Societe active - aucun signal critique detecte.';
}

function dedupeSignals(signals: StrongSignal[]): StrongSignal[] {
  const unique = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.title}|${signal.detail}`;
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  });
}

function getStrongSignals(result: DueDiligenceResult): StrongSignal[] {
  const signals: StrongSignal[] = result.signaux.map((signal: Signal) => ({
    tone: getSignalTone(signal.niveau),
    title: signal.titre,
    detail: signal.description,
  }));

  const procedure = result.societe.procedure_collective;
  if (procedure === 'En cours') {
    signals.unshift({
      tone: 'critical',
      title: 'Procedure collective en cours',
      detail: 'Impact potentiel sur la stabilite financiere et la capacite de projection.',
    });
  }

  if (procedure === 'Historique') {
    signals.unshift({
      tone: 'warning',
      title: 'Historique de procedure collective',
      detail: 'Un precedent existe, a remettre dans le contexte de la dynamique recente.',
    });
  }

  if (signals.length === 0) {
    signals.push({
      tone: 'positive',
      title: 'Aucun signal critique',
      detail: 'Aucune alerte majeure detectee dans les donnees publiques consolidees.',
    });
  }

  return dedupeSignals(signals).sort((a, b) => scoreFromTone(b.tone) - scoreFromTone(a.tone)).slice(0, 6);
}

function actionToTimeline(action: ActionRDV): TimelineEvent {
  const year = extractYear(`${action.action} ${action.timing} ${action.rationnel}`);
  return {
    year,
    tone: action.priorite <= 1 ? 'critical' : action.priorite === 2 ? 'warning' : 'neutral',
    title: action.action,
    detail: action.timing,
  };
}

function getTimeline(result: DueDiligenceResult): TimelineEvent[] {
  const signalEvents: TimelineEvent[] = result.signaux.map((signal) => ({
    year: extractYear(`${signal.titre} ${signal.description}`),
    tone: getSignalTone(signal.niveau),
    title: signal.titre,
    detail: signal.description,
  }));

  const actionEvents = result.actions.map(actionToTimeline);
  const creationYear = extractYear(result.societe.creation);

  const timeline = [...signalEvents, ...actionEvents];

  if (creationYear) {
    timeline.push({
      year: creationYear,
      tone: 'neutral',
      title: 'Creation de la structure',
      detail: result.societe.creation,
    });
  }

  if (timeline.length === 0) {
    timeline.push({
      year: null,
      tone: 'neutral',
      title: 'Aucun evenement date disponible',
      detail: 'Les signaux restent consultables dans le bloc Signes forts.',
    });
  }

  return timeline
    .sort((a, b) => {
      if (a.year === null && b.year === null) return 0;
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      return b.year - a.year;
    })
    .slice(0, 8);
}

function toMetrics(result: DueDiligenceResult): Metric[] {
  const societe = result.societe;
  return [
    { label: 'CA', value: societe.ca || 'N/D' },
    { label: 'Resultat', value: societe.ebitda || 'N/D' },
    { label: 'Capitaux propres', value: societe.capitaux_propres || 'N/D' },
    { label: 'Effectifs', value: societe.salaries || 'N/D' },
    { label: 'Forme juridique', value: societe.forme || 'N/D' },
    { label: 'Creation', value: societe.creation || 'N/D' },
  ];
}

function digestAnalysis(analysis: string): AnalysisDigest {
  const cleaned = analysis.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return {
      headline: 'Aucun commentaire strategique disponible.',
      points: [],
    };
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    headline: sentences[0] ?? cleaned,
    points: (sentences.length > 1 ? sentences.slice(1) : sentences).slice(0, 5),
  };
}

function splitActionText(text: string): string[] {
  return text
    .split(/,\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function compactText(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}...`;
}

function toTimelineGroups(events: TimelineEvent[]): TimelineGroup[] {
  const bucket = new Map<string, TimelineEvent[]>();

  events.forEach((event) => {
    const label = event.year ? String(event.year) : 'Non date';
    const current = bucket.get(label) ?? [];
    current.push(event);
    bucket.set(label, current);
  });

  return Array.from(bucket.entries())
    .map(([yearLabel, items]) => ({ yearLabel, items: items.slice(0, 3) }))
    .sort((a, b) => {
      const left = Number(a.yearLabel);
      const right = Number(b.yearLabel);
      if (Number.isNaN(left) && Number.isNaN(right)) return 0;
      if (Number.isNaN(left)) return 1;
      if (Number.isNaN(right)) return -1;
      return right - left;
    })
    .slice(0, 5);
}

function parseStructureEntry(line: string): StructureEntry {
  const cleaned = line.replace(/\s+/g, ' ').trim();
  const splitByLongDash = cleaned.split('—').map((part) => part.trim());
  if (splitByLongDash.length > 1) {
    return { main: splitByLongDash[0], meta: splitByLongDash.slice(1).join(' — ') };
  }

  const splitByDash = cleaned.split(' - ').map((part) => part.trim());
  if (splitByDash.length > 1) {
    return { main: splitByDash[0], meta: splitByDash.slice(1).join(' - ') };
  }

  return { main: cleaned, meta: null };
}

function digestSignalDetail(detail: string): SignalDigest {
  const cleaned = detail.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return {
      headline: 'Signal a approfondir',
      bullets: [],
    };
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const headline = compactText(sentences[0] ?? cleaned, 120);
  const bullets = (sentences.length > 1 ? sentences.slice(1) : []).map((item) => compactText(item, 120)).slice(0, 3);

  return { headline, bullets };
}

function SearchHero({
  isLanding,
  query,
  onQueryChange,
  context,
  onContextChange,
  onSubmit,
  loading,
  results,
  open,
  activeIndex,
  onActiveIndexChange,
  onCloseResults,
  onSelectResult,
  onFocusInput,
}: SearchHeroProps) {
  return (
    <section className={isLanding ? 'charlie-hero charlie-hero-landing-clean' : 'charlie-hero'} aria-label="Recherche Charlie">
      {isLanding ? (
        <>
          <div className="landing-center">
            <div className="landing-logo" aria-hidden="true">
              <Image
                src="/brand/charlie-favicon-no-background.png"
                alt=""
                width={58}
                height={58}
                className="charlie-mark-image"
                priority
              />
            </div>
            <h1>CHARLIE Client</h1>
            <p className="charlie-hero-subtitle">Comprenez en 10 secondes. Décidez en confiance.</p>
            <p className="landing-subline">Saisissez un nom ou une societe, Charlie structure la lecture client.</p>
          </div>
        </>
      ) : (
        <div className="charlie-brand-row">
          <div className="charlie-mark" aria-hidden="true">
            <Image
              src="/brand/charlie-favicon-no-background.png"
              alt=""
              width={40}
              height={40}
              className="charlie-mark-image"
              priority
            />
          </div>
          <div>
            <p className="charlie-kicker">CHARLIE Client</p>
          </div>
        </div>
      )}

      <div className={isLanding ? 'hero-search-wrap hero-search-wrap-landing' : 'hero-search-wrap'}>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={onFocusInput}
          placeholder={isLanding ? 'Ex : SCI familiale, dirigeant en changement, risque à surveiller...' : "Nom d'une societe ou d'une personne"}
          className="hero-search-input"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onCloseResults();
              return;
            }
            if (event.key === 'ArrowDown' && results.length > 0) {
              event.preventDefault();
              onActiveIndexChange(activeIndex < results.length - 1 ? activeIndex + 1 : 0);
              return;
            }
            if (event.key === 'ArrowUp' && results.length > 0) {
              event.preventDefault();
              onActiveIndexChange(activeIndex > 0 ? activeIndex - 1 : results.length - 1);
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              if (open && activeIndex >= 0 && results[activeIndex]) {
                onSelectResult(results[activeIndex]);
                return;
              }
              onSubmit();
            }
          }}
          disabled={loading}
          aria-label="Recherche entreprise ou personne"
        />
        <button type="button" className={isLanding ? 'hero-search-button hero-search-button-landing' : 'hero-search-button'} onClick={onSubmit} disabled={loading || query.trim().length < 3}>
          {loading ? 'Analyse...' : 'Analyser'}
        </button>

        {open && results.length > 0 && (
          <div className="hero-search-results" role="listbox" aria-label="Suggestions">
            {results.map((item, index) => (
              <button
                key={item.siren}
                type="button"
                className={index === activeIndex ? 'hero-search-item hero-search-item-active' : 'hero-search-item'}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                }}
                onMouseEnter={() => onActiveIndexChange(index)}
                onClick={() => onSelectResult(item)}
              >
                <strong>{item.nom}</strong>
                <span>{item.siren}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isLanding && (
        <textarea
          value={context}
          onChange={(event) => onContextChange(event.target.value)}
          className="hero-context"
          placeholder="Contexte conseiller (optionnel) : objectif du rdv, sensibilites, points de vigilance..."
          rows={2}
        />
      )}

    </section>
  );
}

function EntityHeader({ result }: { result: DueDiligenceResult }) {
  const status = toStatus(result);
  const summary = buildSummary(result);
  const quickReads = getQuickReads(result);

  return (
    <section className="entity-header reveal" aria-label="Identite">
      <div>
        <p className="entity-eyebrow">Identite</p>
        <h2>{result.societe.nom}</h2>
        <p className="entity-subtitle">Entreprise - SIREN {result.societe.siren}</p>
        <p className="entity-summary">{summary}</p>
        <div className="quick-read-list" aria-label="Lecture en 3 secondes">
          {quickReads.map((item) => (
            <span key={item.label} className={`quick-read quick-read-${item.tone}`}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </span>
          ))}
        </div>
      </div>
      <span className={`status-pill status-pill-${status.tone}`}>{status.label}</span>
    </section>
  );
}

function SignalBadges({ result }: { result: DueDiligenceResult }) {
  const signals = useMemo(() => getStrongSignals(result), [result]);

  return (
    <section className="block reveal" aria-label="Signaux forts">
      <header className="block-header">
        <h3>Signaux forts</h3>
        <p>Lecture immediate des mouvements critiques.</p>
      </header>
      <div className="signal-grid">
        {signals.map((signal, index) => {
          const digest = digestSignalDetail(signal.detail);
          return (
            <article key={`${signal.title}-${index}`} className={`signal-card signal-card-${signal.tone}`}>
              <div className="signal-card-head">
                <span className={`signal-badge signal-badge-${signal.tone}`}>{toneLabel(signal.tone)}</span>
                <h4>{signal.title}</h4>
              </div>
              <p className="signal-headline">{digest.headline}</p>
              {digest.bullets.length > 0 && (
                <ul className="signal-bullets">
                  {digest.bullets.map((item, bulletIndex) => (
                    <li key={`${item}-${bulletIndex}`}>{item}</li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InsightCards({ result }: { result: DueDiligenceResult }) {
  const digest = useMemo(() => digestAnalysis(result.analyse), [result.analyse]);

  return (
    <section className="block reveal" aria-label="Insights Charlie">
      <header className="block-header">
        <h3>Insights Charlie</h3>
        <p>Synthese orientee rendez-vous.</p>
      </header>
      <div className="insight-layout">
        <article className="insight-card insight-card-main">
          <span className="insight-label">En 10 secondes</span>
          <h4>{digest.headline}</h4>
          {digest.points.length > 0 && (
            <ul className="insight-points">
              {digest.points.map((point, index) => (
                <li key={`${point}-${index}`}>{point}</li>
              ))}
            </ul>
          )}
        </article>

        <div className="insight-actions-stack">
          {result.actions.slice(0, 3).map((action, index) => (
            <article key={`${action.action}-${index}`} className="insight-card insight-card-action">
              <span className="insight-priority">Priorite {action.priorite}</span>
              <h4>{action.action}</h4>
              <ul className="action-breakdown">
                {splitActionText(action.rationnel).map((part, partIndex) => (
                  <li key={`${part}-${partIndex}`}>{part}</li>
                ))}
              </ul>
              <small>{action.timing}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Timeline({ result }: { result: DueDiligenceResult }) {
  const events = useMemo(() => getTimeline(result), [result]);
  const groups = useMemo(() => toTimelineGroups(events), [events]);

  return (
    <section className="block reveal" aria-label="Timeline">
      <header className="block-header">
        <h3>Timeline intelligente</h3>
        <p>Lecture chronologique simplifiee, annee par annee.</p>
      </header>
      <div className="timeline-groups">
        {groups.map((group) => (
          <article key={group.yearLabel} className="timeline-group-card">
            <div className="timeline-group-head">
              <span className="timeline-group-year">{group.yearLabel}</span>
              <span className="timeline-group-count">
                {group.items.length} evenement{group.items.length > 1 ? 's' : ''}
              </span>
            </div>
            <ol className="timeline-list">
              {group.items.map((event, index) => (
                <li key={`${group.yearLabel}-${event.title}-${index}`} className="timeline-item">
                  <div className={`timeline-dot timeline-dot-${event.tone}`} aria-hidden="true" />
                  <div>
                    <h4>{event.title}</h4>
                    <p>{compactText(event.detail)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

function StructureView({ result }: { result: DueDiligenceResult }) {
  const stakeholders = useMemo(
    () => result.actionnariat.slice(0, 6).map(parseStructureEntry),
    [result.actionnariat]
  );
  const subsidiaries = useMemo(
    () => result.filiales.slice(0, 6).map(parseStructureEntry),
    [result.filiales]
  );

  return (
    <section className="block reveal" aria-label="Structure societale">
      <header className="block-header">
        <h3>Structure societale</h3>
        <p>Qui detient quoi, et quels liens societaires sont identifies.</p>
      </header>

      <div className="structure-summary">
        <span className="structure-chip">Actionnaires: {result.actionnariat.length || 0}</span>
        <span className="structure-chip">Filiales / liens: {result.filiales.length || 0}</span>
      </div>

      <div className="structure-grid">
        <article className="structure-card">
          <h4>Actionnariat</h4>
          <ul className="structure-list-clean">
            {stakeholders.length > 0 ? (
              stakeholders.map((entry, index) => (
                <li key={`${entry.main}-${index}`}>
                  <p>{entry.main}</p>
                  {entry.meta && <small>{entry.meta}</small>}
                </li>
              ))
            ) : (
              <li className="structure-empty">Information non disponible</li>
            )}
          </ul>
        </article>
        <article className="structure-card">
          <h4>Liens societes / filiales</h4>
          <ul className="structure-list-clean">
            {subsidiaries.length > 0 ? (
              subsidiaries.map((entry, index) => (
                <li key={`${entry.main}-${index}`}>
                  <p>{entry.main}</p>
                  {entry.meta && <small>{entry.meta}</small>}
                </li>
              ))
            ) : (
              <li className="structure-empty">Aucune filiale remontee</li>
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}

function KeyMetrics({ result }: { result: DueDiligenceResult }) {
  const metrics = useMemo(() => toMetrics(result), [result]);

  return (
    <section className="block reveal" aria-label="Donnees cles">
      <header className="block-header">
        <h3>Donnees cles</h3>
      </header>
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function SourceFooter() {
  return (
    <footer className="source-footer">
      <span>Sources: Pappers, DataGouv, BODACC</span>
      <span>Charlie consolide et priorise les signaux pour preparation RDV.</span>
    </footer>
  );
}

function LoadingSkeleton() {
  return (
    <div className="skeleton-wrap" aria-hidden="true">
      <div className="skeleton skeleton-header" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton skeleton-wide" />
      <div className="skeleton skeleton-wide" />
    </div>
  );
}

export function CharlieDatabaseExperience() {
  const [query, setQuery] = useState('');
  const [context, setContext] = useState('');
  const [selected, setSelected] = useState<CompanySearchResult | null>(null);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DueDiligenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 3) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      if (selected && normalize(selected.nom) !== normalize(trimmed)) {
        setSelected(null);
      }
      return;
    }

    // Si la valeur affichée correspond exactement à une sélection validée,
    // on n'affiche plus l'autocomplete tant que l'utilisateur ne modifie pas le texte.
    if (selected && normalize(selected.nom) === normalize(trimmed)) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetchJsonOrThrow<{ results: CompanySearchResult[] }>(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        setResults(response.results ?? []);
        setOpen(true);
        setActiveIndex(response.results.length > 0 ? 0 : -1);
      } catch {
        setResults([]);
        setOpen(false);
        setActiveIndex(-1);
      }
    }, 240);

    if (selected && normalize(selected.nom) !== normalize(trimmed)) {
      setSelected(null);
    }

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  const submit = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setError('Saisissez au moins 3 caracteres.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setError(null);
    setOpen(false);
    setActiveIndex(-1);

    try {
      let company = selected;

      if (!company) {
        const search = await fetchJsonOrThrow<{ results: CompanySearchResult[] }>(`/api/search?q=${encodeURIComponent(trimmed)}`);
        company = search.results[0] ?? null;
      }

      if (!company) {
        throw new Error('Aucune entreprise correspondante. Essayez un nom legal de societe ou un SIREN.');
      }

      setSelected(company);
      setQuery(company.nom);

      const payload = {
        siren: company.siren,
        context: context.trim() || undefined,
      };

      const response = await fetchJsonOrThrow<DueDiligenceResult>('/api/due-diligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={!hasSearched ? 'charlie-app charlie-app-landing' : 'charlie-app'}>
      <SearchHero
        isLanding={!hasSearched}
        query={query}
        onQueryChange={setQuery}
        context={context}
        onContextChange={setContext}
        onSubmit={submit}
        loading={loading}
        results={results}
        open={open}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onCloseResults={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
        onSelectResult={(item) => {
          setSelected(item);
          setQuery(item.nom);
          setOpen(false);
          setActiveIndex(-1);
        }}
        onFocusInput={() => {
          if (results.length > 0) {
            setOpen(true);
            setActiveIndex((current) => (current >= 0 ? current : 0));
          }
        }}
      />

      {error && <p className="request-error">{error}</p>}
      {loading && result && <p className="request-loading-inline">Mise a jour de l&apos;analyse en cours...</p>}
      {loading && !result && <LoadingSkeleton />}

      {result && (
        <main className="charlie-main">
          <EntityHeader result={result} />
          <SignalBadges result={result} />
          <Timeline result={result} />
          <StructureView result={result} />
          <KeyMetrics result={result} />
          <InsightCards result={result} />
          <SourceFooter />
        </main>
      )}
    </div>
  );
}
