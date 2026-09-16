import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import useAsaResults from '../../src/hooks/useAsaResults';
import CioAsaProvider from '../../src/components/CioAsaProvider/CioAsaProvider';
import {
  createMockCioClient,
  createPendingStream,
  StreamEvent,
} from '../local_examples/mockCioClient';
import type { ChatMessage, ChatPersistence, PersistedChat } from '../../src/types';

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

function renderWithPersistence(
  cioClient: ConstructorIOClient,
  persistence: ChatPersistence | boolean | undefined,
  initialThreadId?: string,
) {
  return renderHook(() => useAsaResults({ initialThreadId }), {
    wrapper: ({ children }) => (
      <CioAsaProvider
        cioClient={cioClient}
        staticRequestConfigs={{ domain: 'chatbot' }}
        persistence={persistence}>
        {children}
      </CioAsaProvider>
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

    expect(result.current.isStreaming).toBe(true);
    act(() => result.current.clearHistory());
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await act(async () => {});
    expect(store.saveThread).toHaveBeenCalledTimes(2);
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

  it('starts empty when the adapter rejects', async () => {
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

    it('newThread and switchThread are safe without persistence', async () => {
      const { client } = createMockCioClient({ events: [] });
      const { result } = renderWithPersistence(client, undefined);

      act(() => result.current.newThread());
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
});
