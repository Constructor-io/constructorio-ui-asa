import { renderHookServerSide, renderHookServerSideWithCioAsa } from '../test-utils.server';
import useRequestConfigs from '../../src/hooks/useRequestConfigs';
import { DEMO_API_KEY } from '../../src/constants';

describe('useRequestConfigs (SSR)', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHookServerSide(() => useRequestConfigs())).toThrow(
      /needs to be called within the C.io ASA Context Provider/,
    );
  });

  it('falls back to the static request configs when there is no URL on the server', () => {
    const { result } = renderHookServerSideWithCioAsa(() => useRequestConfigs(), {
      apiKey: DEMO_API_KEY,
      staticRequestConfigs: { domain: 'pdp', numResultsPerPage: 5 },
    });

    expect(result.requestConfigs).toEqual({ domain: 'pdp', numResultsPerPage: 5 });
  });

  it('reads state from an injected server-side URL helper', () => {
    const getUrl = jest.fn(() => 'https://example.com/search?q=shoes&resultsPerPod=8');

    const { result } = renderHookServerSideWithCioAsa(() => useRequestConfigs(), {
      apiKey: DEMO_API_KEY,
      urlHelpers: { getUrl },
    });

    expect(getUrl).toHaveBeenCalled();
    expect(result.requestConfigs).toMatchObject({
      domain: 'chatbot',
      intent: 'shoes',
      numResultsPerPage: 8,
    });
  });

  it('throws from setRequestConfigs when no URL is available on the server', () => {
    const { result } = renderHookServerSideWithCioAsa(() => useRequestConfigs(), {
      apiKey: DEMO_API_KEY,
    });

    expect(() => result.setRequestConfigs({ intent: 'boots' })).toThrow(
      /getUrl returns undefined when attempting to call setRequestConfigs/,
    );
  });

  it('writes through the injected url helpers when a URL is available', () => {
    const setUrl = jest.fn();
    const getUrl = jest.fn(() => 'https://example.com/search?q=shoes');

    const { result } = renderHookServerSideWithCioAsa(() => useRequestConfigs(), {
      apiKey: DEMO_API_KEY,
      urlHelpers: { getUrl, setUrl },
    });

    result.setRequestConfigs({ intent: 'boots' });

    expect(setUrl).toHaveBeenCalledTimes(1);
    expect(setUrl.mock.calls[0][0]).toContain('q=boots');
  });
});
