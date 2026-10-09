import type {
  AbortRequest,
  ChatMessage,
  ChatPersistence,
  ClearPersistedConversationsOptions,
  LocalStoragePersistenceOptions,
  PersistedChat,
  StorageArea,
  ThreadSummary,
} from '../types';
import {
  DEFAULT_PERSISTENCE_KEY,
  DEFAULT_PERSISTENCE_TTL_MS,
  PERSISTED_CHAT_VERSION,
  getThreadTitle,
  isThreadStreaming,
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
function resolveStorage(storage: Storage | undefined, area: StorageArea): Storage | null {
  if (storage) return storage;
  try {
    if (typeof window === 'undefined') return null;
    return area === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/** No user id, or an empty one: the conversation belongs to a guest. */
export const isGuest = (userId: string | number | null | undefined): boolean =>
  userId == null || userId === '';

/** The id the client and storage use: `undefined` for a guest (no id, `null` or empty). */
export const shopperId = (userId: string | number | null | undefined): string | undefined =>
  isGuest(userId) ? undefined : String(userId);

/** Guests live in `sessionStorage`, so their history ends with the tab; shoppers keep theirs in `localStorage`. */
export function storageAreaFor(userId: string | null | undefined): StorageArea {
  return isGuest(userId) ? 'session' : 'local';
}

/** Namespace the provider stores under: api key, domain and, for a signed-in shopper, the user id. */
export function persistenceNamespace(parts: {
  apiKey: string;
  domain?: string;
  userId?: string | null;
}): string {
  return [parts.apiKey, parts.domain ?? 'default', shopperId(parts.userId)]
    .filter((part): part is string => part !== undefined)
    .map(encodeURIComponent)
    .join(':');
}

function storageKeyFor(key: string, namespace?: string): string {
  return [key, `v${PERSISTED_CHAT_VERSION}`, namespace].filter(Boolean).join(':');
}

const emptyStored = (): StoredThreads => ({
  version: PERSISTED_CHAT_VERSION,
  threads: {},
  deleted: {},
});

/** The record `raw` holds, or `null` when it is not one of this version. */
function readStored(raw: string): StoredThreads | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredThreads>;
    if (parsed?.version !== PERSISTED_CHAT_VERSION || !parsed.threads) return null;
    const threads = Object.fromEntries(
      Object.entries(parsed.threads).filter(([, chat]) => isPersistedChat(chat)),
    );
    const deleted = Object.fromEntries(
      Object.entries(parsed.deleted ?? {}).filter(([, at]) => typeof at === 'number'),
    );
    return { version: PERSISTED_CHAT_VERSION, threads, deleted };
  } catch {
    return null;
  }
}

function parseStored(raw: string | null): StoredThreads {
  return (raw && readStored(raw)) || emptyStored();
}

function dropExpired(data: StoredThreads, cutoff: number): StoredThreads {
  return {
    version: PERSISTED_CHAT_VERSION,
    threads: Object.fromEntries(
      Object.entries(data.threads).filter(([, chat]) => chat.updatedAt >= cutoff),
    ),
    deleted: Object.fromEntries(
      Object.entries(data.deleted ?? {}).filter(([, at]) => at >= cutoff),
    ),
  };
}

const entryCount = (data: StoredThreads) =>
  Object.keys(data.threads).length + Object.keys(data.deleted ?? {}).length;

function readItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** How often a write is redone when another tab changed the key between its read and its write. */
const MAX_COMMIT_ATTEMPTS = 3;

/** Drops expired threads and tombstones under every namespace of `key`, other shoppers' included. */
async function sweepExpired(storage: Storage, key: string, ttlMs: number): Promise<void> {
  const prefix = storageKeyFor(key);
  let keys: string[];
  try {
    keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
      (k): k is string => k === prefix || Boolean(k?.startsWith(`${prefix}:`)),
    );
  } catch {
    return;
  }
  await Promise.all(
    keys.map((k) =>
      withStorageLock(k, () => {
        for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS; attempt += 1) {
          const raw = readItem(storage, k);
          const stored = raw === null ? null : readStored(raw);
          if (!stored) return;
          const kept = dropExpired(stored, Date.now() - ttlMs);
          if (entryCount(kept) === entryCount(stored)) return;
          if (readItem(storage, k) === raw) {
            try {
              if (entryCount(kept) === 0) storage.removeItem(k);
              else storage.setItem(k, JSON.stringify(kept));
            } catch {
              /* storage unavailable */
            }
            return;
          }
        }
      }),
    ),
  );
}

