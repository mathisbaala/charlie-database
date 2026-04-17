// charlie-live/components/usecases/DueDiligence/index.tsx
'use client';

import { useState } from 'react';
import { SearchInput } from './SearchInput';
import { SignalBadge } from '../../ui/SignalBadge';
import { SourceBadge } from '../../ui/SourceBadge';
import { DataTag } from '../../ui/DataTag';
import { StreamingText } from '../../ui/StreamingText';
import type { CompanySearchResult, DueDiligenceResult } from '../../../types';

const LOADING_STEPS = [
  'Extraction données RNE…',
  'Récupération annonces BODACC…',
  'Analyse patrimoniale Claude…',
  'Génération du rapport…',
];

export function DueDiligence() {
  const [selected, setSelected] = useState<CompanySearchResult | null>(null);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<DueDiligenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setLoadingStep(0);

    // Simulate step progression
    const stepTimer = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1800);

    try {
      const res = await fetch('/api/due-diligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siren: selected.siren, context: context || undefined }),
      });
      const data = await res.json() as DueDiligenceResult & { error?: string };
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
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Intelligence Client</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Enrichissez automatiquement un profil client depuis le Registre National des Entreprises et BODACC
        </p>
      </div>

      {/* Search */}
      <SearchInput onSelect={setSelected} disabled={loading} />

      {/* Context */}
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
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Contexte additionnel (facultatif) : objectifs client, situation connue…"
            rows={3}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-3
              text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
              focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="self-end px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50
              text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Analyse en cours…' : 'Analyser'}
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
      {result && <DueDiligenceReport result={result} />}
    </div>
  );
}

function DueDiligenceReport({ result }: { result: DueDiligenceResult }) {
  const { societe, actionnariat, filiales, kyc, signaux, analyse, actions } = result;

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease]">
      {/* Société */}
      <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Entreprise
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DataTag label="Nom" value={societe.nom} />
          <DataTag label="Forme" value={societe.forme} />
          <DataTag label="SIREN" value={societe.siren} mono />
          <DataTag label="Création" value={societe.creation} />
          <DataTag label="Secteur" value={societe.secteur} />
          <DataTag label="Localisation" value={societe.localisation} />
          <DataTag label="Effectif" value={societe.salaries} />
          <DataTag label="CA" value={societe.ca} highlight />
          <DataTag label="EBITDA" value={societe.ebitda} highlight />
          <DataTag label="Capitaux propres" value={societe.capitaux_propres} />
          <DataTag label="Valeur estimée" value={societe.valeur_estimee} highlight />
          <DataTag label="Dividendes" value={societe.dividendes} />
        </div>
        {societe.procedure_collective !== 'Aucune' && (
          <div className="mt-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <span className="text-sm text-red-400 font-medium">
              Procédure collective : {societe.procedure_collective}
            </span>
          </div>
        )}
      </section>

      {/* Signaux */}
      {signaux?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Signaux patrimoniaux
          </h3>
          <div className="flex flex-col gap-3">
            {signaux.map((signal, i) => (
              <div
                key={i}
                className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SignalBadge niveau={signal.niveau} />
                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{signal.type}</span>
                  </div>
                  {signal.source && <SourceBadge source={signal.source} />}
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{signal.titre}</p>
                <p className="text-sm text-[var(--text-secondary)]">{signal.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Analyse */}
      {analyse && (
        <section className="bg-[var(--accent-pale)] border border-[var(--accent)]/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
            Analyse conseiller senior
          </h3>
          <StreamingText
            text={analyse}
            className="text-sm text-[var(--text-primary)] leading-relaxed"
          />
        </section>
      )}

      {/* Actions */}
      {actions?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Actions recommandées
          </h3>
          <div className="flex flex-col gap-2">
            {actions.map((action) => (
              <div
                key={action.priorite}
                className="flex gap-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-4"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[var(--accent)]">{action.priorite}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{action.action}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] flex-shrink-0">
                      {action.timing}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{action.rationnel}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* KYC */}
      {kyc && (
        <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            KYC / LCB-FT
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <DataTag label="PPE" value={kyc.ppe} />
            <DataTag label="Sanctions" value={kyc.sanctions} />
            <DataTag label="Score LCB" value={kyc.score_lcb} />
            <DataTag label="Nantissements" value={kyc.nantissements} />
          </div>
        </section>
      )}

      {/* Actionnariat */}
      {actionnariat?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Actionnariat
          </h3>
          <div className="flex flex-col gap-1">
            {actionnariat.map((a, i) => (
              <div key={i} className="text-sm text-[var(--text-primary)] px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg">
                {a}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filiales */}
      {filiales?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Filiales
          </h3>
          <div className="flex flex-col gap-1">
            {filiales.map((f, i) => (
              <div key={i} className="text-sm text-[var(--text-primary)] px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg">
                {typeof f === 'string' ? f : JSON.stringify(f)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
