import {
  getUrl,
  setUrl,
  getStateFromUrl,
  getUrlFromState,
  extractFiltersFromUrl,
  getFilterParamsFromState,
  defaultQueryStringMap,
} from './urlHelpers';
import testRequestState from '../../spec/local_examples/testRequestState.json';

// Note: getUrlFromState uses URLSearchParams, which encodes spaces as '+'
// (not '%20'). getStateFromUrl decodes both, so the round-trip still holds.
const ENCODED_URL =
  'https://www.examples.com/asa?q=how+do+I+pack+for+a+picnic%3F&resultsPerPod=20&domain=recipes&filters%5Bprice%5D=5-100&filters%5Bcolor%5D=Gold&filters%5Btest%5D=testValue&filters%5Btest%5D=testValue2&filters%5Btest%5D=testValue3&filters%5BlowestPrice%5D=100&filters%5BlowestPrice%5D=300';

describe('urlHelpers', () => {
  describe('getUrl / setUrl', () => {
    it('reads window.location.href', () => {
      expect(getUrl()).toBe(window.location.href);
    });

    it('assigns to window.location.href without throwing', () => {
      // jsdom does not navigate, but the assignment path should run cleanly.
      expect(() => setUrl('https://example.com/next')).not.toThrow();
    });
  });

  describe('extractFiltersFromUrl', () => {
    it('extracts single and repeated filter params into arrays', () => {
      const params = new URLSearchParams(
        'filters[color]=Gold&filters[test]=a&filters[test]=b&q=ignored',
      );
      expect(extractFiltersFromUrl(params)).toEqual({
        color: ['Gold'],
        test: ['a', 'b'],
      });
    });

    it('returns undefined when there are no filter params', () => {
      expect(extractFiltersFromUrl(new URLSearchParams('q=hello'))).toBeUndefined();
    });
  });

  describe('getFilterParamsFromState', () => {
    it('encodes array and scalar filter values as filters[name] params', () => {
      const params = new URLSearchParams();
      getFilterParamsFromState(params, { color: ['Gold', 'Red'], size: 'M' as any });
      expect(params.getAll('filters[color]')).toEqual(['Gold', 'Red']);
      expect(params.getAll('filters[size]')).toEqual(['M']);
    });
  });

  describe('getStateFromUrl', () => {
    it('parses query params into RequestConfigs', () => {
      expect(getStateFromUrl(ENCODED_URL)).toEqual(testRequestState);
    });

    it('coerces numResultsPerPage to a number', () => {
      const state = getStateFromUrl('https://x.com/?resultsPerPod=15&domain=chatbot');
      expect(state.numResultsPerPage).toBe(15);
      expect(typeof state.numResultsPerPage).toBe('number');
    });
  });

  describe('getUrlFromState', () => {
    it('serializes RequestConfigs into the expected encoded URL', () => {
      expect(getUrlFromState(testRequestState, { baseUrl: 'https://www.examples.com/asa' })).toBe(
        ENCODED_URL,
      );
    });

    it('builds the base URL from origin + pathname when no baseUrl is given', () => {
      const url = getUrlFromState(
        { domain: 'recipes' },
        { origin: 'https://x.com', pathname: '/p' },
      );
      expect(url.startsWith('https://x.com/p?')).toBe(true);
      expect(url).toContain('domain=recipes');
    });

    it('ignores keys not present in the query string map', () => {
      const url = getUrlFromState({ domain: 'recipes', unknownKey: 'x' } as any, {
        baseUrl: 'https://x.com',
      });
      expect(url).not.toContain('unknownKey');
    });

    it('round-trips through getStateFromUrl', () => {
      const url = getUrlFromState(testRequestState, { baseUrl: 'https://www.examples.com/asa' });
      expect(getStateFromUrl(url)).toEqual(testRequestState);
    });
  });

  describe('defaultQueryStringMap', () => {
    it('is frozen', () => {
      expect(Object.isFrozen(defaultQueryStringMap)).toBe(true);
    });
  });
});
