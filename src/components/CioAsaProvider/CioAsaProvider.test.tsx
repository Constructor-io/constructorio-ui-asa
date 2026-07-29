import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import CioAsaProvider from './CioAsaProvider';
import { useCioAsaContext } from '../../hooks/useCioAsaContext';
import { DEMO_API_KEY } from '../../constants';
import { AsaContextValue } from '../../types';

describe('CioAsaProvider', () => {
  it('renders children', () => {
    render(
      <CioAsaProvider apiKey={DEMO_API_KEY}>
        <span>child content</span>
      </CioAsaProvider>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('supports a render-prop child that receives the context value', () => {
    let received: AsaContextValue | undefined;
    render(
      <CioAsaProvider apiKey={DEMO_API_KEY}>
        {(ctx) => {
          received = ctx;
          return <span>rendered</span>;
        }}
      </CioAsaProvider>,
    );
    expect(screen.getByText('rendered')).toBeInTheDocument();
    expect(received).toBeDefined();
    expect(received!.cioClient).not.toBeNull();
  });

  it('defaults staticRequestConfigs.domain to "chatbot"', () => {
    const { result } = renderHook(() => useCioAsaContext(), {
      wrapper: ({ children }) => <CioAsaProvider apiKey={DEMO_API_KEY}>{children}</CioAsaProvider>,
    });
    expect(result.current.staticRequestConfigs).toEqual({ domain: 'chatbot' });
  });

  it('merges custom formatters over the defaults', () => {
    const customFormatPrice = jest.fn(() => 'custom');
    const { result } = renderHook(() => useCioAsaContext(), {
      wrapper: ({ children }) => (
        <CioAsaProvider apiKey={DEMO_API_KEY} formatters={{ formatPrice: customFormatPrice }}>
          {children}
        </CioAsaProvider>
      ),
    });
    expect(result.current.formatters.formatPrice).toBe(customFormatPrice);
  });

  it('exposes default urlHelpers and merges overrides', () => {
    const getUrl = jest.fn(() => 'https://custom');
    const { result } = renderHook(() => useCioAsaContext(), {
      wrapper: ({ children }) => (
        <CioAsaProvider apiKey={DEMO_API_KEY} urlHelpers={{ getUrl } as any}>
          {children}
        </CioAsaProvider>
      ),
    });
    expect(result.current.urlHelpers.getUrl).toBe(getUrl);
    // default helpers still present
    expect(typeof result.current.urlHelpers.getStateFromUrl).toBe('function');
  });

  it('passes through a provided cioClient', () => {
    const fakeClient = { agent: {} } as any;
    const { result } = renderHook(() => useCioAsaContext(), {
      wrapper: ({ children }) => <CioAsaProvider cioClient={fakeClient}>{children}</CioAsaProvider>,
    });
    expect(result.current.cioClient).toBe(fakeClient);
  });
});
