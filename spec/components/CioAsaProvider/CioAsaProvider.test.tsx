import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import CioAsaProvider from '../../../src/components/CioAsaProvider/CioAsaProvider';
import { useCioAsaContext } from '../../../src/hooks/useCioAsaContext';
import { DEMO_API_KEY } from '../../../src/constants';
import { AsaContextValue, RequestConfigs } from '../../../src/types';

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
    expect(result.current!.staticRequestConfigs).toEqual({ domain: 'chatbot' });
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
    expect(result.current!.formatters.formatPrice).toBe(customFormatPrice);
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
    expect(result.current!.urlHelpers.getUrl).toBe(getUrl);
    // default helpers still present
    expect(typeof result.current!.urlHelpers.getStateFromUrl).toBe('function');
  });

  it('passes through a provided cioClient', () => {
    const fakeClient = { agent: {} } as any;
    const { result } = renderHook(() => useCioAsaContext(), {
      wrapper: ({ children }) => <CioAsaProvider cioClient={fakeClient}>{children}</CioAsaProvider>,
    });
    expect(result.current!.cioClient).toBe(fakeClient);
  });

  it('has no persistence store unless asked for one', () => {
    let received: AsaContextValue | undefined;
    render(
      <CioAsaProvider apiKey={DEMO_API_KEY}>
        {(ctx) => {
          received = ctx;
          return null;
        }}
      </CioAsaProvider>,
    );
    expect(received!.persistence).toBeUndefined();
  });

  it('scopes the built-in store by api key and falls back to a default domain', async () => {
    window.localStorage.clear();
    let received: AsaContextValue | undefined;
    render(
      <CioAsaProvider
        apiKey='key_test'
        staticRequestConfigs={{} as RequestConfigs}
        persistConversation>
        {(ctx) => {
          received = ctx;
          return null;
        }}
      </CioAsaProvider>,
    );
    await received!.persistence!.saveThread({
      version: 1,
      threadId: 't1',
      messages: [{ id: 'u1', role: 'user', text: 'q', status: 'done' }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:default')).toContain('t1');
    window.localStorage.clear();
  });
});
