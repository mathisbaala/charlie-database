import { describe, expect, it } from 'vitest';
import { formatAmount as formatDatagouv } from '@/lib/datagouv';
import { formatAmount as formatPappers } from '@/lib/pappers';

describe('formatAmount', () => {
  it('garde 0€ au lieu de N/D pour datagouv', () => {
    expect(formatDatagouv(0)).toBe('0 €');
  });

  it('garde 0€ au lieu de N/D pour pappers', () => {
    expect(formatPappers(0)).toBe('0 €');
  });
});
