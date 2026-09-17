import type {
  ChatMessage,
  ChatPersistence,
  FollowUpRefinement,
  LocalStoragePersistenceOptions,
  PersistedChat,
  ResultGroup,
  ThreadSummary,
} from '../types';

/**
 * Shape version written into every stored record. Bump it when the stored format changes in an
 * incompatible way: records with another version are ignored on read instead of crashing the
 * chat with data it cannot interpret.
 */
export const PERSISTED_CHAT_VERSION = 1;
/** Prefix of the `localStorage` key; the api key, domain and user id are appended to it. */
export const DEFAULT_PERSISTENCE_KEY = 'cio-asa:chat';
/** One week, matching how long the agent itself remembers a thread. */
export const DEFAULT_PERSISTENCE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** How long a stored answer written by another tab is still shown as "typing" before it is settled. */
export const IN_FLIGHT_GRACE_MS = 60 * 1000;
/** Marks client-side thread ids, used before the server has assigned one. Never sent to the agent. */
const LOCAL_THREAD_PREFIX = 'local-';
/** Thread titles are the first question, cut to this many characters. */
const TITLE_MAX_LENGTH = 80;

interface StoredThreads {
  version: typeof PERSISTED_CHAT_VERSION;
  threads: Record<string, PersistedChat>;
  deleted?: Record<string, number>;
}

