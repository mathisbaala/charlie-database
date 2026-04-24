'use client';

import { useEffect, useState } from 'react';
import type { CompanySearchResult } from '@/types';

export function CompanyPicker({
  onChange,
  disabled,
}: {
  onChange: (company: CompanySearchResult | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CompanySearchResult[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as { results?: CompanySearchResult[] };
        setResults(json.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="field">
      <label>Entreprise</label>
      <div className="search-wrap">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) {
              onChange(null);
              setOpen(false);
            }
          }}
          placeholder="Nom ou SIREN"
          disabled={disabled}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>

      {query.trim().length >= 3 && open && results.length > 0 && (
        <div className="search-results">
          {results.map((item) => (
            <button
              key={item.siren}
              type="button"
              className="search-item"
              onClick={() => {
                onChange(item);
                setQuery(item.nom);
                setOpen(false);
              }}
            >
              <strong>{item.nom}</strong>
              <span>{item.siren}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