/**
 * Deletes every stored conversation of one shopper, or of the guest without `userId`; open tabs
 * follow. Resolves once the deletion is recorded.
 */
export async function clearPersistedConversations(
  options: ClearPersistedConversationsOptions,
): Promise<void> {
  const { apiKey, domain = 'chatbot', userId, storage: storageOption } = options;
  const storage = resolveStorage(storageOption, storageAreaFor(userId));
  if (!storage) return;
  const key = storageKeyFor(
    DEFAULT_PERSISTENCE_KEY,
    persistenceNamespace({ apiKey, domain, userId }),
  );
  let cleared = false;
  // Under the store's lock, and as tombstones rather than a bare removal: a save still queued in
  // some tab, holding a copy of a thread, must find it deleted instead of writing it back.
  await withStorageLock(key, () => {
    try {
      const raw = readItem(storage, key);
      if (raw === null) {
        cleared = true;
        return;
      }
      const current = parseStored(raw);
      const now = Date.now();
      const deleted = Object.keys(current.threads).reduce(
        (all, threadId) => ({ ...all, [threadId]: now }),
        current.deleted ?? {},
      );
      if (Object.keys(deleted).length === 0) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify({ ...emptyStored(), deleted }));
      cleared = true;
    } catch {
      /* storage unavailable */
    }
  });
  if (!cleared) return;
  // Other tabs get a native storage event; this tab does not, so dispatch one for a mounted chat.
  if (typeof window === 'undefined' || typeof StorageEvent === 'undefined') return;
  try {
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: storage }));
  } catch {
    /* a non-Storage `storage` option cannot be attached to the event */
  }
}

