import translate from '../../src/utils/translate';

describe('translate (SSR / node environment)', () => {
  it('resolves the built-in copy without a DOM', () => {
    expect(translate('CioAsa.header.title')).toBe('Shopping Assistant');
    expect(translate('CioAsa.results.addToCart')).toBe('Add to cart');
  });

  it('prefers a consumer override', () => {
    expect(translate('CioAsa.header.title', { 'CioAsa.header.title': 'Asistente' })).toBe(
      'Asistente',
    );
  });

  it('falls back to the default when the override omits the key', () => {
    expect(translate('CioAsa.header.close', { 'CioAsa.header.title': 'Asistente' })).toBe('Close');
  });

  it('honours an empty-string override', () => {
    expect(translate('CioAsa.header.close', { 'CioAsa.header.close': '' })).toBe('');
  });

  it('returns the key itself for an unknown key', () => {
    expect(translate('CioAsa.does.not.exist')).toBe('CioAsa.does.not.exist');
  });
});
