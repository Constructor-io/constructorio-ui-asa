import { formatPrice } from '../../src/utils/formatters';

describe('formatters (SSR / node environment)', () => {
  it('formats a price without a DOM or Intl locale lookup', () => {
    expect(formatPrice(9.5)).toBe('$9.50');
    expect(formatPrice(1234)).toBe('$1234.00');
  });

  it('rounds to two decimal places', () => {
    expect(formatPrice(9.999)).toBe('$10.00');
  });

  it('returns an empty string for missing or zero prices', () => {
    expect(formatPrice()).toBe('');
    expect(formatPrice(undefined)).toBe('');
    expect(formatPrice(0)).toBe('');
  });
});
