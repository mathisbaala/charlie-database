import { describe, expect, it } from 'vitest';
import { dueDiligenceRequestSchema, kycRequestSchema, sirenSchema } from '@/lib/schemas';

describe('schemas', () => {
  it('accepte un SIREN valide', () => {
    expect(sirenSchema.safeParse('123456789').success).toBe(true);
  });

  it('rejette un SIREN invalide', () => {
    expect(sirenSchema.safeParse('abc').success).toBe(false);
  });

  it('valide due diligence request', () => {
    const parsed = dueDiligenceRequestSchema.safeParse({ siren: '123456789', context: 'test' });
    expect(parsed.success).toBe(true);
  });

  it('exige siren ou nom pour KYC', () => {
    const parsed = kycRequestSchema.safeParse({ type: 'Dirigeant' });
    expect(parsed.success).toBe(false);
  });
});
