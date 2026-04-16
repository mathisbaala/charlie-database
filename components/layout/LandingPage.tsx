// charlie-live/components/layout/LandingPage.tsx
'use client';

import type { UseCase } from '../../types';

interface UseCardProps {
  id: UseCase;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: 'accent' | 'emerald' | 'amber';
  icon: React.ReactNode;
  onSelect: (id: UseCase) => void;
}

function UseCard({ id, title, description, badge, badgeColor = 'accent', icon, onSelect }: UseCardProps) {
  const badgeClasses = {
    accent: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }[badgeColor];

  return (
    <button
      onClick={() => onSelect(id)}
      className="group text-left p-5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl
        hover:border-[var(--accent)]/40 hover:bg-[var(--bg-hover)] transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)]/20 transition-colors">
          {icon}
        </div>
        {badge && (
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{description}</p>
    </button>
  );
}

interface LandingPageProps {
  onSelect: (uc: UseCase) => void;
}

export function LandingPage({ onSelect }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6 py-16">
      {/* Hero */}
      <div className="text-center max-w-2xl mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs text-[var(--accent)] font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          RNE · BODACC · Claude AI · Données officielles françaises
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight mb-4">
          Votre base client<br />
          <span className="text-[var(--accent)]">devient vivante</span>
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
          Charlie surveille vos clients dirigeants en continu depuis les sources officielles.
          Signaux actionnables, briefs de rendez-vous, alertes patrimoniales — tout ce qu'il vous faut avant d'appeler.
        </p>
      </div>

      {/* Use cases grid — 2 top + 3 bottom */}
      <div className="w-full max-w-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UseCard
            id="due-diligence"
            title="Intelligence Client"
            description="Enrichissez automatiquement un profil client depuis le Registre National des Entreprises et BODACC. Dirigeants, finances, signaux patrimoniaux en 30 secondes."
            badge="RNE + BODACC"
            badgeColor="accent"
            onSelect={onSelect}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <UseCard
            id="brief-rdv"
            title="Brief RDV"
            description="Arrivez préparé à chaque rendez-vous. Ce qui a changé depuis votre dernière rencontre, les sujets à aborder, les questions à poser — généré en 20 secondes."
            badge="Nouveau"
            badgeColor="emerald"
            onSelect={onSelect}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UseCard
            id="signaux"
            title="Radar Portefeuille"
            description="Signaux patrimoniaux détectés depuis les annonces BODACC de vos clients. Cession, restructuration, transmission — avant qu'ils vous en parlent."
            badge="BODACC Live"
            badgeColor="accent"
            onSelect={onSelect}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <UseCard
            id="surveillance"
            title="Veille Continue"
            description="Alertes personnalisées adaptées au profil risque et aux objectifs patrimoniaux. Chaque alerte est contextualisée à la situation de votre client."
            badge="Personnalisé"
            badgeColor="accent"
            onSelect={onSelect}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          />
          <UseCard
            id="kyc"
            title="Qualification KYC"
            description="Dossier KYC / LCB-FT structuré selon les obligations françaises. Bénéficiaires effectifs, screening PPE, score LCB en 3 minutes."
            badge="LCB-FT"
            badgeColor="amber"
            onSelect={onSelect}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Sources */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Registre National des Entreprises
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          BODACC · DILA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          Claude AI · Anthropic
        </span>
      </div>
    </div>
  );
}
