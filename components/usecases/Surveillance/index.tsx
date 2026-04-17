// charlie-live/components/usecases/Surveillance/index.tsx
'use client';

import { useState } from 'react';
import { SearchInput } from '../DueDiligence/SearchInput';
import { DataTag } from '../../ui/DataTag';
import { SourceBadge } from '../../ui/SourceBadge';
import { StreamingText } from '../../ui/StreamingText';
import type { CompanySearchResult, SurveillanceResult, SurveillanceConfig } from '../../../types';

const PROFILS = ['Conservateur', 'Équilibré', 'Dynamique', 'Entrepreneur'] as const;
type Profil = typeof PROFILS[number];
const OBJECTIFS = ['Transmission', 'Optimisation fiscale', 'Diversification', 'Liquidité', 'Retraite'];

export function Surveillance() {
  const [selected, setSelected] = useState<CompanySearchResult | null>(null);
  const [config, setConfig] = useState<Partial<SurveillanceConfig>>({
    profil_risque: 'Équilibré',
    part_patrimoine: '40%',
    objectifs: [],
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SurveillanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleObjectif = (obj: string) => {
    setConfig((c) => ({
      ...c,
      objectifs: c.objectifs?.includes(obj)
        ? c.objectifs.filter((o) => o !== obj)
        : [...(c.objectifs ?? []), obj],
    }));
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/surveillance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siren: selected.siren, config }),
      });
      const data = await res.json() as SurveillanceResult & { error?: string };
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Veille Continue</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Alertes personnalisées contextualisées au profil risque et aux objectifs de votre client
        </p>
      </div>

      <SearchInput onSelect={setSelected} disabled={loading} />

      {/* Config client */}
      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col gap-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Profil client</h3>

        <div className="flex gap-3 flex-wrap">
          {PROFILS.map((p) => (
            <button
              key={p}
              onClick={() => setConfig((c) => ({ ...c, profil_risque: p as Profil }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                config.profil_risque === p
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <label className="text-xs text-[var(--text-muted)] whitespace-nowrap">Part patrimoine</label>
          <input
            type="text"
            value={config.part_patrimoine ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, part_patrimoine: e.target.value }))}
            placeholder="ex: 40%"
            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2
              text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          <label className="text-xs text-[var(--text-muted)] whitespace-nowrap">Valeur estimée</label>
          <input
            type="text"
            value={config.valeur_participation ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, valeur_participation: e.target.value }))}
            placeholder="ex: 2,5 M€"
            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2
              text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">Objectifs patrimoniaux</p>
          <div className="flex gap-2 flex-wrap">
            {OBJECTIFS.map((obj) => (
              <button
                key={obj}
                onClick={() => toggleObjectif(obj)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors border ${
                  config.objectifs?.includes(obj)
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {obj}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || !selected}
        className="self-start px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50
          text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Surveillance en cours…
          </>
        ) : 'Lancer la surveillance'}
      </button>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {result && <SurveillanceReport result={result} />}
    </div>
  );
}

function SurveillanceReport({ result }: { result: SurveillanceResult }) {
  const { entreprise, score_vigilance, alertes, brief_rdv } = result;

  const santeColor =
    entreprise?.sante === 'SAINE'
      ? 'text-emerald-400'
      : entreprise?.sante === 'VIGILANCE'
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className="flex flex-col gap-5 animate-[fadeIn_0.4s_ease]">
      {/* Entreprise */}
      {entreprise && (
        <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Entreprise
            </h3>
            <span className={`text-sm font-semibold ${santeColor}`}>{entreprise.sante}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <DataTag label="Nom" value={entreprise.nom} />
            <DataTag label="SIREN" value={entreprise.siren} mono />
            <DataTag label="CA" value={entreprise.ca} highlight />
            <DataTag label="EBITDA" value={entreprise.ebitda} highlight />
            <DataTag label="Capitaux propres" value={entreprise.capitaux_propres} />
            <DataTag label="Procédure" value={entreprise.procedure} />
          </div>
        </section>
      )}

      {/* Score vigilance */}
      {score_vigilance && (
        <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Score de vigilance
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-3">
            {[
              { label: 'Global', value: score_vigilance.global },
              { label: 'Financier', value: score_vigilance.financier },
              { label: 'Entreprise', value: score_vigilance.entreprise },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold font-mono text-[var(--accent)]">
                  {typeof value === 'number' ? value.toFixed(1) : value}
                </div>
                <div className="text-xs text-[var(--text-muted)]">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{score_vigilance.commentaire}</p>
        </section>
      )}

      {/* Alertes */}
      {alertes?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Alertes personnalisées
          </h3>
          <div className="flex flex-col gap-3">
            {alertes.map((alerte, i) => {
              const borderColor =
                alerte.niveau === 'critique'
                  ? 'border-red-500/40 bg-red-500/5'
                  : alerte.niveau === 'attention'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)]';

              return (
                <div key={i} className={`rounded-xl border p-4 ${borderColor}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{alerte.titre}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      alerte.niveau === 'critique'
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : alerte.niveau === 'attention'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30'
                    }`}>
                      {alerte.niveau}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{alerte.description_personnalisee}</p>
                  {alerte.action_suggeree && (
                    <p className="text-xs text-[var(--accent)] font-medium">→ {alerte.action_suggeree}</p>
                  )}
                  {alerte.source && (
                    <div className="mt-2">
                      <SourceBadge source={alerte.source} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Brief RDV */}
      {brief_rdv && (
        <section className="bg-[var(--accent-pale)] border border-[var(--accent)]/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
            Brief RDV personnalisé
          </h3>
          <StreamingText
            text={brief_rdv}
            className="text-sm text-[var(--text-primary)] leading-relaxed"
          />
        </section>
      )}
    </div>
  );
}
