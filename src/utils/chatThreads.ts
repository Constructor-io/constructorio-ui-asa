import type { ChatMessage, ChatPersistence, PersistedChat } from '../types';

/** Stored record format; records with another version are ignored on read. */
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

/** Per-tab id from `sessionStorage`: survives a reload, differs between tabs, `undefined` on the server. */
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

/** Counter to continue message ids from after a restore, so new ids never collide with restored ones. */
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

/** Settles answers stored mid-stream: `done` when they have content, `error` otherwise. */
export function normalizeHydratedMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (m.status !== 'loading' && m.status !== 'streaming') return m;
    const hasContent = Boolean(m.text) || Boolean(m.groups?.length) || Boolean(m.refinement);
    return { ...m, status: hasContent ? 'done' : 'error' };
  });
}

/** Both lists in stored order; a shared message takes the incoming version unless `preferStored`. */
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

/** Saves `snapshot`, then deletes `staleId` once the new record is confirmed; returns the id still to delete. */
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
  if (!persisted || persisted.updatedAt < snapshot.updatedAt) return staleId;
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

/** Ms left to show a stored answer as streaming in another tab; `0` when it should be settled. */
export function foreignStreamRemainingMs(chat: PersistedChat, now = Date.now()): number {
  if (!isInFlight(chat.messages)) return 0;
  if (chat.owner !== undefined && chat.owner === getTabId()) return 0;
  return Math.max(0, IN_FLIGHT_GRACE_MS - (now - chat.updatedAt));
}
