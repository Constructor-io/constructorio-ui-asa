import type {
  ChatMessage,
  ChatPersistence,
  LocalStoragePersistenceOptions,
  PersistedChat,
  ThreadSummary,
} from '../types';
import {
  DEFAULT_PERSISTENCE_KEY,
  DEFAULT_PERSISTENCE_TTL_MS,
  PERSISTED_CHAT_VERSION,
  getThreadTitle,
  isInFlight,
  mergeMessages,
} from './chatThreads';
import isPersistedChat from './chatRecordValidation';

/** The shape stored under one key: every thread of a namespace, plus tombstones for deleted ones. */
interface StoredThreads {
  version: typeof PERSISTED_CHAT_VERSION;
  threads: Record<string, PersistedChat>;
  deleted?: Record<string, number>;
}

/** Keeps the last `maxTurns` user/assistant pairs, always starting on a user message. */
function trimToTurns(messages: ChatMessage[], maxTurns: number): ChatMessage[] {
  if (maxTurns <= 0) return [];
  let trimmed = Number.isFinite(maxTurns) ? messages.slice(-maxTurns * 2) : messages;
  while (trimmed.length && trimmed[0].role !== 'user') trimmed = trimmed.slice(1);
  return trimmed;
}

type LockCapable = Navigator & {
  locks?: { request: (name: string, callback: () => void | Promise<void>) => Promise<void> };
};

// Web Locks where available; elsewhere the cycle runs synchronously.
async function withStorageLock(name: string, fn: () => void): Promise<void> {
  const locks = typeof navigator !== 'undefined' ? (navigator as LockCapable).locks : undefined;
  if (!locks?.request) {
    fn();
    return;
  }
  let ran = false;
  try {
    await locks.request(name, async () => {
      ran = true;
      fn();
    });
  } catch {
    if (!ran) fn();
  }
}

