// charlie-live/components/layout/Header.tsx
'use client';

import type { UseCase } from '../../types';

interface NavItem {
  id: UseCase;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'due-diligence',
    label: 'Intelligence Client',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'brief-rdv',
    label: 'Brief RDV',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'signaux',
    label: 'Radar Portefeuille',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'surveillance',
    label: 'Veille Continue',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    id: 'kyc',
    label: 'Qualification KYC',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

interface HeaderProps {
  active: UseCase;
  onNavigate: (uc: UseCase) => void;
}

export function Header({ active, onNavigate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] backdrop-blur-sm">
      {/* Logo */}
      <button
        onClick={() => onNavigate('landing')}
        className="flex items-center gap-2 group"
      >
        <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
          <span className="text-white text-sm font-bold">C</span>
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
          Charlie
        </span>
        <span className="hidden sm:inline text-xs text-[var(--text-muted)] font-mono">
          Veille Intelligente
        </span>
      </button>

      {/* Nav */}
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              active === item.id
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] tab-active'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