/** Client-side thread id for a conversation the server has not named yet. */
export function createLocalThreadId(): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${LOCAL_THREAD_PREFIX}${random}`;
}

const TAB_ID_KEY = 'cio-asa:tab';
let tabId: string | undefined;

/**
 * Stable per-tab id. Kept in `sessionStorage` so it survives a reload of the same tab but
 * differs between tabs; `undefined` outside a browser.
 */
export function getTabId(): string | undefined {
  if (tabId) return tabId;
  if (typeof window === 'undefined') return undefined;
  const random = createLocalThreadId().slice(LOCAL_THREAD_PREFIX.length);
  try {
    tabId = window.sessionStorage.getItem(TAB_ID_KEY) ?? random;
    window.sessionStorage.setItem(TAB_ID_KEY, tabId);
  } catch {
    tabId = random;
  }
  return tabId;
}

/** Whether `threadId` was made by `createLocalThreadId` rather than by the server. */
export function isLocalThreadId(threadId: string | null | undefined): boolean {
  return typeof threadId === 'string' && threadId.startsWith(LOCAL_THREAD_PREFIX);
}

/** Title for a thread list: the first user message, truncated with an ellipsis. */
export function getThreadTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')?.text ?? '';
  return first.length > TITLE_MAX_LENGTH ? `${first.slice(0, TITLE_MAX_LENGTH - 1)}…` : first;
}

/**
 * Counter to continue message ids from after restoring `messages`, so new ids never collide
 * with restored ones. Falls back to the message count for ids in another format.
 */
export function nextMessageCounter(messages: ChatMessage[]): number {
  return messages.reduce((max, m) => {
    const match = /^msg-(\d+)-/.exec(m.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, messages.length);
}

/** Whether the latest answer in `messages` has not finished streaming. */
export function isInFlight(messages: ChatMessage[]): boolean {
  const last = messages[messages.length - 1];
  return last?.status === 'loading' || last?.status === 'streaming';
}

/**
 * Settles answers that were still streaming when they were stored: one with any content becomes
 * `done`, an empty one becomes `error`. Messages already settled are returned as they are.
 */
export function normalizeHydratedMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (m.status !== 'loading' && m.status !== 'streaming') return m;
    const hasContent = Boolean(m.text) || Boolean(m.groups?.length) || Boolean(m.refinement);
    return { ...m, status: hasContent ? 'done' : 'error' };
  });
}

/** Keeps the last `maxTurns` user/assistant pairs, always starting on a user message. */
function trimToTurns(messages: ChatMessage[], maxTurns: number): ChatMessage[] {
  if (maxTurns <= 0) return [];
  let trimmed = Number.isFinite(maxTurns) ? messages.slice(-maxTurns * 2) : messages;
  while (trimmed.length && trimmed[0].role !== 'user') trimmed = trimmed.slice(1);
  return trimmed;
}

// Serializes read-merge-write cycles across tabs where the Web Locks API exists;
// elsewhere the cycle runs synchronously, which is the best localStorage offers.
async function withStorageLock(name: string, fn: () => void): Promise<void> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
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

/**
 * Union of both message lists in stored order. A message present in both keeps the incoming
 * version unless `preferStored` is set, which is how an older snapshot is merged without
 * regressing turns already settled by a newer one.
 */
export function mergeMessages(
  stored: ChatMessage[],
  incoming: ChatMessage[],
  preferStored = false,
): ChatMessage[] {
  const incomingById = new Map(incoming.map((m) => [m.id, m]));
  const storedIds = new Set(stored.map((m) => m.id));
  return [
    ...stored.map((m) => (preferStored ? m : incomingById.get(m.id) ?? m)),
    ...incoming.filter((m) => !storedIds.has(m.id)),
  ];
}

const MESSAGE_ROLES = new Set(['user', 'assistant']);
const MESSAGE_STATUSES = new Set(['idle', 'loading', 'streaming', 'done', 'error']);

function isResultGroup(value: unknown): value is ResultGroup {
  if (!value || typeof value !== 'object') return false;
  const g = value as Partial<ResultGroup>;
  return (
    Boolean(g.group) &&
    typeof g.group === 'object' &&
    typeof g.group.display_name === 'string' &&
    Array.isArray(g.searchResults) &&
    g.searchResults.every((r) => Boolean(r) && typeof r === 'object')
  );
}

function isRefinement(value: unknown): value is FollowUpRefinement {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<FollowUpRefinement>;
  return (
    typeof r.question === 'string' &&
    Array.isArray(r.options) &&
    r.options.every((o) => typeof o === 'string')
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<ChatMessage>;
  return (
    typeof m.id === 'string' &&
    MESSAGE_ROLES.has(m.role as string) &&
    typeof m.text === 'string' &&
    MESSAGE_STATUSES.has(m.status as string) &&
    (m.groups === undefined || (Array.isArray(m.groups) && m.groups.every(isResultGroup))) &&
    (m.refinement === undefined || isRefinement(m.refinement))
  );
}

function isPersistedChat(value: unknown): value is PersistedChat {
  if (!value || typeof value !== 'object') return false;
  const chat = value as Partial<PersistedChat>;
  return (
    chat.version === PERSISTED_CHAT_VERSION &&
    typeof chat.threadId === 'string' &&
    Array.isArray(chat.messages) &&
    chat.messages.every(isChatMessage) &&
    typeof chat.createdAt === 'number' &&
    typeof chat.updatedAt === 'number' &&
    (chat.owner === undefined || typeof chat.owner === 'string')
  );
}

/**
 * Conversation store on top of `localStorage`. All threads of one namespace live under a single
 * key; reads drop expired threads, writes merge with what other tabs wrote in between, and a
 * full storage falls back to keeping only the thread being saved, trimmed.
 */
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

  // Full write first; when storage is full, keep the priority thread alone and trim it turn by
  // turn; when even one turn does not fit, keep the other threads rather than wiping the key.
  const write = (storage: Storage, data: StoredThreads, priorityThreadId?: string) => {
    if (isEmpty(data)) {
      remove(storage);
      return;
    }
    if (tryWrite(storage, data)) return;

    const priority = priorityThreadId ? data.threads[priorityThreadId] : sortedThreads(data)[0];
    if (!priority) {
      remove(storage);
      return;
    }
    let chat = priority;
    while (chat.messages.length > 0) {
      const single: StoredThreads = {
        version: PERSISTED_CHAT_VERSION,
        threads: { [chat.threadId]: chat },
        deleted: data.deleted,
      };
      if (tryWrite(storage, single)) return;
      chat = { ...chat, messages: trimToTurns(chat.messages.slice(2), maxTurns) };
    }
    const { [priority.threadId]: dropped, ...rest } = data.threads;
    const others: StoredThreads = { ...data, threads: rest };
    if (isEmpty(others) || !tryWrite(storage, others)) remove(storage);
  };

  // Optimistic read-merge-write: if the key changed between our read and the write (another
  // tab committed meanwhile), redo the merge on the fresh value. Together with the Web Lock
  // this keeps concurrent turns from different tabs from overwriting each other.
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
      if (readRaw(storage) === raw || attempt === MAX_COMMIT_ATTEMPTS - 1) {
        write(storage, next, priorityThreadId);
        return;
      }
    }
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

    saveThread(chat: PersistedChat): Promise<void> {
      return withStorageLock(storageKey, () =>
        transact((current) => {
          const now = Date.now();
          const createdAt = chat.createdAt ?? now;
          const deletedAt = current.deleted?.[chat.threadId];
          if (deletedAt !== undefined && deletedAt >= createdAt) return null;
          const stored = current.threads[chat.threadId];
          const incomingAt = chat.updatedAt ?? now;
          // An older snapshot may add turns it knows about but must not regress ones a
          // newer snapshot already settled.
          const stale = Boolean(stored) && incomingAt < stored.updatedAt;
          const messages = stored
            ? mergeMessages(stored.messages, chat.messages, stale)
            : chat.messages;
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
            const kept = sortedThreads(next).slice(0, Math.max(1, maxThreads));
            next = { ...next, threads: Object.fromEntries(kept.map((t) => [t.threadId, t])) };
            if (!next.threads[chat.threadId]) return null;
          }
          return next;
        }, chat.threadId),
      );
    },

    deleteThread(threadId: string): Promise<void> {
      return withStorageLock(storageKey, () =>
        transact((current) => {
          const { [threadId]: removed, ...threads } = current.threads;
          return { ...current, threads, deleted: { ...current.deleted, [threadId]: Date.now() } };
        }),
      );
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

/**
 * Writes `snapshot` and, when the conversation moved from `staleId` to a new key, deletes the
 * old record once the new one is confirmed to exist. Returns the id that still has to be
 * deleted later, or `null` when nothing is left behind.
 */
export async function saveThreadAndRetireStale(
  store: ChatPersistence,
  snapshot: PersistedChat,
  staleId: string | null,
): Promise<string | null> {
  try {
    await store.saveThread(snapshot);
  } catch {
    return staleId;
  }
  if (!staleId) return null;
  const persisted = await store.getThread(snapshot.threadId).catch(() => null);
  if (!persisted) return staleId;
  await store.deleteThread(staleId).catch(() => {});
  return null;
}

/** Finds the server-keyed record another tab re-keyed a local thread into, by its first message. */
export async function findRekeyedThread(
  store: ChatPersistence,
  firstMessageId: string | undefined,
): Promise<PersistedChat | null> {
  if (!firstMessageId) return null;
  const list = await store.listThreads();
  const candidates = list.filter((t) => !isLocalThreadId(t.threadId));
  const loaded = await Promise.all(candidates.map((t) => store.getThread(t.threadId)));
  return loaded.find((c) => c?.messages[0]?.id === firstMessageId) ?? null;
}
