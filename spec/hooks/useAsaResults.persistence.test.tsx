import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import useAsaResults from '../../src/hooks/useAsaResults';
import CioAsaProvider from '../../src/components/CioAsaProvider/CioAsaProvider';
import { createMockCioClient, StreamEvent } from '../local_examples/mockCioClient';
import type { ChatMessage, ChatPersistence, PersistedChat } from '../../src/types';

function createMemoryPersistence(initial: PersistedChat[] = []) {
  const threads = new Map(initial.map((t) => [t.threadId, t]));
  const store: jest.Mocked<ChatPersistence> = {
    listThreads: jest.fn(async () =>
      Array.from(threads.values())
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(({ threadId, createdAt, updatedAt }) => ({
          threadId,
          title: '',
          createdAt,
          updatedAt,
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
  return { store, threads };
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
    expect(store.saveThread).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));
    const saved = store.saveThread.mock.calls[0][0];
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
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(1));
    expect(store.saveThread.mock.calls[0][0].threadId).toMatch(/^local-/);

    act(() => result.current.sendMessage('again'));
    await waitFor(() => expect(store.saveThread).toHaveBeenCalledTimes(2));
    expect(store.saveThread.mock.calls[1][0].threadId).toBe(
      store.saveThread.mock.calls[0][0].threadId,
    );
    expect(store.deleteThread).not.toHaveBeenCalled();
  });

  it('saves failed turns too, so an error is visible after reload', async () => {
    const { client } = createMockCioClient({ events: [{ type: 'server_error' }] });
    const { store } = createMemoryPersistence();
    const { result } = renderWithPersistence(client, store);
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    act(() => result.current.sendMessage('hello'));
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

    expect(store.listThreads).not.toHaveBeenCalled();
    expect(result.current.messages[0].text).toBe('pinned q');
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

  it('does not overwrite a conversation the user started before a slow load finished', async () => {
    const { client } = createMockCioClient({ events: [{ type: 'message', data: { text: 'Hi' } }] });
    const { store } = createMemoryPersistence([
      persisted('t1', [userMsg('u1', 'stale'), aiMsg('a1', 'stale answer')]),
    ]);
    let release: () => void = () => {};
    store.listThreads.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve([{ threadId: 't1', title: '', createdAt: 1, updatedAt: 2 }]);
        }),
    );
    const { result } = renderWithPersistence(client, store);

    act(() => result.current.sendMessage('fresh'));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await act(async () => release());
    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.messages.map((m) => m.text)).toEqual(['fresh', 'Hi']);
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
});
