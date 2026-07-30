import React from 'react';
import { renderHook } from '@testing-library/react';
import useCioAsaContextDefault, {
  useCioAsaContext,
  AsaContext,
} from '../../src/hooks/useCioAsaContext';
import { AsaContextValue } from '../../src/types';

const contextValue = {
  cioClient: { agent: {} },
  cioClientOptions: {},
  setCioClientOptions: jest.fn(),
  staticRequestConfigs: { domain: 'chatbot' },
  formatters: { formatPrice: jest.fn() },
  urlHelpers: { getUrl: jest.fn() },
} as unknown as AsaContextValue;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AsaContext.Provider value={contextValue}>{children}</AsaContext.Provider>;
}

describe('useCioAsaContext', () => {
  it('returns null when there is no provider above it', () => {
    const { result } = renderHook(() => useCioAsaContext());

    expect(result.current).toBeNull();
  });

  it('returns the value supplied by the nearest provider', () => {
    const { result } = renderHook(() => useCioAsaContext(), { wrapper });

    expect(result.current).toBe(contextValue);
  });

  it('gives the consumer the client, configs and helpers it needs', () => {
    const { result } = renderHook(() => useCioAsaContext(), { wrapper });

    expect(result.current.cioClient).toBe(contextValue.cioClient);
    expect(result.current.staticRequestConfigs).toEqual({ domain: 'chatbot' });
    expect(typeof result.current.setCioClientOptions).toBe('function');
    expect(typeof result.current.formatters.formatPrice).toBe('function');
    expect(typeof result.current.urlHelpers.getUrl).toBe('function');
  });

  it('reads from the closest provider when they are nested', () => {
    const inner = { ...contextValue, staticRequestConfigs: { domain: 'pdp' } };

    const { result } = renderHook(() => useCioAsaContext(), {
      wrapper: ({ children }) => (
        <AsaContext.Provider value={contextValue}>
          <AsaContext.Provider value={inner}>{children}</AsaContext.Provider>
        </AsaContext.Provider>
      ),
    });

    expect(result.current.staticRequestConfigs).toEqual({ domain: 'pdp' });
  });

  it('exposes the same hook as a default export', () => {
    expect(useCioAsaContextDefault).toBe(useCioAsaContext);
  });

  it('names the context for readable React DevTools output', () => {
    expect(AsaContext.displayName).toBe('AsaContext');
  });
});
