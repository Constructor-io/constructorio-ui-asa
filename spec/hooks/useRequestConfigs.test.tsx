import React from 'react';
import { renderHook } from '@testing-library/react';
import useRequestConfigs from '../../src/hooks/useRequestConfigs';
import CioAsaProvider from '../../src/components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../src/constants';
import { UrlHelpers } from '../../src/types';

function renderWithUrlHelpers(urlHelpers: Partial<UrlHelpers>) {
  return renderHook(() => useRequestConfigs(), {
    wrapper: ({ children }) => (
      <CioAsaProvider
        apiKey={DEMO_API_KEY}
        staticRequestConfigs={{ domain: 'chatbot' }}
        urlHelpers={urlHelpers as UrlHelpers}>
        {children}
      </CioAsaProvider>
    ),
  });
}

describe('useRequestConfigs', () => {
  it('throws when used outside the provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useRequestConfigs())).toThrow(/ASA Context Provider/);
    spy.mockRestore();
  });

  it('merges staticRequestConfigs with URL-derived configs', () => {
    const { result } = renderWithUrlHelpers({
      getUrl: () => 'https://x.com/?q=hello&domain=recipes',
    });
    expect(result.current.requestConfigs).toMatchObject({
      domain: 'recipes',
      intent: 'hello',
    });
  });

  it('falls back to a chatbot domain when there is no URL', () => {
    const { result } = renderWithUrlHelpers({ getUrl: () => undefined });
    expect(result.current.requestConfigs.domain).toBe('chatbot');
  });

  it('writes a new URL through setUrl on setRequestConfigs', () => {
    const setUrl = jest.fn();
    const { result } = renderWithUrlHelpers({
      getUrl: () => 'https://x.com/?domain=recipes',
      setUrl,
    });

    result.current.setRequestConfigs({ intent: 'picnic' });

    expect(setUrl).toHaveBeenCalledTimes(1);
    const newUrl = setUrl.mock.calls[0][0] as string;
    expect(newUrl).toContain('domain=recipes');
    expect(newUrl).toContain('q=picnic');
  });

  it('throws in setRequestConfigs when getUrl returns undefined', () => {
    const { result } = renderWithUrlHelpers({ getUrl: () => undefined });
    expect(() => result.current.setRequestConfigs({ intent: 'x' })).toThrow(
      /getUrl returns undefined/,
    );
  });
});
