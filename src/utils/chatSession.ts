import { ChatMessage, PersistedChat } from '../types';
import {
  PERSISTED_CHAT_VERSION,
  createLocalThreadId,
  getTabId,
  isLocalThreadId,
  nextMessageCounter,
  randomId,
} from './chatThreads';

/** Conversation state that async work must always see current; one object so a reset is one call. */
export interface ChatSession {
  /** Server thread id, sent with the next request. Never a `local-` id. */
  serverThreadId: string | null;
  /** Id the conversation is stored under: the server id, or a `local-` one before it exists. */
  storageThreadId: string | null;
  /** Local ids whose re-keyed replacement could not be verified yet; deleted on a later save. */
  orphanIds: string[];
  createdAt: number | null;
  /** `updatedAt` of the last snapshot written or applied; newer stored records win over it. */
  lastSyncedAt: number;
  /** There are changes since the last write. */
  dirty: boolean;
  /** The user acted; a load that was still running must not overwrite the result. */
  interacted: boolean;
  /** Bumped to invalidate loads started before the conversation changed. */
  loadRequest: number;
  isStreaming: boolean;
  /** The thread is streaming in another tab; sending is blocked meanwhile. */
  foreignInFlight: boolean;
  idCounter: number;
  /** Per-instance suffix so two tabs cannot mint the same message id in the same millisecond. */
  idSuffix: string;
}

export function createChatSession(initialThreadId?: string): ChatSession {
  // Claimed at once, before a duplicate of this tab could copy it.
  getTabId();
  return {
    serverThreadId: initialThreadId && !isLocalThreadId(initialThreadId) ? initialThreadId : null,
    storageThreadId: null,
    orphanIds: [],
    createdAt: null,
    lastSyncedAt: 0,
    dirty: false,
    interacted: false,
    loadRequest: 0,
    isStreaming: false,
    foreignInFlight: false,
    idCounter: 0,
    idSuffix: randomId().slice(0, 6),
  };
}

/** Forget the current conversation. Returns the id it was stored under, if any. */
export function resetConversation(session: ChatSession): string | null {
  const storedId = session.storageThreadId;
  session.serverThreadId = null;
  session.storageThreadId = null;
  session.orphanIds = [];
  session.createdAt = null;
  session.lastSyncedAt = 0;
  session.dirty = false;
  session.loadRequest += 1;
  session.isStreaming = false;
  session.foreignInFlight = false;
  return storedId;
}

export function nextMessageId(session: ChatSession): string {
  session.idCounter += 1;
  return `msg-${session.idCounter}-${Date.now()}-${session.idSuffix}`;
}

/** Makes a stored conversation the one this session continues. */
export function adoptStoredChat(session: ChatSession, chat: PersistedChat): void {
  session.storageThreadId = chat.threadId;
  session.createdAt = chat.createdAt;
  session.serverThreadId = isLocalThreadId(chat.threadId) ? null : chat.threadId;
  session.idCounter = nextMessageCounter(chat.messages);
  session.lastSyncedAt = chat.updatedAt;
}

/** Builds the record to write and moves the session onto its key; `staleIds` are the records to retire once stored. */
export function prepareSnapshot(
  session: ChatSession,
  messages: ChatMessage[],
  now = Date.now(),
): { snapshot: PersistedChat; staleIds: string[] } {
  const previousId = session.storageThreadId;
  const threadId = session.serverThreadId ?? previousId ?? createLocalThreadId();
  const staleIds = [previousId !== threadId ? previousId : null, ...session.orphanIds].filter(
    (id): id is string => id !== null && id !== threadId,
  );
  // Strictly increasing so other tabs read a same-millisecond save as newer.
  const updatedAt = Math.max(now, session.lastSyncedAt + 1);
  const createdAt = session.createdAt ?? updatedAt;
  session.storageThreadId = threadId;
  session.orphanIds = [];
  session.createdAt = createdAt;
  session.lastSyncedAt = updatedAt;
  return {
    staleIds: Array.from(new Set(staleIds)),
    snapshot: {
      version: PERSISTED_CHAT_VERSION,
      threadId,
      messages,
      createdAt,
      updatedAt,
      owner: getTabId(),
    },
  };
}
