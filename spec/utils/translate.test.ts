import translate from '../../src/utils/translate';
import type { Translations } from '../../src/types';

describe('translate', () => {
  it('returns the default translation for a known key', () => {
    expect(translate('CioAsa.header.title')).toBe('Shopping Assistant');
    expect(translate('CioAsa.results.addToCart')).toBe('Add to cart');
  });

  it('prefers a user-provided override over the default', () => {
    const translations: Translations = {
      'CioAsa.header.title': 'Ayudante de compras',
    };
    expect(translate('CioAsa.header.title', translations)).toBe('Ayudante de compras');
  });

  it('falls back to the default when the override does not define the key', () => {
    const translations: Translations = {
      'CioAsa.header.title': 'Ayudante de compras',
    };
    expect(translate('CioAsa.header.close', translations)).toBe('Close');
  });

  it('respects an empty-string override', () => {
    const translations: Translations = {
      'CioAsa.header.close': '',
    };
    expect(translate('CioAsa.header.close', translations)).toBe('');
  });

  it('falls back to the key itself when neither override nor default exists', () => {
    const key = 'CioAsa.unknown.key' as keyof Translations;
    expect(translate(key)).toBe('CioAsa.unknown.key');
  });
});
