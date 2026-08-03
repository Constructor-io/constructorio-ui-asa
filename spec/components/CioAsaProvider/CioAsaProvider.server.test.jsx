import React from 'react';
import { renderServerSide, renderHookServerSideWithCioAsa } from '../../test-utils.server';
import CioAsaProvider from '../../../src/components/CioAsaProvider/CioAsaProvider';
import { useCioAsaContext } from '../../../src/hooks/useCioAsaContext';
import { createMockCioClient } from '../../local_examples/mockCioClient';
import { DEMO_API_KEY } from '../../../src/constants';

describe('CioAsaProvider (SSR)', () => {
  it('renders its children into the server markup', () => {
    const html = renderServerSide(
      <CioAsaProvider apiKey={DEMO_API_KEY}>
        <p>Child content</p>
      </CioAsaProvider>,
    );

    expect(html).toContain('Child content');
  });

  it('supports render-prop children and hands them the context value', () => {
    const html = renderServerSide(
      <CioAsaProvider apiKey={DEMO_API_KEY}>
        {({ staticRequestConfigs }) => <p>{staticRequestConfigs.domain}</p>}
      </CioAsaProvider>,
    );

    expect(html).toContain('chatbot');
  });

  it('exposes a null cioClient on the server when only an apiKey is given', () => {
    const { result } = renderHookServerSideWithCioAsa(() => useCioAsaContext(), {
      apiKey: DEMO_API_KEY,
    });

    expect(result.cioClient).toBeNull();
  });

  it('passes a provided cioClient straight through on the server', () => {
    const { client } = createMockCioClient();

    const { result } = renderHookServerSideWithCioAsa(() => useCioAsaContext(), {
      cioClient: client,
    });

    expect(result.cioClient).toBe(client);
  });

  it('provides default formatters and url helpers on the server', () => {
    const { result } = renderHookServerSideWithCioAsa(() => useCioAsaContext(), {
      apiKey: DEMO_API_KEY,
    });

    expect(typeof result.formatters.formatPrice).toBe('function');
    expect(typeof result.urlHelpers.getUrl).toBe('function');
    expect(result.formatters.formatPrice(9.5)).toBe('$9.50');
  });

  it('lets consumers override formatters and url helpers', () => {
    const formatPrice = jest.fn(() => '9,50 €');
    const getUrl = jest.fn(() => 'https://example.com/?q=shoes');

    const { result } = renderHookServerSideWithCioAsa(() => useCioAsaContext(), {
      apiKey: DEMO_API_KEY,
      formatters: { formatPrice },
      urlHelpers: { getUrl },
    });

    expect(result.formatters.formatPrice).toBe(formatPrice);
    expect(result.urlHelpers.getUrl).toBe(getUrl);
    // Non-overridden helpers still fall back to the defaults.
    expect(typeof result.urlHelpers.getStateFromUrl).toBe('function');
  });

  it('defaults staticRequestConfigs to the chatbot domain and honours overrides', () => {
    const { result } = renderHookServerSideWithCioAsa(() => useCioAsaContext(), {
      apiKey: DEMO_API_KEY,
      staticRequestConfigs: { domain: 'pdp' },
    });

    expect(result.staticRequestConfigs).toEqual({ domain: 'pdp' });
  });

  it('throws when neither an apiKey nor a cioClient is supplied', () => {
    expect(() => renderServerSide(<CioAsaProvider>hi</CioAsaProvider>)).toThrow(
      /Api Key or Constructor Client required/,
    );
  });
});
