import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import useAsaResults from '../../src/hooks/useAsaResults';
import { AsaContext } from '../../src/hooks/useCioAsaContext';
import type { AsaContextValue } from '../../src/types';

type StreamEvent = { type: string; data?: any };

function makeReader(events: StreamEvent[]) {
  let i = 0;
  return {
    read: jest.fn(() => {
      const event =
        i < events.length ? { done: false, value: events[i] } : { done: true, value: undefined };
      i += 1;
      return Promise.resolve(event);
    }),
    cancel: jest.fn(() => Promise.resolve()),
  };
}

function makeContext(reader: ReturnType<typeof makeReader>) {
  const getReader = jest.fn(() => reader);
  const getAgentResultsStream = jest.fn(() => ({ getReader }));
  const value = {
    cioClient: { agent: { getAgentResultsStream } },
    staticRequestConfigs: { domain: 'chatbot' },
  } as unknown as AsaContextValue;
  return { value, getAgentResultsStream };
}

function wrapper(value: AsaContextValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AsaContext.Provider value={value}>{children}</AsaContext.Provider>;
  };
}

describe('useAsaResults', () => {
  it('throws when rendered without a configured client/domain', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAsaResults())).toThrow(/CioAsaProvider/);
    spy.mockRestore();
  });

  it('streams a message and search result into the assistant message', async () => {
    const reader = makeReader([
      { type: 'start', data: { thread_id: 'thread-1' } },
      { type: 'message', data: { text: 'Here you go' } },
      { type: 'search_result', data: { response: { results: [{ id: 'p1' }] } } },
    ]);
    const { value } = makeContext(reader);

    const { result } = renderHook(() => useAsaResults(), { wrapper: wrapper(value) });

    act(() => {
      result.current.sendMessage('shoes');
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    const [userMsg, assistantMsg] = result.current.messages;
    expect(userMsg.role).toBe('user');
    expect(userMsg.text).toBe('shoes');
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.text).toBe('Here you go');
    expect(assistantMsg.groups).toHaveLength(1);
    expect(assistantMsg.status).toBe('done');
  });

  it('marks the assistant message as error on a server_error event', async () => {
    const reader = makeReader([
      { type: 'message', data: { text: 'partial' } },
      { type: 'server_error', data: {} },
    ]);
    const { value } = makeContext(reader);

    const { result } = renderHook(() => useAsaResults(), { wrapper: wrapper(value) });

    act(() => {
      result.current.sendMessage('hello');
    });

    await waitFor(() => expect(result.current.messages[1]?.status).toBe('error'));
    expect(result.current.messages[1].text).toBe('partial');
  });

  it('ignores empty input', () => {
    const reader = makeReader([]);
    const { value, getAgentResultsStream } = makeContext(reader);

    const { result } = renderHook(() => useAsaResults(), { wrapper: wrapper(value) });

    act(() => {
      result.current.sendMessage('   ');
    });

    expect(result.current.messages).toHaveLength(0);
    expect(getAgentResultsStream).not.toHaveBeenCalled();
  });

  it('clearHistory resets messages and cancels the reader', async () => {
    const reader = makeReader([{ type: 'message', data: { text: 'hi' } }]);
    const { value } = makeContext(reader);

    const { result } = renderHook(() => useAsaResults(), { wrapper: wrapper(value) });

    act(() => {
      result.current.sendMessage('hello');
    });
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0));

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isStreaming).toBe(false);
    expect(reader.cancel).toHaveBeenCalled();
  });
});
