import type {
  ChatMessage,
  ChatPersistence,
  FollowUpRefinement,
  LocalStoragePersistenceOptions,
  PersistedChat,
  ResultGroup,
  ThreadSummary,
} from '../types';

export const PERSISTED_CHAT_VERSION = 1;
export const DEFAULT_PERSISTENCE_KEY = 'cio-asa:chat';
export const DEFAULT_PERSISTENCE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const IN_FLIGHT_GRACE_MS = 60 * 1000;

const LOCAL_THREAD_PREFIX = 'local-';
const TITLE_MAX_LENGTH = 80;

interface StoredThreads {
  version: typeof PERSISTED_CHAT_VERSION;
  threads: Record<string, PersistedChat>;
  deleted?: Record<string, number>;
}

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

export function isLocalThreadId(threadId: string | null | undefined): boolean {
  return typeof threadId === 'string' && threadId.startsWith(LOCAL_THREAD_PREFIX);
}

export function getThreadTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')?.text ?? '';
  return first.length > TITLE_MAX_LENGTH ? `${first.slice(0, TITLE_MAX_LENGTH - 1)}…` : first;
}

export function nextMessageCounter(messages: ChatMessage[]): number {
  return messages.reduce((max, m) => {
    const match = /^msg-(\d+)-/.exec(m.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, messages.length);
}

export function isInFlight(messages: ChatMessage[]): boolean {
  const last = messages[messages.length - 1];
  return last?.status === 'loading' || last?.status === 'streaming';
}

export function normalizeHydratedMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (m.status !== 'loading' && m.status !== 'streaming') return m;
    const hasContent = Boolean(m.text) || Boolean(m.groups?.length) || Boolean(m.refinement);
    return { ...m, status: hasContent ? 'done' : 'error' };
  });
}

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

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function mergeMessages(stored: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const incomingById = new Map(incoming.map((m) => [m.id, m]));
  const storedIds = new Set(stored.map((m) => m.id));
  return [
    ...stored.map((m) => incomingById.get(m.id) ?? m),
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

  const read = (): StoredThreads => {
    const empty: StoredThreads = { version: PERSISTED_CHAT_VERSION, threads: {}, deleted: {} };
    const storage = resolveStorage(storageOption);
    if (!storage) return empty;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return empty;
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

  const write = (data: StoredThreads, priorityThreadId?: string) => {
    const storage = resolveStorage(storageOption);
    if (!storage) return;
    if (Object.keys(data.threads).length === 0 && Object.keys(data.deleted ?? {}).length === 0) {
      try {
        storage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      return;
    }
    if (tryWrite(storage, data)) return;

    const priority = priorityThreadId ? data.threads[priorityThreadId] : sortedThreads(data)[0];
    if (!priority) {
      try {
        storage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
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
    try {
      storage.removeItem(storageKey);
    } catch {
      /* ignore */
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
      return withStorageLock(storageKey, () => {
        const data = read();
        const now = Date.now();
        const createdAt = chat.createdAt ?? now;
        const deletedAt = data.deleted?.[chat.threadId];
        if (deletedAt !== undefined && deletedAt >= createdAt) return;
        const stored = data.threads[chat.threadId];
        const messages = stored ? mergeMessages(stored.messages, chat.messages) : chat.messages;
        data.threads[chat.threadId] = {
          ...chat,
          version: PERSISTED_CHAT_VERSION,
          messages: trimToTurns(messages, maxTurns),
          createdAt,
          updatedAt: Math.max(chat.updatedAt ?? now, stored?.updatedAt ?? 0),
        };
        if (Number.isFinite(maxThreads)) {
          const kept = sortedThreads(data).slice(0, Math.max(1, maxThreads));
          data.threads = Object.fromEntries(kept.map((t) => [t.threadId, t]));
          if (!data.threads[chat.threadId]) return;
        }
        write(data, chat.threadId);
      });
    },

    deleteThread(threadId: string): Promise<void> {
      return withStorageLock(storageKey, () => {
        const data = read();
        delete data.threads[threadId];
        data.deleted = { ...data.deleted, [threadId]: Date.now() };
        write(data);
      });
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