/** The channel abort requests travel on between tabs, or `null` where none can be opened. */
function openAbortChannel(
  name: string,
  onRequest: (request: AbortRequest) => void,
): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  try {
    const channel = new BroadcastChannel(name);
    channel.onmessage = ({ data }: MessageEvent) => {
      if (typeof data?.threadId !== 'string' || typeof data?.messageId !== 'string') return;
      onRequest({ threadId: data.threadId, messageId: data.messageId });
    };
    return channel;
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
    storageArea = 'local',
    storage: storageOption,
  } = options;
  const storageKey = storageKeyFor(key, namespace);

  const readRaw = (storage: Storage): string | null => readItem(storage, storageKey);

  // One sync reads the same key several times; parse and validate the blob once per distinct value.
  let lastParsed: { raw: string; data: StoredThreads } | null = null;
  const parse = (raw: string | null): StoredThreads => {
    if (!raw) return emptyStored();
    if (lastParsed?.raw !== raw) lastParsed = { raw, data: parseStored(raw) };
    return dropExpired(lastParsed.data, Date.now() - ttlMs);
  };

  // Other shoppers' records expire only here: their own store may never run again on this device.
  let swept = false;
  const sweepOnce = () => {
    if (swept) return;
    swept = true;
    const local = resolveStorage(storageOption, 'local');
    if (local) sweepExpired(local, key, ttlMs).catch(() => {});
  };

  const read = (): StoredThreads => {
    sweepOnce();
    const storage = resolveStorage(storageOption, storageArea);
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

  const isEmpty = (data: StoredThreads) => entryCount(data) === 0;

  // Retries without tombstones, oldest first: the last thing to shed, see `write`.
  const tryWriteShedding = (storage: Storage, data: StoredThreads): boolean => {
    if (tryWrite(storage, data)) return true;
    const oldestFirst = Object.entries(data.deleted ?? {})
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id);
    let next = data;
    for (let i = 0; i < oldestFirst.length; i += 1) {
      const { [oldestFirst[i]]: shed, ...deleted } = next.deleted ?? {};
      next = { ...next, deleted };
      if (tryWrite(storage, next)) return true;
    }
    return false;
  };

  // A tombstone is the only thing stopping another tab from writing a deleted thread back, while an
  // evicted thread is written back by the tab holding it. So when storage is full, shed other
  // threads oldest first, then the saved thread's oldest turns, and only then tombstones.
  const write = (storage: Storage, data: StoredThreads, priorityThreadId?: string) => {
    if (isEmpty(data)) {
      remove(storage);
      return;
    }
    if (tryWrite(storage, data)) return;

    const priority = priorityThreadId ? data.threads[priorityThreadId] : undefined;
    const oldestFirst = sortedThreads(data)
      .filter((chat) => chat.threadId !== priority?.threadId)
      .reverse();
    let next = data;
    for (let i = 0; i < oldestFirst.length; i += 1) {
      const { [oldestFirst[i].threadId]: evicted, ...threads } = next.threads;
      next = { ...next, threads };
      if (tryWrite(storage, next)) return;
    }

    if (!priority) {
      // Not even the tombstones fit without the threads; keep the threads rather than wipe them.
      if (Object.keys(data.threads).length === 0) remove(storage);
      else tryWriteShedding(storage, data);
      return;
    }

    let chat = priority;
    while (chat.messages.length > 2) {
      chat = { ...chat, messages: trimToTurns(chat.messages.slice(2), maxTurns) };
      next = { ...next, threads: { ...next.threads, [chat.threadId]: chat } };
      if (tryWrite(storage, next)) return;
    }
    if (tryWriteShedding(storage, next)) return;

    // Nothing fits: drop the stored copy too, so no in-flight record is left behind.
    const { [priority.threadId]: dropped, ...rest } = data.threads;
    const others: StoredThreads = { ...data, threads: rest };
    if (isEmpty(others)) remove(storage);
    else tryWriteShedding(storage, others);
  };

  // Redo the merge if another tab wrote between our read and this write.
  const transact = (
    mutate: (data: StoredThreads) => StoredThreads | null,
    priorityThreadId?: string,
  ) => {
    sweepOnce();
    const storage = resolveStorage(storageOption, storageArea);
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
    // Merging keeps turns other tabs added. The tab that wrote the stored record is instead
    // writing a newer full view of it, and may have dropped a message (an aborted reply), so
    // merging its own older copy back would resurrect what it just removed.
    const ownsStored =
      stored?.owner !== undefined && chat.owner !== undefined && stored.owner === chat.owner;
    const replace = !stored || (ownsStored && !stale);
    const messages = replace ? chat.messages : mergeMessages(stored.messages, chat.messages, stale);
    const base = stale ? stored : chat;
    // A record holding turns its owner has not seen is nobody's full view, so the next save merges too.
    const absorbed = !replace && messages.length > base.messages.length;
    const merged: PersistedChat = {
      ...base,
      owner: absorbed ? undefined : base.owner,
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

  const abortListeners = new Set<(request: AbortRequest) => void>();
  // Only `localStorage` is shared between tabs; a guest's `sessionStorage` thread streams in this tab alone.
  const channel =
    storageArea === 'local'
      ? openAbortChannel(`${storageKey}:abort`, (request) =>
          abortListeners.forEach((listener) => listener(request)),
        )
      : null;
  const abortMethods: Pick<ChatPersistence, 'requestAbort' | 'subscribeAbort'> = channel
    ? {
        requestAbort(threadId: string, messageId: string) {
          try {
            channel.postMessage({ threadId, messageId });
          } catch {
            /* channel closed */
          }
        },
        subscribeAbort(listener: (request: AbortRequest) => void) {
          abortListeners.add(listener);
          return () => {
            abortListeners.delete(listener);
          };
        },
      }
    : {};

  const retire = (data: StoredThreads, staleId: string): StoredThreads => {
    const { [staleId]: retired, ...threads } = data.threads;
    return { ...data, threads, deleted: { ...data.deleted, [staleId]: Date.now() } };
  };

  return {
    async listThreads(): Promise<ThreadSummary[]> {
      const now = Date.now();
      return sortedThreads(read()).map((chat) => ({
        threadId: chat.threadId,
        title: getThreadTitle(chat.messages),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        inFlight: isThreadStreaming(chat, now),
      }));
    },

    async getThread(threadId: string): Promise<PersistedChat | null> {
      return read().threads[threadId] ?? null;
    },

    async isThreadDeleted(threadId: string): Promise<boolean> {
      // Deletes leave tombstones, so a missing key means the store was cleared from outside.
      const storage = resolveStorage(storageOption, storageArea);
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
        const area = resolveStorage(storageOption, storageArea);
        if (area && event.storageArea && event.storageArea !== area) return;
        if (event.key === null || event.key === storageKey) listener();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },

    ...abortMethods,
  };
}

const sharedStores = new Map<string, ChatPersistence>();

/**
 * One store per namespace and area for the page, so a chat mounted again finds the answers still
 * streaming into it. Not shared on the server, where the map would outlive the request.
 */
export function sharedLocalStoragePersistence(
  namespace: string,
  storageArea: StorageArea,
): ChatPersistence {
  if (typeof window === 'undefined')
    return createLocalStoragePersistence({ namespace, storageArea });
  const id = `${storageArea}:${namespace}`;
  const existing = sharedStores.get(id);
  if (existing) return existing;
  const store = createLocalStoragePersistence({ namespace, storageArea });
  sharedStores.set(id, store);
  return store;
}

export default createLocalStoragePersistence;
