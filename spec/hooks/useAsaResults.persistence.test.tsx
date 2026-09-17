import React, { useMemo } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import useAsaResults from '../../src/hooks/useAsaResults';
import CioAsaProvider from '../../src/components/CioAsaProvider/CioAsaProvider';
import { clearPersistedConversations } from '../../src/utils/localStoragePersistence';
import { AsaContext } from '../../src/hooks/useCioAsaContext';
import * as formatters from '../../src/utils/formatters';
import * as urlHelpers from '../../src/utils/urlHelpers';
import {
  createEventStream,
  createMockCioClient,
  createPendingStream,
  StreamEvent,
} from '../local_examples/mockCioClient';
import type { AsaContextValue, ChatMessage, ChatPersistence, PersistedChat } from '../../src/types';

function createMemoryPersistence(initial: PersistedChat[] = [], withSubscribe = false) {
  const threads = new Map(initial.map((t) => [t.threadId, t]));
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const store: jest.Mocked<ChatPersistence> = {
    ...(withSubscribe && {
      subscribe: jest.fn((listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
    }),
    listThreads: jest.fn(async () =>
      Array.from(threads.values())
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(({ threadId, createdAt, updatedAt, messages }) => ({
          threadId,
          title: '',
          createdAt,
          updatedAt,
          inFlight: ['loading', 'streaming'].includes(messages[messages.length - 1]?.status),
        })),
    ),
    getThread: jest.fn(async (id: string) => threads.get(id) ?? null),
    saveThread: jest.fn(async (chat: PersistedChat) => {
      threads.set(chat.threadId, chat);
    }),
    deleteThread: jest.fn(async (id: string) => {
      threads.delete(id);
    }),
  };
  return { store, threads, notify };
}

function persisted(threadId: string, messages: ChatMessage[]): PersistedChat {
  return { version: 1, threadId, messages, createdAt: 1000, updatedAt: 2000 };
}

const userMsg = (id: string, text: string): ChatMessage => ({
  id,
  role: 'user',
  text,
  status: 'done',
});
const aiMsg = (id: string, text: string, status: ChatMessage['status'] = 'done'): ChatMessage => ({
  id,
  role: 'assistant',
  text,
  status,
  groups: [],
});

// The provider only exposes `persistConversation: boolean`; tests that need a controllable store
// hand it to the hook through the context the provider would otherwise populate.
function Wrapper({
  cioClient,
  persistence,
  children,
}: {
  cioClient: ConstructorIOClient;
  persistence: ChatPersistence | boolean | undefined;
  children: React.ReactNode;
}) {
  const store = typeof persistence === 'object' ? persistence : undefined;
  const value = useMemo(
    (): AsaContextValue => ({
      cioClient,
      cioClientOptions: {},
      setCioClientOptions: () => {},
      staticRequestConfigs: { domain: 'chatbot' },
      formatters,
      urlHelpers,
      persistence: store,
    }),
    [cioClient, store],
  );
  if (store) return <AsaContext.Provider value={value}>{children}</AsaContext.Provider>;
  return (
    <CioAsaProvider
      cioClient={cioClient}
      staticRequestConfigs={{ domain: 'chatbot' }}
      persistConversation={typeof persistence === 'boolean' ? persistence : undefined}>
      {children}
    </CioAsaProvider>
  );
}

function renderWithPersistence(
  cioClient: ConstructorIOClient,
  persistence: ChatPersistence | boolean | undefined,
  initialThreadId?: string,
) {
  return renderHook(() => useAsaResults({ initialThreadId }), {
    wrapper: ({ children }) => (
      <Wrapper cioClient={cioClient} persistence={persistence}>
        {children}
      </Wrapper>
    ),
  });
}

function createStartedThenPendingStream(threadId?: string) {
  let sent = false;
  return {
    getReader() {
      return {
        read: () => {
          if (!sent) {
            sent = true;
            return Promise.resolve({
              done: false,
              value: { type: 'start', data: threadId ? { thread_id: threadId } : {} },
            });
          }
          return new Promise<never>(() => {});
        },
        cancel: () => Promise.resolve(),
        releaseLock: () => {},
      };
    },
  } as unknown as ReadableStream<StreamEvent>;
}

const startEvent = (threadId: string): StreamEvent => ({
  type: 'start',
  data: { thread_id: threadId },
});

describe('useAsaResults persistence', () => {
  it('reports no hydration and touches no storage when persistence is off', () => {
    const { client } = createMockCioClient({ events: [] });
    const { result } = renderWithPersistence(client, undefined);

    expect(result.current.isHydrating).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it('restores the most recent thread and continues it on the server', async () => {
    const { client, getAgentResultsStream } = createMockCioClient({ events: [] });
    const { store } = createMemoryPersistence([
      { ...persisted('older', [userMsg('u0', 'old'), aiMsg('a0', 'old answer')]), updatedAt: 1 },
      persisted('thread-recent', [userMsg('u1', 'shoes'), aiMsg('a1', 'Here are shoes')]),
    ]);
    const { result } = renderWithPersistence(client, store);

    expect(result.current.isHydrating).toBe(true);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.messages.map((m) => m.text)).toEqual(['shoes', 'Here are shoes']);

    act(() => result.current.sendMessage('cheaper'));
    expect(getAgentResultsStream).toHaveBeenCalledWith('cheaper', {
      domain: 'chatbot',
      threadId: 'thread-recent',
    });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });

  it('settles messages that were mid-stream when the page was left', async () => {
    const { client } = createMockCioClient({ events: [] });
    const { store } = createMemoryPersistence([
      persisted('t1', [
        userMsg('u1', 'a'),
        aiMsg('a1', 'partial', 'streaming'),
        userMsg('u2', 'b'),
        aiMsg('a2', '', 'loading'),
      ]),
    ]);
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.messages.map((m) => m.status)).toEqual(['done', 'done', 'done', 'error']);
  });

  it('settles its own interrupted answer right away after a reload of the same tab', async () => {
    const { client } = createMockCioClient({ stream: createStartedThenPendingStream('t') });
    const { store, threads } = createMemoryPersistence();
    const first = renderWithPersistence(client, store);
    await waitFor(() => expect(first.result.current.isHydrating).toBe(false));

    act(() => first.result.current.sendMessage('hello'));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));
    const saved = store.saveThread.mock.calls[0][0];
    expect(saved.owner).toEqual(expect.any(String));
    expect(saved.messages[1].status).toBe('loading');
    first.unmount();

    threads.set('t', { ...saved, updatedAt: Date.now() });
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.messages.map((m) => m.status)).toEqual(['done', 'error']);
    expect(result.current.isStreaming).toBe(false);
  });

  it('keeps treating a fresh in-flight record from another tab as streaming', async () => {
    const { client } = createMockCioClient({ events: [] });
    const { store } = createMemoryPersistence([
      {
        ...persisted('fresh', [userMsg('u1', 'q'), aiMsg('a1', '', 'loading')]),
        updatedAt: Date.now(),
        owner: 'some-other-tab',
      },
    ]);
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.messages[1].status).toBe('loading');
    expect(result.current.isStreaming).toBe(true);
  });

  it('does not send a local thread id to the server', async () => {
    const { client, getAgentResultsStream } = createMockCioClient({ events: [] });
    const { store } = createMemoryPersistence([
      persisted('local-abc', [userMsg('u1', 'a'), aiMsg('a1', 'b')]),
    ]);
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('next'));
    expect(getAgentResultsStream).toHaveBeenCalledWith('next', { domain: 'chatbot' });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });

  it('saves the transcript under the server thread id once a turn completes', async () => {
    const { client } = createMockCioClient({
      events: [startEvent('thread-xyz'), { type: 'message', data: { text: 'Hi' } }],
    });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(2));
    const saved = store.saveThread.mock.calls[1][0];
    expect(saved.threadId).toBe('thread-xyz');
    expect(saved.version).toBe(1);
    expect(saved.messages.map((m) => [m.role, m.text, m.status])).toEqual([
      ['user', 'hello', 'done'],
      ['assistant', 'Hi', 'done'],
    ]);
    expect(saved.createdAt).toBeLessThanOrEqual(saved.updatedAt);
  });

  it('saves under a generated local id when the domain is not conversational', async () => {
    const { client } = createMockCioClient({ events: [{ type: 'message', data: { text: 'Hi' } }] });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    act(() => result.current.sendMessage('again'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    const ids = new Set(store.saveThread.mock.calls.map(([c]) => c.threadId));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(/^local-/);
    expect(store.deleteThread).not.toHaveBeenCalled();
  });

  it('keeps the local record until the re-keyed save is confirmed, then removes it', async () => {
    const { client, getAgentResultsStream } = createMockCioClient({
      events: [startEvent('srv'), { type: 'message', data: { text: 'second' } }],
    });
    getAgentResultsStream.mockReturnValueOnce(
      createEventStream([{ type: 'message', data: { text: 'first' } }]),
    );
    const { store, threads } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('one'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));
    const localId = store.saveThread.mock.calls[0][0].threadId;
    expect(localId).toMatch(/^local-/);

    store.saveThread.mockRejectedValueOnce(new Error('offline'));
    act(() => result.current.sendMessage('two'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(threads.has('srv')).toBe(true));

    await waitFor(() => expect(store.deleteThread).toHaveBeenCalledWith(localId));
    expect(store.deleteThread).toHaveBeenCalledTimes(1);
    expect(threads.has(localId)).toBe(false);
    expect(store.getThread).toHaveBeenCalledWith('srv');
  });

  it('keeps the local record when the re-keyed save silently did not land', async () => {
    const { client } = createMockCioClient({
      events: [startEvent('srv'), { type: 'message', data: { text: 'Hi' } }],
    });
    const { store } = createMemoryPersistence([
      persisted('local-old', [userMsg('u1', 'q'), aiMsg('a1', 'a')]),
    ]);
    store.saveThread.mockImplementation(async () => {});
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('next'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(2));
    await act(async () => {});

    expect(store.getThread).toHaveBeenCalledWith('srv');
    expect(store.deleteThread).not.toHaveBeenCalled();
  });

  it('saves the question under the server thread id as soon as the stream starts', async () => {
    const { client } = createMockCioClient({
      stream: createStartedThenPendingStream('thread-new'),
    });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));

    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));
    const saved = store.saveThread.mock.calls[0][0];
    expect(saved.threadId).toBe('thread-new');
    expect(saved.messages.map((m) => [m.role, m.status])).toEqual([
      ['user', 'done'],
      ['assistant', 'loading'],
    ]);
    expect(result.current.isStreaming).toBe(true);
    expect(store.deleteThread).not.toHaveBeenCalled();
  });

  it('does not write anything before the stream has started', async () => {
    const { client } = createMockCioClient({ stream: createPendingStream().stream });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await act(async () => {});

    expect(store.saveThread).not.toHaveBeenCalled();
  });

  it('saves the partial answer on pagehide while streaming', async () => {
    const { client } = createMockCioClient({ stream: createStartedThenPendingStream('t') });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(2));
    expect(store.saveThread.mock.calls[1][0].messages.map((m) => m.status)).toEqual([
      'done',
      'error',
    ]);
    expect(store.saveThread.mock.calls[1][0].updatedAt).toBeGreaterThan(
      store.saveThread.mock.calls[0][0].updatedAt,
    );

    expect(result.current.isStreaming).toBe(true);
    expect(result.current.messages[1].status).toBe('loading');
    act(() => result.current.clearHistory());
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await act(async () => {});
    expect(store.saveThread).toHaveBeenCalledTimes(2);
  });

  it('writes the settled turn synchronously on pagehide when the store can', async () => {
    const { client } = createMockCioClient({ stream: createStartedThenPendingStream('t') });
    const { store } = createMemoryPersistence();
    const saveThreadSync = jest.fn();
    const { result } = renderWithPersistence(client, { ...store, saveThreadSync });
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    // Synchronously, with no await in between: an async write cannot finish during unload.
    expect(saveThreadSync).toHaveBeenCalledTimes(1);
    expect(saveThreadSync.mock.calls[0][0].messages.map((m: ChatMessage) => m.status)).toEqual([
      'done',
      'error',
    ]);
    expect(store.saveThread).toHaveBeenCalledTimes(1);
  });

  it('saves a settled snapshot when unmounted mid-answer', async () => {
    const { client } = createMockCioClient({ stream: createStartedThenPendingStream('t') });
    const { store, threads } = createMemoryPersistence();
    const { result, unmount } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));

    unmount();
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(2));
    expect(threads.get('t')?.messages.map((m) => m.status)).toEqual(['done', 'error']);
  });

  it('mints message ids that differ between hook instances', async () => {
    const { client } = createMockCioClient({ events: [] });
    const a = renderWithPersistence(client, undefined);
    const b = renderWithPersistence(client, undefined);

    act(() => a.result.current.sendMessage('x'));
    act(() => b.result.current.sendMessage('x'));
    await waitFor(() => expect(a.result.current.isStreaming).toBe(false));
    await waitFor(() => expect(b.result.current.isStreaming).toBe(false));

    expect(a.result.current.messages[0].id).toMatch(/^msg-1-\d+-[a-z0-9]+$/);
    expect(a.result.current.messages[0].id).not.toBe(b.result.current.messages[0].id);
  });

  it('saves failed turns too, so an error is visible after reload', async () => {
    const { client } = createMockCioClient({ events: [{ type: 'server_error' }] });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));
    expect(store.saveThread.mock.calls[0][0].messages[1].status).toBe('error');
  });

  it('clearHistory deletes the stored thread and starts fresh', async () => {
    const { client, getAgentResultsStream } = createMockCioClient({
      events: [startEvent('thread-xyz')],
    });
    const { store } = createMemoryPersistence([
      persisted('thread-xyz', [userMsg('u1', 'a'), aiMsg('a1', 'b')]),
    ]);
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.clearHistory());

    expect(result.current.messages).toEqual([]);
    await waitFor(() => expect(store.deleteThread).toHaveBeenCalledWith('thread-xyz'));

    act(() => result.current.sendMessage('new'));
    expect(getAgentResultsStream).toHaveBeenCalledWith('new', { domain: 'chatbot' });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });

  it('clearHistory waits for a pending save so the deleted thread does not come back', async () => {
    const { client } = createMockCioClient({
      events: [startEvent('t'), { type: 'message', data: { text: 'Hi' } }],
    });
    const { store, threads } = createMemoryPersistence();
    let releaseSave: () => void = () => {};
    store.saveThread.mockImplementationOnce(
      (chat) =>
        new Promise<void>((resolve) => {
          releaseSave = () => {
            threads.set(chat.threadId, chat);
            resolve();
          };
        }),
    );
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));

    act(() => result.current.clearHistory());
    expect(store.deleteThread).not.toHaveBeenCalled();

    await act(async () => releaseSave());
    await waitFor(() => expect(store.deleteThread).toHaveBeenCalledWith('t'));
    expect(threads.has('t')).toBe(false);
    await waitFor(() => expect(result.current.threads).toEqual([]));
  });

  it('restores the thread named by initialThreadId instead of the latest one', async () => {
    const { client } = createMockCioClient({ events: [] });
    const { store } = createMemoryPersistence([
      persisted('latest', [userMsg('u1', 'latest q'), aiMsg('a1', 'latest a')]),
      {
        ...persisted('pinned', [userMsg('u2', 'pinned q'), aiMsg('a2', 'pinned a')]),
        updatedAt: 1,
      },
    ]);
    const { result } = renderWithPersistence(client, store, 'pinned');
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.messages[0].text).toBe('pinned q');
    expect(result.current.activeThreadId).toBe('pinned');
  });

  it('still seeds the thread id when initialThreadId has no stored transcript', async () => {
    const { client, getAgentResultsStream } = createMockCioClient({ events: [] });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store, 'thread-seed');
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.messages).toEqual([]);
    act(() => result.current.sendMessage('hello'));
    expect(getAgentResultsStream).toHaveBeenCalledWith('hello', {
      domain: 'chatbot',
      threadId: 'thread-seed',
    });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });

  it('never sends a local initialThreadId to the agent when nothing is stored for it', async () => {
    const { client, getAgentResultsStream } = createMockCioClient({ events: [] });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store, 'local-gone');
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    expect(getAgentResultsStream).toHaveBeenCalledWith('hello', { domain: 'chatbot' });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });

  it('continues message ids after the highest restored one', async () => {
    const { client } = createMockCioClient({ events: [{ type: 'message', data: { text: 'Hi' } }] });
    const { store } = createMemoryPersistence([
      persisted('t1', [
        { ...userMsg('msg-41-1', 'q'), id: 'msg-41-1' },
        { ...aiMsg('msg-42-1', 'a'), id: 'msg-42-1' },
      ]),
    ]);
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('next'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    const ids = result.current.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids[2]).toMatch(/^msg-43-/);
    expect(ids[3]).toMatch(/^msg-44-/);
  });

  it('does not overwrite a conversation the user started before a slow load finished', async () => {
    const { client } = createMockCioClient({ events: [{ type: 'message', data: { text: 'Hi' } }] });
    const { store } = createMemoryPersistence([
      persisted('t1', [userMsg('u1', 'stale'), aiMsg('a1', 'stale answer')]),
    ]);
    let release: () => void = () => {};
    store.listThreads.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve([{ threadId: 't1', title: '', createdAt: 1, updatedAt: 2, inFlight: false }]);
        }),
    );
    const { result } = renderWithPersistence(client, store);

    act(() => result.current.sendMessage('fresh'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await act(async () => release());
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.messages.map((m) => m.text)).toEqual(['fresh', 'Hi']);
    await waitFor(() =>
      expect(result.current.threads.map((t) => t.threadId)).toContain(
        result.current.activeThreadId,
      ),
    );
  });

  it('keeps a message sent while the thread list was still loading', async () => {
    const { client } = createMockCioClient({
      events: [startEvent('thread-new'), { type: 'message', data: { text: 'Hi' } }],
    });
    const { store } = createMemoryPersistence([
      persisted('old', [userMsg('u1', 'old q'), aiMsg('a1', 'old a')]),
    ]);
    let releaseList!: () => void;
    const gate = new Promise<void>((r) => {
      releaseList = r;
    });
    const listThreads = store.listThreads.getMockImplementation()!;
    store.listThreads.mockImplementationOnce(async () => {
      await gate;
      return listThreads();
    });
    const { result } = renderWithPersistence(client, store);

    act(() => result.current.sendMessage('hello'));
    expect(result.current.isHydrating).toBe(false);
    releaseList();
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    expect(result.current.messages.map((m) => m.text)).toEqual(['hello', 'Hi']);
    expect(store.getThread).not.toHaveBeenCalledWith('old');
    await waitFor(() => expect(result.current.threads.length).toBe(2));
  });

  it('starts empty when the store rejects', async () => {
    const { client } = createMockCioClient({ events: [] });
    const { store } = createMemoryPersistence();
    store.listThreads.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderWithPersistence(client, store);

    await waitFor(() => expect(result.current.isHydrating).toBe(false));
    expect(result.current.messages).toEqual([]);
  });

  it('uses window.localStorage keyed by api key and domain when persistence is true', async () => {
    window.localStorage.clear();
    const { client } = createMockCioClient({
      events: [startEvent('thread-ls'), { type: 'message', data: { text: 'Hi' } }],
    });
    (client as unknown as { options: { apiKey: string } }).options = { apiKey: 'key_test' };
    const { result } = renderWithPersistence(client, true);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() =>
      expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot')).toContain(
        'thread-ls',
      ),
    );

    const { result: reloaded } = renderWithPersistence(client, true);
    await waitFor(() => expect(reloaded.current.isHydrating).toBe(false));
    expect(reloaded.current.messages.map((m) => m.text)).toEqual(['hello', 'Hi']);
    window.localStorage.clear();
  });

  describe('thread switching', () => {
    it('exposes the stored threads and the active one', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store } = createMemoryPersistence([
        persisted('latest', [userMsg('u1', 'latest q'), aiMsg('a1', 'latest a')]),
        { ...persisted('older', [userMsg('u2', 'older q'), aiMsg('a2', 'older a')]), updatedAt: 1 },
      ]);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      expect(result.current.threads.map((t) => t.threadId)).toEqual(['latest', 'older']);
      expect(result.current.activeThreadId).toBe('latest');
    });

    it('switchThread loads another stored conversation and continues its server thread', async () => {
      const { client, getAgentResultsStream } = createMockCioClient({ events: [] });
      const { store } = createMemoryPersistence([
        persisted('latest', [userMsg('u1', 'latest q'), aiMsg('a1', 'latest a')]),
        { ...persisted('older', [userMsg('u2', 'older q'), aiMsg('a2', 'older a')]), updatedAt: 1 },
      ]);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      await act(() => result.current.switchThread('older'));

      expect(result.current.isHydrating).toBe(false);
      expect(result.current.activeThreadId).toBe('older');
      expect(result.current.messages.map((m) => m.text)).toEqual(['older q', 'older a']);
      expect(store.deleteThread).not.toHaveBeenCalled();

      act(() => result.current.sendMessage('more'));
      expect(getAgentResultsStream).toHaveBeenCalledWith('more', {
        domain: 'chatbot',
        threadId: 'older',
      });
      await waitFor(() => expect(result.current.isStreaming).toBe(false));
    });

    it('switchThread to an unknown id leaves an empty conversation', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store } = createMemoryPersistence([
        persisted('latest', [userMsg('u1', 'latest q'), aiMsg('a1', 'latest a')]),
      ]);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      await act(() => result.current.switchThread('missing'));

      expect(result.current.messages).toEqual([]);
      expect(result.current.activeThreadId).toBeNull();
      expect(result.current.isHydrating).toBe(false);
    });

    it('does not let a pending switchThread load land on a turn sent meanwhile', async () => {
      const { client } = createMockCioClient({
        events: [startEvent('fresh'), { type: 'message', data: { text: 'Hi' } }],
      });
      const other = persisted('other', [userMsg('u1', 'other q'), aiMsg('a1', 'other a')]);
      const { store } = createMemoryPersistence([other]);
      let release: () => void = () => {};
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));
      act(() => result.current.newThread());

      store.getThread.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve(other);
          }),
      );
      let switching: Promise<void>;
      act(() => {
        switching = result.current.switchThread('other');
      });
      expect(result.current.isHydrating).toBe(true);

      act(() => result.current.sendMessage('mine'));
      expect(result.current.isHydrating).toBe(false);
      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      await act(async () => {
        release();
        await switching;
      });
      expect(result.current.messages.map((m) => m.text)).toEqual(['mine', 'Hi']);
      expect(result.current.activeThreadId).toBe('fresh');
    });

    it('newThread keeps the current conversation in storage and lists both afterwards', async () => {
      const { client, getAgentResultsStream } = createMockCioClient({
        events: [startEvent('thread-2'), { type: 'message', data: { text: 'second' } }],
      });
      const { store } = createMemoryPersistence([
        persisted('thread-1', [userMsg('u1', 'first q'), aiMsg('a1', 'first a')]),
      ]);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      act(() => result.current.newThread());
      expect(result.current.messages).toEqual([]);
      expect(result.current.activeThreadId).toBeNull();
      expect(store.deleteThread).not.toHaveBeenCalled();

      act(() => result.current.sendMessage('new q'));
      expect(getAgentResultsStream).toHaveBeenCalledWith('new q', { domain: 'chatbot' });
      await waitFor(() => expect(result.current.activeThreadId).toBe('thread-2'));
      await waitFor(() =>
        expect(result.current.threads.map((t) => t.threadId).sort()).toEqual([
          'thread-1',
          'thread-2',
        ]),
      );
    });

    it('newThread mid-answer keeps the interrupted turn in storage as settled', async () => {
      const { client } = createMockCioClient({ stream: createStartedThenPendingStream('t') });
      const { store } = createMemoryPersistence();
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      act(() => result.current.sendMessage('hello'));
      await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));

      act(() => result.current.newThread());
      expect(result.current.messages).toEqual([]);
      expect(result.current.isStreaming).toBe(false);
      await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(2));
      const saved = store.saveThread.mock.calls[1][0];
      expect(saved.threadId).toBe('t');
      expect(saved.messages.map((m) => m.status)).toEqual(['done', 'error']);
      await waitFor(() => expect(result.current.threads.map((t) => t.inFlight)).toEqual([false]));
    });

    it('switchThread mid-answer keeps the interrupted turn in storage as settled', async () => {
      const { client } = createMockCioClient({ stream: createStartedThenPendingStream('t') });
      const { store } = createMemoryPersistence([
        persisted('other', [userMsg('u1', 'other q'), aiMsg('a1', 'other a')]),
      ]);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));
      act(() => result.current.newThread());

      act(() => result.current.sendMessage('hello'));
      await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));

      await act(() => result.current.switchThread('other'));
      expect(result.current.messages[0].text).toBe('other q');
      expect(result.current.isStreaming).toBe(false);
      expect(store.saveThread).toHaveBeenCalledTimes(2);
      const saved = store.saveThread.mock.calls[1][0];
      expect(saved.threadId).toBe('t');
      expect(saved.messages.map((m) => m.status)).toEqual(['done', 'error']);
    });

    it('newThread and switchThread are safe without persistence', async () => {
      const { client } = createMockCioClient({
        events: [startEvent('t'), { type: 'message', data: { text: 'Hi' } }],
      });
      const { result } = renderWithPersistence(client, undefined);
      act(() => result.current.sendMessage('hello'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      act(() => result.current.newThread());
      expect(result.current.messages).toHaveLength(2);
      await act(() => result.current.switchThread('anything'));

      expect(result.current.threads).toEqual([]);
      expect(result.current.activeThreadId).toBeNull();
      expect(result.current.isHydrating).toBe(false);
    });
  });

  describe('cross-tab sync', () => {
    const seed = () => [
      persisted('active', [userMsg('u1', 'active q'), aiMsg('a1', 'active a')]),
      { ...persisted('other', [userMsg('u2', 'other q'), aiMsg('a2', 'other a')]), updatedAt: 1 },
    ];

    it('empties the conversation when the active thread is deleted elsewhere', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence(seed(), true);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('active'));

      threads.delete('active');
      await act(async () => notify());

      await waitFor(() => expect(result.current.messages).toEqual([]));
      expect(result.current.activeThreadId).toBeNull();
      expect(result.current.threads.map((t) => t.threadId)).toEqual(['other']);
    });

    it('keeps the conversation when the active thread was evicted, not deleted', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence(seed(), true);
      const isThreadDeleted = jest.fn(async () => false);
      const { result } = renderWithPersistence(client, { ...store, isThreadDeleted });
      await waitFor(() => expect(result.current.activeThreadId).toBe('active'));

      threads.delete('active');
      await act(async () => notify());

      expect(isThreadDeleted).toHaveBeenCalledWith('active');
      expect(result.current.messages.map((m) => m.text)).toEqual(['active q', 'active a']);
      expect(result.current.activeThreadId).toBe('active');
      // Not written back right away: that would evict the other tab's thread in turn.
      expect(store.saveThread).not.toHaveBeenCalled();
      // The next settled save brings it back.
      act(() => {
        window.dispatchEvent(new Event('pagehide'));
      });
      await waitFor(() => expect(threads.has('active')).toBe(true));
    });

    it('picks up turns added to the active thread by another tab', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence(seed(), true);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('active'));

      threads.set('active', {
        ...persisted('active', [
          userMsg('u1', 'active q'),
          aiMsg('a1', 'active a'),
          userMsg('u3', 'from tab B'),
          aiMsg('a3', 'answer B'),
        ]),
        updatedAt: Date.now(),
      });
      await act(async () => notify());

      await waitFor(() =>
        expect(result.current.messages.map((m) => m.text)).toEqual([
          'active q',
          'active a',
          'from tab B',
          'answer B',
        ]),
      );
    });

    it('mirrors a turn started in another tab as typing, then as the answer', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence(seed(), true);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('active'));

      const inFlight = [
        userMsg('u1', 'active q'),
        aiMsg('a1', 'active a'),
        userMsg('u3', 'from tab B'),
        aiMsg('a3', '', 'loading'),
      ];
      threads.set('active', { ...persisted('active', inFlight), updatedAt: Date.now() });
      await act(async () => notify());
      await waitFor(() => expect(result.current.messages).toHaveLength(4));
      expect(result.current.messages[3].status).toBe('loading');
      expect(result.current.isStreaming).toBe(true);

      threads.set('active', {
        ...persisted('active', [...inFlight.slice(0, 3), aiMsg('a3', 'answer B')]),
        updatedAt: Date.now() + 1,
      });
      await act(async () => notify());
      await waitFor(() => expect(result.current.messages[3].text).toBe('answer B'));
      expect(result.current.messages.every((m) => m.status === 'done')).toBe(true);
      expect(result.current.isStreaming).toBe(false);
    });

    it('mirrors a failed turn from another tab', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence(seed(), true);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('active'));

      threads.set('active', {
        ...persisted('active', [
          userMsg('u1', 'active q'),
          aiMsg('a1', 'active a'),
          userMsg('u3', 'from tab B'),
          aiMsg('a3', '', 'error'),
        ]),
        updatedAt: Date.now(),
      });
      await act(async () => notify());
      await waitFor(() => expect(result.current.messages).toHaveLength(4));
      expect(result.current.messages[3].status).toBe('error');
    });

    it('shows a chat still streaming in another tab as typing, then applies the answer', async () => {
      const { client } = createMockCioClient({ events: [] });
      const inFlight = [userMsg('u1', 'new q'), aiMsg('a1', '', 'loading')];
      const { store, threads, notify } = createMemoryPersistence(
        [{ ...persisted('fresh', inFlight), updatedAt: Date.now() }],
        true,
      );
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      expect(result.current.messages.map((m) => m.status)).toEqual(['done', 'loading']);

      threads.set('fresh', {
        ...persisted('fresh', [inFlight[0], aiMsg('a1', 'the answer')]),
        updatedAt: Date.now() + 1,
      });
      await act(async () => notify());
      await waitFor(() => expect(result.current.messages[1].text).toBe('the answer'));
      expect(result.current.messages[1].status).toBe('done');
    });

    it('treats an old in-flight snapshot as a failed answer', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store } = createMemoryPersistence([
        {
          ...persisted('stale', [userMsg('u1', 'q'), aiMsg('a1', '', 'loading')]),
          updatedAt: Date.now() - 5 * 60 * 1000,
        },
      ]);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      expect(result.current.messages[1].status).toBe('error');
    });

    it('gives up on a foreign in-flight answer after the grace period', async () => {
      jest.useFakeTimers();
      try {
        const { client } = createMockCioClient({ events: [] });
        const { store } = createMemoryPersistence([
          {
            ...persisted('fresh', [userMsg('u1', 'q'), aiMsg('a1', '', 'loading')]),
            updatedAt: Date.now(),
          },
        ]);
        const { result } = renderWithPersistence(client, store);
        await waitFor(() => expect(result.current.isHydrating).toBe(false));
        expect(result.current.messages[1].status).toBe('loading');

        expect(result.current.isStreaming).toBe(true);
        expect(store.saveThread).not.toHaveBeenCalled();

        act(() => {
          jest.advanceTimersByTime(61 * 1000);
        });
        expect(result.current.messages[1].status).toBe('error');
        expect(result.current.isStreaming).toBe(false);

        await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));
        expect(store.saveThread.mock.calls[0][0].messages[1].status).toBe('error');
      } finally {
        jest.useRealTimers();
      }
    });

    it('refuses to send while the thread is streaming in another tab', async () => {
      const { client, getAgentResultsStream } = createMockCioClient({ events: [] });
      const { store } = createMemoryPersistence([
        {
          ...persisted('fresh', [userMsg('u1', 'q'), aiMsg('a1', '', 'loading')]),
          updatedAt: Date.now(),
        },
      ]);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));
      expect(result.current.isStreaming).toBe(true);

      act(() => result.current.sendMessage('mine'));

      expect(getAgentResultsStream).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(2);
    });

    it('writes a stale in-flight snapshot back as settled so the list stops reporting it', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store } = createMemoryPersistence([
        {
          ...persisted('stale', [userMsg('u1', 'q'), aiMsg('a1', '', 'loading')]),
          updatedAt: Date.now() - 5 * 60 * 1000,
        },
      ]);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));
      expect(store.saveThread.mock.calls[0][0].messages[1].status).toBe('error');
      await waitFor(() => expect(result.current.threads[0].inFlight).toBe(false));
    });

    it('lists a chat created in another tab right away, flagged as in flight', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence(seed(), true);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('active'));

      threads.set('brand-new', {
        ...persisted('brand-new', [userMsg('u9', 'new q'), aiMsg('a9', '', 'loading')]),
        updatedAt: Date.now(),
      });
      await act(async () => notify());
      await waitFor(() => expect(result.current.threads).toHaveLength(3));
      expect(result.current.threads[0]).toMatchObject({ threadId: 'brand-new', inFlight: true });

      threads.set('brand-new', {
        ...persisted('brand-new', [userMsg('u9', 'new q'), aiMsg('a9', 'new a')]),
        updatedAt: Date.now() + 1,
      });
      await act(async () => notify());
      await waitFor(() => expect(result.current.threads[0].inFlight).toBe(false));
    });

    it('lists its own new chat immediately in the tab that created it', async () => {
      const { client } = createMockCioClient({ stream: createStartedThenPendingStream('t') });
      const { store } = createMemoryPersistence();
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      act(() => result.current.sendMessage('hello'));

      await waitFor(() => expect(result.current.threads).toHaveLength(1));
      expect(result.current.threads[0].inFlight).toBe(true);
      expect(result.current.threads[0].threadId).toBe(result.current.activeThreadId);
    });

    it('follows a thread that another tab re-keyed from a local id to the server id', async () => {
      const { client } = createMockCioClient({ events: [] });
      const shared = [userMsg('u1', 'new q'), aiMsg('a1', '', 'loading')];
      const { store, threads, notify } = createMemoryPersistence(
        [{ ...persisted('local-tmp', shared), updatedAt: Date.now() }],
        true,
      );
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('local-tmp'));

      threads.delete('local-tmp');
      threads.set('thread-srv', {
        ...persisted('thread-srv', [shared[0], aiMsg('a1', 'the answer')]),
        updatedAt: Date.now() + 1,
      });
      await act(async () => notify());

      await waitFor(() => expect(result.current.activeThreadId).toBe('thread-srv'));
      expect(result.current.messages.map((m) => m.text)).toEqual(['new q', 'the answer']);
    });

    it('only refreshes the list when an unrelated thread changes', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence(seed(), true);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('active'));
      const before = result.current.messages;

      threads.set('new', persisted('new', [userMsg('u9', 'new q'), aiMsg('a9', 'new a')]));
      await act(async () => notify());

      await waitFor(() => expect(result.current.threads).toHaveLength(3));
      expect(result.current.messages).toBe(before);
    });

    it('does not replace an in-flight conversation', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence(seed(), true);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('active'));

      act(() => result.current.sendMessage('mine'));
      threads.set('active', {
        ...persisted('active', [userMsg('u1', 'active q'), aiMsg('a1', 'active a')]),
        updatedAt: Date.now() + 1000,
      });
      await act(async () => notify());
      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      expect(result.current.messages.map((m) => m.text)).toContain('mine');
    });

    it('only refreshes the list when nothing is on screen yet', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store, threads, notify } = createMemoryPersistence([], true);
      const { result } = renderWithPersistence(client, store);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      threads.set('t', persisted('t', [userMsg('u1', 'elsewhere'), aiMsg('a1', 'answer')]));
      act(() => notify());

      await waitFor(() => expect(result.current.threads.map((t) => t.threadId)).toEqual(['t']));
      expect(result.current.messages).toEqual([]);
      expect(store.getThread).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store } = createMemoryPersistence(seed(), true);
      const unsubscribe = jest.fn();
      (store.subscribe as jest.Mock).mockReturnValue(unsubscribe);
      const { unmount } = renderWithPersistence(client, store);
      await waitFor(() => expect(store.subscribe).toHaveBeenCalled());

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('store changes (e.g. a login change)', () => {
    function renderSwitchable(
      client: ConstructorIOClient,
      initial: ChatPersistence | boolean | undefined,
    ) {
      let current = initial;
      const hook = renderHook(() => useAsaResults(), {
        wrapper: ({ children }) => (
          <Wrapper cioClient={client} persistence={current}>
            {children}
          </Wrapper>
        ),
      });
      return {
        ...hook,
        switchTo(next: ChatPersistence | boolean | undefined) {
          current = next;
          hook.rerender();
        },
      };
    }

    it('re-hydrates from a new store and leaves the old conversation behind', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store: storeA } = createMemoryPersistence(
        [persisted('a', [userMsg('u1', 'from A'), aiMsg('a1', 'answer A')])],
        true,
      );
      const { store: storeB } = createMemoryPersistence(
        [persisted('b', [userMsg('u2', 'from B'), aiMsg('a2', 'answer B')])],
        true,
      );
      const { result, switchTo } = renderSwitchable(client, storeA);
      await waitFor(() => expect(result.current.messages[0]?.text).toBe('from A'));

      switchTo(storeB);

      await waitFor(() => expect(result.current.messages[0]?.text).toBe('from B'));
      expect(result.current.activeThreadId).toBe('b');
      expect(result.current.threads.map((t) => t.threadId)).toEqual(['b']);
      expect(storeB.saveThread).not.toHaveBeenCalled();
      expect(storeB.subscribe).toHaveBeenCalled();
    });

    it('saves new turns into the new store only', async () => {
      const { client } = createMockCioClient({
        events: [startEvent('thread-new'), { type: 'message', data: { text: 'Hi' } }],
      });
      const { store: storeA } = createMemoryPersistence([
        persisted('a', [userMsg('u1', 'from A'), aiMsg('a1', 'answer A')]),
      ]);
      const { store: storeB } = createMemoryPersistence();
      const { result, switchTo } = renderSwitchable(client, storeA);
      await waitFor(() => expect(result.current.activeThreadId).toBe('a'));

      switchTo(storeB);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));
      expect(result.current.messages).toEqual([]);

      act(() => result.current.sendMessage('hello'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));
      await waitFor(() => expect(storeB.saveThread).toHaveBeenCalled());

      expect(storeA.saveThread).not.toHaveBeenCalled();
      expect(storeB.saveThread.mock.calls[0][0].messages[0].text).toBe('hello');
    });

    it('does not let a slow save into the old store delay or leak into the new one', async () => {
      const { client } = createMockCioClient({
        events: [startEvent('thread-new'), { type: 'message', data: { text: 'Hi' } }],
      });
      const { store: storeA } = createMemoryPersistence();
      storeA.saveThread.mockImplementation(() => new Promise<never>(() => {}));
      const { store: storeB } = createMemoryPersistence();
      const { result, switchTo } = renderSwitchable(client, storeA);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      act(() => result.current.sendMessage('into A'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));
      expect(storeA.saveThread).toHaveBeenCalledTimes(1);

      switchTo(storeB);
      expect(result.current.messages).toEqual([]);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      act(() => result.current.sendMessage('into B'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));
      await waitFor(() => expect(storeB.saveThread).toHaveBeenCalled());
      expect(storeB.saveThread.mock.calls[0][0].messages[0].text).toBe('into B');
      expect(storeA.saveThread).toHaveBeenCalledTimes(1);
    });

    it('does not carry a leftover from a save that finished after the store switch', async () => {
      const { client, getAgentResultsStream } = createMockCioClient({
        events: [startEvent('srv'), { type: 'message', data: { text: 'Hi' } }],
      });
      getAgentResultsStream.mockReturnValueOnce(
        createEventStream([{ type: 'message', data: { text: 'Hi' } }]),
      );
      const { store: storeA } = createMemoryPersistence();
      const { store: storeB } = createMemoryPersistence();
      const { result, switchTo } = renderSwitchable(client, storeA);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));

      act(() => result.current.sendMessage('no thread yet'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));
      await waitFor(() => expect(storeA.saveThread).toHaveBeenCalledTimes(1));
      expect(storeA.saveThread.mock.calls[0][0].threadId).toMatch(/^local-/);

      let release!: () => void;
      const slow = new Promise<void>((r) => {
        release = r;
      });
      storeA.saveThread.mockImplementation(() => slow);
      act(() => result.current.sendMessage('now on the server'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));
      expect(storeA.saveThread.mock.calls[1][0].threadId).toBe('srv');

      switchTo(storeB);
      await waitFor(() => expect(result.current.isHydrating).toBe(false));
      await act(async () => {
        release();
        await slow;
      });

      act(() => result.current.sendMessage('into B'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));
      await waitFor(() => expect(storeB.saveThread).toHaveBeenCalled());
      await act(async () => {});

      expect(storeB.deleteThread).not.toHaveBeenCalled();
    });

    it('clears the restored conversation when persistence is turned off', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { store } = createMemoryPersistence([
        persisted('a', [userMsg('u1', 'from A'), aiMsg('a1', 'answer A')]),
      ]);
      const { result, switchTo } = renderSwitchable(client, store);
      await waitFor(() => expect(result.current.activeThreadId).toBe('a'));

      switchTo(undefined);

      await waitFor(() => expect(result.current.messages).toEqual([]));
      expect(result.current.isHydrating).toBe(false);
      expect(result.current.threads).toEqual([]);
      expect(result.current.activeThreadId).toBeNull();
    });
  });

  it('starts a separate history on login and returns to the anonymous one on logout', async () => {
    window.localStorage.clear();
    const events: StreamEvent[] = [
      startEvent('thread-x'),
      { type: 'message', data: { text: 'Hi' } },
    ];
    const clientFor = (userId?: string) => {
      const { client } = createMockCioClient({ events });
      (client as unknown as { options: object }).options = { apiKey: 'key_test', userId };
      return client;
    };
    let client = clientFor();
    const hook = renderHook(() => useAsaResults(), {
      wrapper: ({ children }) => (
        <CioAsaProvider
          cioClient={client}
          staticRequestConfigs={{ domain: 'chatbot' }}
          persistConversation>
          {children}
        </CioAsaProvider>
      ),
    });
    await waitFor(() => expect(hook.result.current.isHydrating).toBe(false));
    act(() => hook.result.current.sendMessage('as guest'));
    await waitFor(() => expect(hook.result.current.isStreaming).toBe(false));
    await waitFor(() =>
      expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot')).toContain('as guest'),
    );

    client = clientFor('user-1');
    hook.rerender();
    await waitFor(() => expect(hook.result.current.isHydrating).toBe(false));
    expect(hook.result.current.messages).toEqual([]);
    act(() => hook.result.current.sendMessage('as user'));
    await waitFor(() => expect(hook.result.current.isStreaming).toBe(false));
    await waitFor(() =>
      expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot:user-1')).toContain(
        'as user',
      ),
    );
    expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot')).not.toContain(
      'as user',
    );

    client = clientFor();
    hook.rerender();
    await waitFor(() =>
      expect(hook.result.current.messages.map((m) => m.text)).toEqual(['as guest', 'Hi']),
    );
    window.localStorage.clear();
  });

  it('forgets the conversation on screen when clearPersistedConversations runs in this tab', async () => {
    window.localStorage.clear();
    const { client } = createMockCioClient({
      events: [startEvent('thread-c'), { type: 'message', data: { text: 'Hi' } }],
    });
    (client as unknown as { options: object }).options = { apiKey: 'key_test' };
    const { result } = renderHook(() => useAsaResults(), {
      wrapper: ({ children }) => (
        <CioAsaProvider
          cioClient={client}
          staticRequestConfigs={{ domain: 'chatbot' }}
          userId='user-c'
          persistConversation>
          {children}
        </CioAsaProvider>
      ),
    });
    await waitFor(() => expect(result.current.isHydrating).toBe(false));
    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() =>
      expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot:user-c')).toContain(
        'thread-c',
      ),
    );

    act(() => clearPersistedConversations({ apiKey: 'key_test', userId: 'user-c' }));

    expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot:user-c')).toBeNull();
    await waitFor(() => expect(result.current.messages).toEqual([]));
    expect(result.current.threads).toEqual([]);
    expect(result.current.activeThreadId).toBeNull();
  });

  it('escapes namespace parts so ids containing the separator cannot collide', async () => {
    window.localStorage.clear();
    const { client } = createMockCioClient({
      events: [startEvent('thread-esc'), { type: 'message', data: { text: 'Hi' } }],
    });
    (client as unknown as { options: object }).options = { apiKey: 'key_test', userId: 'a:b' };
    const { result } = renderWithPersistence(client, true);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() =>
      expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot:a%3Ab')).toContain(
        'thread-esc',
      ),
    );
    expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot:a:b')).toBeNull();
    window.localStorage.clear();
  });

  it('scopes the built-in storage key by a numeric user id of 0 too', async () => {
    window.localStorage.clear();
    const { client } = createMockCioClient({
      events: [startEvent('thread-z'), { type: 'message', data: { text: 'Hi' } }],
    });
    (client as unknown as { options: Record<string, unknown> }).options = {
      apiKey: 'key_test',
      userId: 0,
    };
    const { result } = renderWithPersistence(client, true);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() =>
      expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot:0')).toContain(
        'thread-z',
      ),
    );
    expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot')).toBeNull();
    window.localStorage.clear();
  });

  it('scopes the built-in storage key by user id when the client has one', async () => {
    window.localStorage.clear();
    const { client } = createMockCioClient({
      events: [startEvent('thread-u'), { type: 'message', data: { text: 'Hi' } }],
    });
    (client as unknown as { options: Record<string, unknown> }).options = {
      apiKey: 'key_test',
      userId: 'user-42',
    };
    const { result } = renderWithPersistence(client, true);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() =>
      expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot:user-42')).toContain(
        'thread-u',
      ),
    );
    expect(window.localStorage.getItem('cio-asa:chat:v1:key_test:chatbot')).toBeNull();
    window.localStorage.clear();
  });
});
