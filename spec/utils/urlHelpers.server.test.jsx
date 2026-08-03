import {
  getUrl,
  setUrl,
  getStateFromUrl,
  getUrlFromState,
  extractFiltersFromUrl,
  defaultQueryStringMap,
} from '../../src/utils/urlHelpers';

describe('urlHelpers (SSR)', () => {
  it('getUrl returns undefined when window is not defined', () => {
    expect(typeof window).toBe('undefined');
    expect(getUrl()).toBeUndefined();
  });

  it('setUrl is a no-op on the server', () => {
    expect(() => setUrl('https://example.com')).not.toThrow();
  });

  it('getStateFromUrl parses a URL string without touching window', () => {
    const state = getStateFromUrl(
      'https://example.com/search?q=shoes&domain=pdp&resultsPerPod=12&page=2',
    );

    expect(state).toEqual({ intent: 'shoes', domain: 'pdp', numResultsPerPage: 12 });
  });

  it('getStateFromUrl ignores unknown query params', () => {
    const state = getStateFromUrl('https://example.com/search?q=shoes&utm_source=email');

    expect(state).toEqual({ intent: 'shoes' });
  });

  it('extractFiltersFromUrl collects repeated filter params', () => {
    const params = new URLSearchParams('filters[color]=red&filters[color]=blue&filters[size]=10');

    expect(extractFiltersFromUrl(params)).toEqual({ color: ['red', 'blue'], size: ['10'] });
  });

  it('extractFiltersFromUrl returns undefined when there are no filters', () => {
    expect(extractFiltersFromUrl(new URLSearchParams('q=shoes'))).toBeUndefined();
  });

  it('getUrlFromState builds a URL from a server-supplied base', () => {
    const url = getUrlFromState(
      { intent: 'shoes', domain: 'pdp' },
      { origin: 'https://example.com', pathname: '/search' },
    );

    expect(url).toContain('https://example.com/search?');
    expect(url).toContain('q=shoes');
    expect(url).toContain('domain=pdp');
  });

  it('getUrlFromState round-trips state through getStateFromUrl', () => {
    const state = { intent: 'shoes', domain: 'pdp', filters: { color: ['red'] } };

    const url = getUrlFromState(state, { baseUrl: 'https://example.com/search' });

    expect(getStateFromUrl(url)).toEqual(state);
  });

  it('exposes a frozen query string map so consumers cannot mutate it', () => {
    expect(Object.isFrozen(defaultQueryStringMap)).toBe(true);
    expect(defaultQueryStringMap.intent).toBe('q');
  });
});
