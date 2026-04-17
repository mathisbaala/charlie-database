// charlie-live/components/usecases/BriefRDV/index.tsx
'use client';

import { useState } from 'react';
import { SearchInput } from '../DueDiligence/SearchInput';
import { DataTag } from '../../ui/DataTag';
import { SourceBadge } from '../../ui/SourceBadge';
import { StreamingText } from '../../ui/StreamingText';
import type { CompanySearchResult, BriefRDVResult, BriefRDVPoint } from '../../../types';

const LOADING_STEPS = [
  'Extraction données RNE…',
  'Récupération annonces BODACC…',
  'Préparation du brief RDV…',
];

const CATEGORIE_CONFIG: Record<BriefRDVPoint['categorie'], { label: string; color: string; bg: string }> = {
  evenement: { label: 'Événement', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  opportunite: { label: 'Opportunité', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  risque: { label: 'Risque', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  sujet: { label: 'Sujet', color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10 border-[var(--accent)]/30' },
};

const URGENCE_DOT: Record<BriefRDVPoint['urgence'], string> = {
  haute: 'bg-red-400',
  normale: 'bg-amber-400',
  faible: 'bg-zinc-500',
};

export function BriefRDV() {
  const [selected, setSelected] = useState<CompanySearchResult | null>(null);
  const [contexte, setContexte] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<BriefRDVResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setLoadingStep(0);

    const stepTimer = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1600);

    try {
      const res = await fetch('/api/brief-rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siren: selected.siren, contexte_rdv: contexte || undefined }),
      });
      const data = await res.json() as BriefRDVResult & { error?: string };
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Brief RDV</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Préparez votre rendez-vous client en 20 secondes — ce qui a changé, les sujets à aborder, les questions à poser
        </p>
      </div>

      {/* Search */}
      <SearchInput onSelect={setSelected} disabled={loading} />

      {/* Context + action */}
      {selected && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)]">
            <svg className="w-4 h-4 text-[var(--accent)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-sm font-medium text-[var(--text-primary)]">{selected.nom}</span>
            <span className="ml-auto text-xs font-mono text-[var(--text-muted)]">{selected.siren}</span>
          </div>
          <textarea
            value={contexte}
            onChange={(e) => setContexte(e.target.value)}
            placeholder="Contexte du RDV (facultatif) : objectif de la rencontre, sujets à éviter, dernière interaction…"
            rows={2}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3
              text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
              focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="self-end px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50
              text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Préparation…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Préparer le brief
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3 py-4">
          {LOADING_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                i < loadingStep ? 'bg-emerald-500' : i === loadingStep ? 'bg-[var(--accent)] animate-pulse' : 'bg-zinc-700'
              }`} />
              <span className={`text-sm ${i === loadingStep ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && <BriefRDVReport result={result} />}
    </div>
  );
}

function BriefRDVReport({ result }: { result: BriefRDVResult }) {
  const { entreprise, depuis_dernier_rdv, sujets_a_aborder, questions_preparees, synthese } = result;

  const santeColor =
    entreprise?.sante === 'SAINE'
      ? 'text-emerald-400'
      : entreprise?.sante === 'VIGILANCE'
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease]">
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
            <DataTag label="Résultat net" value={entreprise.resultat_net} highlight />
            <DataTag label="Effectif" value={entreprise.effectif} />
          </div>
        </section>
      )}

      {/* Depuis le dernier RDV */}
      {depuis_dernier_rdv?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Depuis le dernier RDV
          </h3>
          <div className="flex flex-col gap-3">
            {depuis_dernier_rdv.map((point, i) => {
              const cfg = CATEGORIE_CONFIG[point.categorie] ?? CATEGORIE_CONFIG.sujet;
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${cfg.bg}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-mono uppercase tracking-wider ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${URGENCE_DOT[point.urgence] ?? 'bg-zinc-500'}`} />
                        <span className="text-xs text-[var(--text-muted)]">{point.urgence}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold mb-1 ${cfg.color}`}>{point.titre}</p>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{point.detail}</p>
                  {point.source && <SourceBadge source={point.source} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sujets à aborder */}
      {sujets_a_aborder?.length > 0 && (
        <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Sujets à aborder
          </h3>
          <ul className="flex flex-col gap-2">
            {sujets_a_aborder.map((sujet, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-[var(--text-primary)]">{sujet}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Questions préparées */}
      {questions_preparees?.length > 0 && (
        <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Questions à poser
          </h3>
          <ul className="flex flex-col gap-2">
            {questions_preparees.map((question, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[var(--accent)] text-sm font-bold flex-shrink-0">?</span>
                <span className="text-sm text-[var(--text-primary)] italic">{question}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Synthèse */}
      {synthese && (
        <section className="bg-[var(--accent-pale)] border border-[var(--accent)]/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
            Synthèse conseiller
          </h3>
          <StreamingText
            text={synthese}
            className="text-sm text-[var(--text-primary)] leading-relaxed"
          />
        </section>
      )}
    </div>
  );
}
