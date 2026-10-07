import { waitFor } from '@testing-library/react';
import {
  continueInBackground,
  moveBackgroundTurns,
  resumeBackgroundTurn,
} from '../../../src/hooks/persistence/backgroundTurns';
import type { LiveTurn, TurnOwner } from '../../../src/hooks/agentStream';
import { createChatSession } from '../../../src/utils/chatSession';
import type { AbortRequest, ChatMessage, ChatPersistence, PersistedChat } from '../../../src/types';

function memoryStore() {
  const threads = new Map<string, PersistedChat>();
  const listeners = new Set<(request: AbortRequest) => void>();
  const store: ChatPersistence = {
    listThreads: async () => [],
    getThread: async (id) => threads.get(id) ?? null,
    saveThread: async (chat) => {
      threads.set(chat.threadId, chat);
    },
    deleteThread: async (id) => {
      threads.delete(id);
    },
    requestAbort: () => {},
    subscribeAbort: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const abortFromOtherTab = (messageId: string) =>
    listeners.forEach((listener) => listener({ threadId: 't', messageId }));
  return { store, threads, listeners, abortFromOtherTab };
}

function streamingTurn() {
  const assistant: ChatMessage = { id: 'a1', role: 'assistant', text: '', status: 'loading' };
  const turn = {
    assistantId: 'a1',
    assistant,
    cancel: jest.fn(),
    done: new Promise<void>(() => {}),
  } as unknown as LiveTurn;
  const session = createChatSession('t');
  session.storageThreadId = 't';
  const messages: ChatMessage[] = [
    { id: 'u1', role: 'user', text: 'q', status: 'done' },
    assistant,
  ];
  return { turn, session, messages };
}

describe('background turns stopped from another tab', () => {
  it('follows the turn into the store it moved to on login', async () => {
    const guest = memoryStore();
    const shopper = memoryStore();
    const { turn, session, messages } = streamingTurn();
    continueInBackground(turn, { store: guest.store, session, messages, after: Promise.resolve() });

    await moveBackgroundTurns(guest.store, shopper.store);

    expect(guest.listeners.size).toBe(0);
    shopper.abortFromOtherTab('a1');
    expect(turn.cancel).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(shopper.threads.get('t')?.messages.map((m) => m.id)).toEqual(['u1']),
    );
    expect(shopper.listeners.size).toBe(0);
  });

  it('leaves the turn alone once a chat has taken it back', () => {
    const { store, listeners, abortFromOtherTab } = memoryStore();
    const { turn, session, messages } = streamingTurn();
    continueInBackground(turn, { store, session, messages, after: Promise.resolve() });
    expect(listeners.size).toBe(1);

    const owner: TurnOwner = { setMessages: jest.fn(), onStart: jest.fn(), onDone: jest.fn() };
    expect(resumeBackgroundTurn(store, 't', () => owner)).not.toBeNull();

    // The chat now showing it answers the request itself; a second handler would cancel twice.
    expect(listeners.size).toBe(0);
    abortFromOtherTab('a1');
    expect(turn.cancel).not.toHaveBeenCalled();
  });
});
