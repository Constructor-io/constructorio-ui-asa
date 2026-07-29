import { formatPrice } from './formatters';

describe('formatPrice', () => {
  it('formats a positive number as a dollar string with two decimals', () => {
    expect(formatPrice(12.3)).toBe('$12.30');
    expect(formatPrice(12.345)).toBe('$12.35');
    expect(formatPrice(1000)).toBe('$1000.00');
  });

  it('returns an empty string for 0', () => {
    expect(formatPrice(0)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(formatPrice()).toBe('');
    expect(formatPrice(undefined)).toBe('');
  });
});
