import translate from '../../src/utils/translate';

describe('translate', () => {
  it('returns the override translation when provided', () => {
    expect(translate('CioAsa.header.title', { 'CioAsa.header.title': 'Custom Title' })).toBe(
      'Custom Title',
    );
  });

  it('returns an empty-string override rather than falling back to the default', () => {
    expect(translate('CioAsa.header.title', { 'CioAsa.header.title': '' })).toBe('');
  });

  it('falls back to the default English string when no override is given', () => {
    expect(translate('CioAsa.header.title')).toBe('Shopping Assistant');
    expect(translate('CioAsa.results.addToCart', {})).toBe('Add to cart');
  });

  it('falls back to the key itself when no default exists', () => {
    // @ts-expect-error — exercising the runtime fallback for an unknown key
    expect(translate('CioAsa.unknown.key')).toBe('CioAsa.unknown.key');
  });
});