/** The storage to use, or `null` when none is available (server, or access blocked). */
function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Conversation store on top of `localStorage`; one key per namespace, merged across tabs. */
export function createLocalStoragePersistence(
  options: LocalStoragePersistenceOptions = {},
): ChatPersistence {
  const {
    key = DEFAULT_PERSISTENCE_KEY,
    namespace,
    ttlMs = DEFAULT_PERSISTENCE_TTL_MS,
    maxTurns = Infinity,
    maxThreads = Infinity,
    storage: storageOption,
  } = options;
  const storageKey = [key, `v${PERSISTED_CHAT_VERSION}`, namespace].filter(Boolean).join(':');

  const readRaw = (storage: Storage): string | null => {
    try {
      return storage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const parse = (raw: string | null): StoredThreads => {
    const empty: StoredThreads = { version: PERSISTED_CHAT_VERSION, threads: {}, deleted: {} };
    if (!raw) return empty;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredThreads>;
      if (parsed?.version !== PERSISTED_CHAT_VERSION || !parsed.threads) return empty;
      const cutoff = Date.now() - ttlMs;
      const threads = Object.fromEntries(
        Object.entries(parsed.threads).filter(
          ([, chat]) => isPersistedChat(chat) && chat.updatedAt >= cutoff,
        ),
      );
      const deleted = Object.fromEntries(
        Object.entries(parsed.deleted ?? {}).filter(
          ([, at]) => typeof at === 'number' && at >= cutoff,
        ),
      );
      return { version: PERSISTED_CHAT_VERSION, threads, deleted };
    } catch {
      return empty;
    }
  };

  const read = (): StoredThreads => {
    const storage = resolveStorage(storageOption);
    return parse(storage ? readRaw(storage) : null);
  };

  const sortedThreads = (data: StoredThreads): PersistedChat[] =>
    Object.values(data.threads).sort((a, b) => b.updatedAt - a.updatedAt);

  const tryWrite = (storage: Storage, data: StoredThreads): boolean => {
    try {
      storage.setItem(storageKey, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  };

  const remove = (storage: Storage) => {
    try {
      storage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  const isEmpty = (data: StoredThreads) =>
    Object.keys(data.threads).length === 0 && Object.keys(data.deleted ?? {}).length === 0;

  // When storage is full, shed other threads oldest first, then the saved thread's oldest turns, then tombstones.
  const write = (storage: Storage, data: StoredThreads, priorityThreadId?: string) => {
    if (isEmpty(data)) {
      remove(storage);
      return;
    }
    if (tryWrite(storage, data)) return;

    const priority = priorityThreadId ? data.threads[priorityThreadId] : undefined;
    if (!priority) {
      if (Object.keys(data.threads).length === 0) remove(storage);
      else tryWrite(storage, { ...data, deleted: {} });
      return;
    }

    const oldestFirst = sortedThreads(data)
      .filter((chat) => chat.threadId !== priority.threadId)
      .reverse();
    let next = data;
    for (let i = 0; i < oldestFirst.length; i += 1) {
      const { [oldestFirst[i].threadId]: evicted, ...threads } = next.threads;
      next = { ...next, threads };
      if (tryWrite(storage, next)) return;
    }

    let chat = priority;
    while (chat.messages.length > 2) {
      chat = { ...chat, messages: trimToTurns(chat.messages.slice(2), maxTurns) };
      next = { ...next, threads: { [chat.threadId]: chat } };
      if (tryWrite(storage, next)) return;
    }
    if (tryWrite(storage, { ...next, deleted: {} })) return;

    const { [priority.threadId]: dropped, ...rest } = data.threads;
    const others: StoredThreads = { ...data, threads: rest };
    if (!isEmpty(others)) tryWrite(storage, others);
  };

  // Redo the merge if another tab wrote between our read and this write.
  const MAX_COMMIT_ATTEMPTS = 3;
  const transact = (
    mutate: (data: StoredThreads) => StoredThreads | null,
    priorityThreadId?: string,
  ) => {
    const storage = resolveStorage(storageOption);
    if (!storage) return;
    for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS; attempt += 1) {
      const raw = readRaw(storage);
      const next = mutate(parse(raw));
      if (!next) return;
      if (readRaw(storage) === raw) {
        write(storage, next, priorityThreadId);
        return;
      }
    }
    // The key kept changing under us: skip rather than overwrite another tab's turns. Without
    // Web Locks this check is best effort; a write between the compare and the set can still win.
  };

  /** The record to store once `chat` is merged in, or `null` to leave storage alone. */
  const mergeThread = (current: StoredThreads, chat: PersistedChat): StoredThreads | null => {
    const now = Date.now();
    const createdAt = chat.createdAt ?? now;
    const deletedAt = current.deleted?.[chat.threadId];
    if (deletedAt !== undefined && deletedAt >= createdAt) return null;
    const stored = current.threads[chat.threadId];
    const incomingAt = chat.updatedAt ?? now;
    // An older snapshot may add turns but must not regress ones already settled.
    const stale = Boolean(stored) && incomingAt < stored.updatedAt;
    const messages = stored ? mergeMessages(stored.messages, chat.messages, stale) : chat.messages;
    const merged: PersistedChat = {
      ...(stale ? stored : chat),
      version: PERSISTED_CHAT_VERSION,
      threadId: chat.threadId,
      messages: trimToTurns(messages, maxTurns),
      createdAt,
      updatedAt: Math.max(incomingAt, stored?.updatedAt ?? 0),
    };
    let next: StoredThreads = {
      ...current,
      threads: { ...current.threads, [chat.threadId]: merged },
    };
    if (Number.isFinite(maxThreads)) {
      const kept = sortedThreads(next).slice(0, Math.max(0, maxThreads));
      next = { ...next, threads: Object.fromEntries(kept.map((t) => [t.threadId, t])) };
      if (!next.threads[chat.threadId]) return null;
    }
    return next;
  };

  const retire = (data: StoredThreads, staleId: string): StoredThreads => {
    const { [staleId]: retired, ...threads } = data.threads;
    return { ...data, threads, deleted: { ...data.deleted, [staleId]: Date.now() } };
  };

  return {
    async listThreads(): Promise<ThreadSummary[]> {
      return sortedThreads(read()).map(({ threadId, messages, createdAt, updatedAt }) => ({
        threadId,
        title: getThreadTitle(messages),
        createdAt,
        updatedAt,
        inFlight: isInFlight(messages),
      }));
    },

    async getThread(threadId: string): Promise<PersistedChat | null> {
      return read().threads[threadId] ?? null;
    },

    async isThreadDeleted(threadId: string): Promise<boolean> {
      // Deletes leave tombstones, so a missing key means the store was cleared from outside.
      const storage = resolveStorage(storageOption);
      if (!storage || readRaw(storage) === null) return true;
      return read().deleted?.[threadId] !== undefined;
    },

    saveThread(chat: PersistedChat): Promise<void> {
      return withStorageLock(storageKey, () =>
        transact((current) => mergeThread(current, chat), chat.threadId),
      );
    },

    saveThreadSync(chat: PersistedChat, staleIds: string[] = []): void {
      // No Web Lock: its callback is a task, and tasks do not run while the document unloads.
      transact((current) => {
        const merged = mergeThread(current, chat);
        if (!merged) return null;
        return staleIds
          .filter((id) => id !== chat.threadId)
          .reduce((next, id) => retire(next, id), merged);
      }, chat.threadId);
    },

    deleteThread(threadId: string): Promise<void> {
      return withStorageLock(storageKey, () => transact((current) => retire(current, threadId)));
    },

    subscribe(listener: () => void): () => void {
      if (typeof window === 'undefined') return () => {};
      const onStorage = (event: StorageEvent) => {
        const area = resolveStorage(storageOption);
        if (area && event.storageArea && event.storageArea !== area) return;
        if (event.key === null || event.key === storageKey) listener();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}

export default createLocalStoragePersistence;
