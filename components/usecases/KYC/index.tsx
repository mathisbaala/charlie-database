// charlie-live/components/usecases/KYC/index.tsx
'use client';

import { useState } from 'react';
import { SearchInput } from '../DueDiligence/SearchInput';
import { DataTag } from '../../ui/DataTag';
import { SourceBadge } from '../../ui/SourceBadge';
import type { CompanySearchResult, KYCResult } from '../../../types';

const LOADING_STEPS = [
  'Extraction registre RNE…',
  'Vérification bénéficiaires effectifs…',
  'Scoring LCB-FT…',
];

export function KYC() {
  const [selected, setSelected] = useState<CompanySearchResult | null>(null);
  const [nom, setNom] = useState('');
  const [type, setType] = useState('Dirigeant');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<KYCResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selected && !nom.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setLoadingStep(0);

    const stepTimer = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1500);

    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siren: selected?.siren ?? '',
          nom: nom || (selected?.nom ?? ''),
          type,
        }),
      });
      const data = await res.json() as KYCResult & { error?: string };
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
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Qualification Continue</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Dossier KYC / LCB-FT structuré depuis le Registre National des Entreprises — en 3 minutes
        </p>
      </div>

      <SearchInput onSelect={setSelected} disabled={loading} />

      <div className="flex gap-3">
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom du dirigeant (facultatif)"
          className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5
            text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2.5
            text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option>Dirigeant</option>
          <option>Actionnaire</option>
          <option>Bénéficiaire effectif</option>
          <option>Entreprise</option>
        </select>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || (!selected && !nom.trim())}
        className="self-start px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50
          text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {loading ? 'Qualification en cours…' : 'Générer dossier KYC'}
      </button>

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

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {result && <KYCReport result={result} />}
    </div>
  );
}

function KYCReport({ result }: { result: KYCResult }) {
  const { identification, beneficiaires_effectifs, screening, structure, score_lcb, sources } = result;

  const scoreColor =
    score_lcb?.niveau === 'Faible'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : score_lcb?.niveau === 'Moyen'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-red-400 bg-red-500/10 border-red-500/30';

  return (
    <div className="flex flex-col gap-5 animate-[fadeIn_0.4s_ease]">
      {/* Identification */}
      {identification && (
        <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Identification
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <DataTag label="Nom" value={identification.nom} />
            <DataTag label="Rôle" value={identification.role} />
            <DataTag label="Détention" value={identification.detention_pct} />
            <DataTag label="Naissance (approx.)" value={identification.naissance_approx} />
            <DataTag label="Nationalité" value={identification.nationalite} />
            <DataTag label="Résidence fiscale" value={identification.residence_fiscale} />
          </div>
        </section>
      )}

      {/* Screening */}
      {screening && (
        <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Screening
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DataTag label="PPE" value={screening.ppe} />
            <DataTag label="Sanctions EU" value={screening.sanctions_eu} />
            <DataTag label="Sanctions OFAC" value={screening.sanctions_ofac} />
            <DataTag label="PEP Level" value={screening.pep_level} />
          </div>
        </section>
      )}

      {/* Bénéficiaires effectifs */}
      {beneficiaires_effectifs?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Bénéficiaires effectifs
          </h3>
          <div className="flex flex-col gap-2">
            {beneficiaires_effectifs.map((be, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{be.nom}</p>
                  <p className="text-xs text-[var(--text-muted)]">{be.role} · {be.pct}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">{be.date_declaration}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    be.statut === 'Conforme'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {be.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Structure */}
      {structure?.organigramme_simplifie && (
        <section className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Structure
          </h3>
          <p className="text-sm font-mono text-[var(--text-primary)]">{structure.organigramme_simplifie}</p>
          {structure.nantissements && structure.nantissements !== 'N/D' && (
            <div className="mt-3">
              <DataTag label="Nantissements" value={structure.nantissements} />
            </div>
          )}
        </section>
      )}

      {/* Score LCB */}
      {score_lcb && (
        <section className={`rounded-xl border p-5 ${scoreColor}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Score LCB-FT</h3>
            <span className={`text-2xl font-bold font-mono`}>{score_lcb.score}/10</span>
          </div>
          <p className="text-sm font-semibold mb-2">{score_lcb.niveau} · {score_lcb.recommandation}</p>
          {score_lcb.facteurs?.length > 0 && (
            <ul className="flex flex-col gap-1">
              {score_lcb.facteurs.map((f, i) => (
                <li key={i} className="text-xs opacity-80">· {f}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Sources */}
      {sources?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sources.map((s, i) => <SourceBadge key={i} source={s} />)}
        </div>
      )}
    </div>
  );
}
