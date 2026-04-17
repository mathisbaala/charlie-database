// charlie-live/components/usecases/Signaux/index.tsx
'use client';

import { useState } from 'react';
import { SignalBadge } from '../../ui/SignalBadge';
import { SourceBadge } from '../../ui/SourceBadge';
import type { SignalHebdo, SignalNiveau } from '../../../types';

export function Signaux() {
  const [loading, setLoading] = useState(false);
  const [signaux, setSignaux] = useState<SignalHebdo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SignalNiveau | 'tous'>('tous');

  const handleLoad = async () => {
    setLoading(true);
    setSignaux(null);
    setError(null);
    try {
      const res = await fetch('/api/signaux');
      const data = await res.json() as { signaux: SignalHebdo[]; error?: string };
      if (data.error) throw new Error(data.error);
      setSignaux(data.signaux ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const filtered = signaux
    ? filter === 'tous'
      ? signaux
      : signaux.filter((s) => s.signal_niveau === filter)
    : [];

  const counts = signaux
    ? {
        critique: signaux.filter((s) => s.signal_niveau === 'critique').length,
        attention: signaux.filter((s) => s.signal_niveau === 'attention').length,
        opportunite: signaux.filter((s) => s.signal_niveau === 'opportunite').length,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Radar Portefeuille</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Détectez les signaux de vos clients depuis les annonces BODACC avant qu&apos;ils vous en parlent
        </p>
      </div>

      <button
        onClick={handleLoad}
        disabled={loading}
        className="self-start px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50
          text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Analyse BODACC en cours…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Scanner les annonces BODACC
          </>
        )}
      </button>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {signaux && (
        <>
          {/* Stats */}
          {counts && (
            <div className="grid grid-cols-3 gap-3">
              {(['critique', 'attention', 'opportunite'] as const).map((niveau) => (
                <button
                  key={niveau}
                  onClick={() => setFilter(filter === niveau ? 'tous' : niveau)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    filter === niveau ? 'ring-2 ring-[var(--accent)]' : ''
                  } ${
                    niveau === 'critique'
                      ? 'bg-red-500/10 border-red-500/30'
                      : niveau === 'attention'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                  }`}
                >
                  <div className={`text-2xl font-bold font-mono ${
                    niveau === 'critique' ? 'text-red-400' : niveau === 'attention' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {counts[niveau]}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] capitalize mt-0.5">{niveau}</div>
                </button>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['tous', 'critique', 'attention', 'opportunite'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Signal list */}
          <div className="flex flex-col gap-3">
            {filtered.map((signal, i) => (
              <div
                key={i}
                className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-4 row-animate"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SignalBadge niveau={signal.signal_niveau} />
                    <span className="text-xs font-mono text-[var(--text-muted)] uppercase">{signal.signal_type}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{signal.date_evenement}</span>
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{signal.societe}</p>
                    <p className="text-xs text-[var(--text-muted)]">{signal.dirigeant} · {signal.region}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-mono text-[var(--accent)]">{signal.potentiel_min}</p>
                    <p className="text-xs text-[var(--text-muted)]">→ {signal.potentiel_max}</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{signal.description_courte}</p>
                {signal.source && <SourceBadge source={signal.source} />}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                Aucun signal pour ce filtre
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
