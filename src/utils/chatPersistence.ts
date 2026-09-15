import type {
  ChatMessage,
  ChatPersistence,
  LocalStoragePersistenceOptions,
  PersistedChat,
  ThreadSummary,
} from '../types';

export const PERSISTED_CHAT_VERSION = 1;
export const DEFAULT_PERSISTENCE_KEY = 'cio-asa:chat';
export const DEFAULT_PERSISTENCE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_PERSISTENCE_MAX_TURNS = 20;
export const DEFAULT_PERSISTENCE_MAX_THREADS = 5;

const LOCAL_THREAD_PREFIX = 'local-';
const TITLE_MAX_LENGTH = 80;

interface StoredThreads {
  version: typeof PERSISTED_CHAT_VERSION;
  threads: Record<string, PersistedChat>;
}

export function createLocalThreadId(): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${LOCAL_THREAD_PREFIX}${random}`;
}

export function isLocalThreadId(threadId: string | null | undefined): boolean {
  return typeof threadId === 'string' && threadId.startsWith(LOCAL_THREAD_PREFIX);
}

export function getThreadTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')?.text ?? '';
  return first.length > TITLE_MAX_LENGTH ? `${first.slice(0, TITLE_MAX_LENGTH - 1)}…` : first;
}

export function normalizeHydratedMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (m.status !== 'loading' && m.status !== 'streaming') return m;
    const hasContent = Boolean(m.text) || Boolean(m.groups?.length);
    return { ...m, status: hasContent ? 'done' : 'error' };
  });
}

function trimToTurns(messages: ChatMessage[], maxTurns: number): ChatMessage[] {
  if (maxTurns <= 0) return [];
  let trimmed = messages.slice(-maxTurns * 2);
  while (trimmed.length && trimmed[0].role !== 'user') trimmed = trimmed.slice(1);
  return trimmed;
}

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isPersistedChat(value: unknown): value is PersistedChat {
  if (!value || typeof value !== 'object') return false;
  const chat = value as Partial<PersistedChat>;
  return (
    chat.version === PERSISTED_CHAT_VERSION &&
    typeof chat.threadId === 'string' &&
    Array.isArray(chat.messages) &&
    typeof chat.updatedAt === 'number'
  );
}

export function createLocalStoragePersistence(
  options: LocalStoragePersistenceOptions = {},
): ChatPersistence {
  const {
    key = DEFAULT_PERSISTENCE_KEY,
    namespace,
    ttlMs = DEFAULT_PERSISTENCE_TTL_MS,
    maxTurns = DEFAULT_PERSISTENCE_MAX_TURNS,
    maxThreads = DEFAULT_PERSISTENCE_MAX_THREADS,
    storage: storageOption,
  } = options;
  const storageKey = [key, `v${PERSISTED_CHAT_VERSION}`, namespace].filter(Boolean).join(':');

  const read = (): StoredThreads => {
    const empty: StoredThreads = { version: PERSISTED_CHAT_VERSION, threads: {} };
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
      return { version: PERSISTED_CHAT_VERSION, threads };
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
    if (Object.keys(data.threads).length === 0) {
      try {
        storage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      return;
    }
    if (tryWrite(storage, data)) return;

    const priority = priorityThreadId ? data.threads[priorityThreadId] : sortedThreads(data)[0];
    if (!priority) return;
    let chat = priority;
    while (chat.messages.length > 0) {
      const single: StoredThreads = {
        version: PERSISTED_CHAT_VERSION,
        threads: { [chat.threadId]: chat },
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
      }));
    },

    async getThread(threadId: string): Promise<PersistedChat | null> {
      return read().threads[threadId] ?? null;
    },

    async saveThread(chat: PersistedChat): Promise<void> {
      const data = read();
      const now = Date.now();
      data.threads[chat.threadId] = {
        ...chat,
        version: PERSISTED_CHAT_VERSION,
        messages: trimToTurns(chat.messages, maxTurns),
        createdAt: chat.createdAt ?? now,
        updatedAt: chat.updatedAt ?? now,
      };
      const kept = sortedThreads(data).slice(0, Math.max(1, maxThreads));
      data.threads = Object.fromEntries(kept.map((t) => [t.threadId, t]));
      if (!data.threads[chat.threadId]) return;
      write(data, chat.threadId);
    },

    async deleteThread(threadId: string): Promise<void> {
      const data = read();
      if (!(threadId in data.threads)) return;
      delete data.threads[threadId];
      write(data);
    },
  };
}

export default createLocalStoragePersistence;
