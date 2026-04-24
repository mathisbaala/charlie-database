import { describe, expect, it } from 'vitest';
import { parseClaudeJson } from '@/lib/claude';

describe('parseClaudeJson', () => {
  it('parse du JSON simple', () => {
    const parsed = parseClaudeJson<{ ok: boolean }>(' { "ok": true } ');
    expect(parsed.ok).toBe(true);
  });

  it('retire les fences markdown', () => {
    const parsed = parseClaudeJson<{ a: number }>('```json\n{"a":1}\n```');
    expect(parsed).toEqual({ a: 1 });
  });

  it('lance une erreur sur contenu invalide', () => {
    expect(() => parseClaudeJson('pas du json')).toThrow();
  });
});
