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

/** Random token for the ids that must not collide between tabs: threads, tabs and messages. */
export function randomId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Client-side thread id for a conversation the server has not named yet. */
export function createLocalThreadId(): string {
  return `${LOCAL_THREAD_PREFIX}${randomId()}`;
}

const TAB_ID_KEY = 'cio-asa:tab';
let tabId: string | undefined;

/** Whether this page load is a reload, as opposed to a new, duplicated or restored tab. */
function isReload(): boolean {
  try {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return entry?.type === 'reload';
  } catch {
    return false;
  }
}

/**
 * Per-tab id: survives a reload, differs between tabs, `undefined` on the server. A duplicated tab
 * copies `sessionStorage`, so the id is read back on a reload only, and is kept there only while
 * the page is hidden.
 */
export function getTabId(): string | undefined {
  if (tabId) return tabId;
  if (typeof window === 'undefined') return undefined;
  const id = randomId();
  tabId = id;
  try {
    const { sessionStorage } = window;
    tabId = (isReload() && sessionStorage.getItem(TAB_ID_KEY)) || id;
    sessionStorage.removeItem(TAB_ID_KEY);
    const claimed = tabId;
    window.addEventListener('pagehide', () => {
      try {
        sessionStorage.setItem(TAB_ID_KEY, claimed);
      } catch {
        /* ignore */
      }
    });
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      try {
        sessionStorage.removeItem(TAB_ID_KEY);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* sessionStorage blocked: the id lasts for this page only */
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

/**
 * Saves `snapshot`, then deletes `staleIds` once the new record is read back. Stores may fail
 * without throwing, so both steps are checked by reading: `saved` is whether the snapshot landed,
 * `leftover` the stale ids still stored.
 */
export async function saveThreadAndRetireStale(
  store: ChatPersistence,
  snapshot: PersistedChat,
  staleIds: string[],
): Promise<{ saved: boolean; leftover: string[] }> {
  try {
    await store.saveThread(snapshot);
  } catch {
    return { saved: false, leftover: staleIds };
  }
  const persisted = await store.getThread(snapshot.threadId).catch(() => null);
  if (!persisted || persisted.updatedAt < snapshot.updatedAt) {
    return { saved: false, leftover: staleIds };
  }
  const retired = await Promise.all(
    staleIds.map(async (id) => {
      await store.deleteThread(id).catch(() => {});
      return (await store.getThread(id).catch(() => null)) === null;
    }),
  );
  return { saved: true, leftover: staleIds.filter((_, i) => !retired[i]) };
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

/** Whether a stored thread still reads as streaming: this tab's own always, another tab's only within the grace. */
export function isThreadStreaming(chat: PersistedChat, now = Date.now()): boolean {
  if (!isInFlight(chat.messages)) return false;
  if (chat.owner !== undefined && chat.owner === getTabId()) return true;
  return now - chat.updatedAt < IN_FLIGHT_GRACE_MS;
}

/** Ms left to show a stored answer as streaming in another tab; `0` when it should be settled. */
export function foreignStreamRemainingMs(chat: PersistedChat, now = Date.now()): number {
  if (!isInFlight(chat.messages)) return 0;
  if (chat.owner !== undefined && chat.owner === getTabId()) return 0;
  return Math.max(0, IN_FLIGHT_GRACE_MS - (now - chat.updatedAt));
}

/**
 * Moves every thread of `from` into `to`; copies of the chat on screen are not copied, its owner
 * saves it. A source record is deleted only once `to` holds it after every copy was made, so one
 * copy evicting another, or a save that did not land, leaves the source in place.
 */
export async function moveThreads(
  from: ChatPersistence,
  to: ChatPersistence,
  onScreen: { threadIds?: string[]; firstMessageId?: string } = {},
): Promise<void> {
  const { threadIds = [], firstMessageId } = onScreen;
  const summaries = await from.listThreads();
  const chats = (await Promise.all(summaries.map((t) => from.getThread(t.threadId)))).filter(
    (chat): chat is PersistedChat => chat !== null,
  );
  const isShown = (chat: PersistedChat) =>
    threadIds.includes(chat.threadId) ||
    (firstMessageId !== undefined && chat.messages[0]?.id === firstMessageId);
  const toCopy = chats.filter((chat) => !isShown(chat));
  await Promise.all(toCopy.map((chat) => to.saveThread(chat)));

  const targetList = await to.listThreads();
  const target = new Map(
    (await Promise.all(targetList.map((t) => to.getThread(t.threadId))))
      .filter((chat): chat is PersistedChat => chat !== null)
      .map((chat) => [chat.threadId, chat]),
  );
  const shownSaved = Array.from(target.values()).some(isShown);
  const moved = chats.filter((chat) => {
    if (isShown(chat)) return shownSaved;
    const copy = target.get(chat.threadId);
    return copy !== undefined && copy.updatedAt >= chat.updatedAt;
  });
  await Promise.all(moved.map((chat) => from.deleteThread(chat.threadId)));
}
