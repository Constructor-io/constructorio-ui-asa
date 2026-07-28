import React from 'react';
import { renderHook } from '@testing-library/react';
import useRequestConfigs from '../../src/hooks/useRequestConfigs';
import { AsaContext } from '../../src/hooks/useCioAsaContext';
import type { AsaContextValue } from '../../src/types';

function makeContext(overrides: Partial<AsaContextValue> = {}) {
  return {
    staticRequestConfigs: { domain: 'my-domain' },
    urlHelpers: {
      getUrl: jest.fn(() => undefined),
      setUrl: jest.fn(),
      getStateFromUrl: jest.fn(() => ({ domain: 'chatbot', intent: 'shoes' })),
      getUrlFromState: jest.fn(),
    },
    ...overrides,
  } as unknown as AsaContextValue;
}

function wrapper(value: AsaContextValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AsaContext.Provider value={value}>{children}</AsaContext.Provider>;
  };
}

describe('useRequestConfigs', () => {
  it('keeps staticRequestConfigs.domain when the URL has no state', () => {
    const value = makeContext();

    const { result } = renderHook(() => useRequestConfigs(), { wrapper: wrapper(value) });

    expect(result.current.requestConfigs.domain).toBe('my-domain');
  });

  it('lets URL state override staticRequestConfigs when a URL is present', () => {
    const value = makeContext({
      urlHelpers: {
        getUrl: jest.fn(() => 'https://example.com/?q=shoes'),
        setUrl: jest.fn(),
        getStateFromUrl: jest.fn(() => ({ domain: 'chatbot', intent: 'shoes' })),
        getUrlFromState: jest.fn(),
      } as unknown as AsaContextValue['urlHelpers'],
    });

    const { result } = renderHook(() => useRequestConfigs(), { wrapper: wrapper(value) });

    expect(result.current.requestConfigs.domain).toBe('chatbot');
    expect(result.current.requestConfigs.intent).toBe('shoes');
  });
});
