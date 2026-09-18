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
    window.sessionStorage.clear();
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
    expect(window.sessionStorage.getItem('cio-asa:chat:v1:key_test:default')).toContain('t1');
    window.sessionStorage.clear();
  });

  describe('userId', () => {
    const KEY = 'cio-asa:chat:v1:key_test:chatbot';
    type Props = { userId?: string | null; cioClient?: unknown };
    let received: AsaContextValue | undefined;

    const element = ({ userId, cioClient }: Props) => (
      <CioAsaProvider
        {...(cioClient ? { cioClient: cioClient as never } : { apiKey: 'key_test' })}
        staticRequestConfigs={{ domain: 'chatbot' }}
        userId={userId}
        persistConversation>
        {(ctx) => {
          received = ctx;
          return null;
        }}
      </CioAsaProvider>
    );
    const renderWith = (props: Props) => render(element(props));
    const save = (threadId: string) =>
      received!.persistence!.saveThread({
        version: 1,
        threadId,
        messages: [{ id: 'u1', role: 'user', text: 'q', status: 'done' }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    const clientUserId = () =>
      (received!.cioClient as unknown as { options: { userId?: string } }).options.userId;

    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      received = undefined;
    });
    afterEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    it('keeps a shopper in localStorage and reports the store as theirs', async () => {
      renderWith({ userId: 'user-0' });
      expect(received!.persistenceScope).toBe('user');
      await save('t0');
      expect(window.localStorage.getItem(`${KEY}:user-0`)).toContain('t0');
      expect(window.sessionStorage.getItem(`${KEY}:user-0`)).toBeNull();
    });

    it('keeps the guest in sessionStorage, so the history ends with the tab', async () => {
      renderWith({ userId: null });
      expect(received!.persistenceScope).toBe('guest');
      await save('tg');
      expect(window.sessionStorage.getItem(KEY)).toContain('tg');
      expect(window.localStorage.getItem(KEY)).toBeNull();
    });

    it('is set on the client built from an api key, so requests and storage share it', async () => {
      renderWith({ userId: 'user-1' });
      expect(clientUserId()).toBe('user-1');
      await save('t1');
      expect(window.localStorage.getItem(`${KEY}:user-1`)).toContain('t1');
      expect(window.localStorage.getItem(KEY)).toBeNull();
    });

    it('scopes storage for a caller-provided client that has no id of its own', async () => {
      renderWith({ userId: 'user-2', cioClient: { agent: {}, options: { apiKey: 'key_test' } } });
      await save('t2');
      expect(window.localStorage.getItem(`${KEY}:user-2`)).toContain('t2');
      expect(window.localStorage.getItem(KEY)).toBeNull();
    });

    it('falls back to the client id when the prop is omitted', async () => {
      renderWith({ cioClient: { agent: {}, options: { apiKey: 'key_test', userId: 'user-3' } } });
      await save('t3');
      expect(window.localStorage.getItem(`${KEY}:user-3`)).toContain('t3');
    });

    it('treats null as the guest, even when the client still carries an id', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      renderWith({
        userId: null,
        cioClient: { agent: {}, options: { apiKey: 'key_test', userId: 'stale' } },
      });
      await save('t4');
      expect(window.sessionStorage.getItem(KEY)).toContain('t4');
      expect(window.localStorage.getItem(`${KEY}:stale`)).toBeNull();
      warn.mockRestore();
    });

    it('switches to a separate history on login and back to the guest one on logout', async () => {
      const view = renderWith({ userId: null });
      await save('guest');
      expect(window.sessionStorage.getItem(KEY)).toContain('guest');

      view.rerender(element({ userId: 'user-4' }));
      expect(clientUserId()).toBe('user-4');
      expect(await received!.persistence!.listThreads()).toEqual([]);
      await save('signed-in');
      expect(window.localStorage.getItem(`${KEY}:user-4`)).toContain('signed-in');
      expect(window.sessionStorage.getItem(KEY)).not.toContain('signed-in');

      view.rerender(element({ userId: null }));
      expect(clientUserId()).toBeUndefined();
      expect((await received!.persistence!.listThreads()).map((t) => t.threadId)).toEqual([
        'guest',
      ]);
    });

    it('warns once in development when the prop and a caller-provided client disagree', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const cioClient = { agent: {}, options: { apiKey: 'key_test', userId: 'from-client' } };
      const view = renderWith({ userId: 'from-prop', cioClient });
      view.rerender(element({ userId: 'from-prop', cioClient }));
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('from-prop');
      expect(warn.mock.calls[0][0]).toContain('from-client');
      warn.mockRestore();
    });

    it('does not warn when the id reaches the client through the api key path', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      renderWith({ userId: 'user-5' });
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
