import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatPersistence, PersistedChat, ThreadSummary } from '../types';
import {
  IN_FLIGHT_GRACE_MS,
  PERSISTED_CHAT_VERSION,
  createLocalThreadId,
  findRekeyedThread,
  getTabId,
  isInFlight,
  isLocalThreadId,
  nextMessageCounter,
  normalizeHydratedMessages,
  saveThreadAndRetireStale,
} from '../utils/chatPersistence';
import { ChatSession, resetConversation } from './chatSession';

interface Params {
  store: ChatPersistence | undefined;
  session: ChatSession;
  initialThreadId?: string;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;
  /** Stop the answer currently streaming in this tab, if any. */
  cancelStream: () => void;
}

/**
 * Keeps the conversation in `store` and in sync with it: restores it on mount, saves settled
 * turns, follows changes made by other tabs, and switches between stored threads. Everything
 * here is inert when `store` is undefined.
 */
export default function useChatPersistence(params: Params) {
  const {
    store,
    session,
    initialThreadId,
    messages,
    setMessages,
    isStreaming,
    setIsStreaming,
    cancelStream,
  } = params;
  const [isHydrating, setIsHydrating] = useState(Boolean(store));
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [foreignInFlight, setForeignInFlight] = useState(false);

  const storeRef = useRef(store);
  storeRef.current = store;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const mountedRef = useRef(true);
  const refreshRequestRef = useRef(0);
  const foreignTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Writes are chained so an async store applies them in the order they were issued.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset synchronously while rendering so the previous store's conversation is never
  // painted under the new one (e.g. right after a login change).
  const [renderedStore, setRenderedStore] = useState(store);
  if (renderedStore !== store) {
    setRenderedStore(store);
    setMessages([]);
    setThreads([]);
    setActiveThreadId(null);
    setForeignInFlight(false);
    setIsStreaming(false);
    setIsHydrating(Boolean(store));
  }

  const setForeign = useCallback(
    (value: boolean) => {
      session.foreignInFlight = value;
      setForeignInFlight(value);
    },
    [session],
  );

  const clearForeignTimer = useCallback(() => {
    if (foreignTimerRef.current) clearTimeout(foreignTimerRef.current);
    foreignTimerRef.current = null;
  }, []);

  const enqueueWrite = useCallback((run: () => Promise<void>) => {
    saveChainRef.current = saveChainRef.current.then(run, run);
    return saveChainRef.current;
  }, []);

  const refreshThreads = useCallback(async () => {
    const { current } = storeRef;
    if (!current) return;
    refreshRequestRef.current += 1;
    const request = refreshRequestRef.current;
    try {
      const list = await current.listThreads();
      if (mountedRef.current && request === refreshRequestRef.current) setThreads(list);
    } catch {
      /* ignore */
    }
  }, []);

  /** Puts a stored conversation on screen and makes it the one this tab continues. */
  const showStoredChat = useCallback(
    (chat: PersistedChat) => {
      clearForeignTimer();
      session.storageThreadId = chat.threadId;
      session.createdAt = chat.createdAt;
      session.serverThreadId = isLocalThreadId(chat.threadId) ? null : chat.threadId;
      session.idCounter = nextMessageCounter(chat.messages);
      session.lastSyncedAt = chat.updatedAt;
      setActiveThreadId(chat.threadId);

      const inFlight = isInFlight(chat.messages);
      const age = Date.now() - chat.updatedAt;
      // A record this tab wrote itself cannot still be streaming after a reload.
      const ownRecord = chat.owner !== undefined && chat.owner === getTabId();
      const streamingElsewhere = inFlight && !ownRecord && age < IN_FLIGHT_GRACE_MS;
      if (!streamingElsewhere) {
        setForeign(false);
        setMessages(normalizeHydratedMessages(chat.messages));
        // A stale in-flight snapshot is settled locally; write it back so the stored record
        // (and `inFlight` in the thread list) stops reporting a stream forever.
        if (inFlight) session.dirty = true;
        return;
      }
      setForeign(true);
      setMessages(chat.messages);
      foreignTimerRef.current = setTimeout(() => {
        foreignTimerRef.current = null;
        if (!mountedRef.current || session.storageThreadId !== chat.threadId) return;
        setForeign(false);
        if (session.isStreaming) return;
        session.dirty = true;
        setMessages((prev) => normalizeHydratedMessages(prev));
      }, IN_FLIGHT_GRACE_MS - age);
    },
    [session, clearForeignTimer, setForeign, setMessages],
  );

  /** Writes the conversation as it is now. `settle` marks an in-flight answer as finished. */
  const persistNow = useCallback(
    (mode?: { settle?: boolean }): Promise<void> | undefined => {
      const { current } = storeRef;
      if (!current || messagesRef.current.length === 0) return undefined;
      const toSave = mode?.settle
        ? normalizeHydratedMessages(messagesRef.current)
        : messagesRef.current;

      const previousId = session.storageThreadId;
      const threadId = session.serverThreadId ?? previousId ?? createLocalThreadId();
      session.storageThreadId = threadId;
      const staleId = (previousId !== threadId ? previousId : null) ?? session.orphanId;
      session.orphanId = null;
      // Strictly increasing so a save issued in the same millisecond as the previous one still
      // reads as newer to other tabs.
      const now = Math.max(Date.now(), session.lastSyncedAt + 1);
      session.createdAt = session.createdAt ?? now;
      session.lastSyncedAt = now;
      setActiveThreadId(threadId);
      const snapshot: PersistedChat = {
        version: PERSISTED_CHAT_VERSION,
        threadId,
        messages: toSave,
        createdAt: session.createdAt,
        updatedAt: now,
        owner: getTabId(),
      };
      // `current` is captured so a write still queued when the store changes lands where it
      // was meant to.
      return enqueueWrite(async () => {
        const orphan = await saveThreadAndRetireStale(current, snapshot, staleId);
        if (orphan) session.orphanId = session.orphanId ?? orphan;
      });
    },
    [session, enqueueWrite],
  );

  const settleAndPersist = useCallback(() => {
    if (session.isStreaming || session.dirty) return persistNow({ settle: true });
    return undefined;
  }, [session, persistNow]);

  /** Forget the conversation on screen; returns the id it was stored under. */
  const forgetConversation = useCallback(() => {
    clearForeignTimer();
    cancelStream();
    const storedId = resetConversation(session);
    session.interacted = true;
    setForeign(false);
    setActiveThreadId(null);
    setMessages([]);
    setIsStreaming(false);
    return storedId;
  }, [session, clearForeignTimer, cancelStream, setForeign, setMessages, setIsStreaming]);

  // Restore on mount, and again from scratch whenever the store changes.
  const storeInitializedRef = useRef(false);
  useEffect(() => {
    if (storeInitializedRef.current) {
      // A different user logged in: drop the previous store's conversation instead of saving it
      // into the new one, and restart the write chain so a slow old save cannot delay us.
      clearForeignTimer();
      cancelStream();
      resetConversation(session);
      session.interacted = false;
      refreshRequestRef.current += 1;
      saveChainRef.current = Promise.resolve();
    }
    storeInitializedRef.current = true;

    if (!store) {
      setIsHydrating(false);
      return undefined;
    }
    setIsHydrating(true);
    let cancelled = false;
    (async () => {
      try {
        const list = await store.listThreads();
        if (cancelled) return;
        if (session.interacted) {
          refreshThreads();
          return;
        }
        setThreads(list);
        const targetId = initialThreadId ?? list[0]?.threadId;
        const chat = targetId ? await store.getThread(targetId) : null;
        if (cancelled || session.interacted) return;
        if (!chat) {
          if (targetId && isLocalThreadId(targetId)) session.serverThreadId = null;
          return;
        }
        showStoredChat(chat);
      } catch {
        /* storage unavailable: start empty */
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
      clearForeignTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // Save once a turn has settled.
  useEffect(() => {
    if (!storeRef.current || messages.length === 0) return;
    if (isStreaming || !session.dirty) return;
    session.dirty = false;
    persistNow()?.then(refreshThreads);
  }, [messages, isStreaming, session, persistNow, refreshThreads]);

  // Leaving the page or unmounting mid-answer keeps the turn, settled.
  useEffect(() => {
    if (!store || typeof window === 'undefined') return undefined;
    window.addEventListener('pagehide', settleAndPersist);
    return () => window.removeEventListener('pagehide', settleAndPersist);
  }, [store, settleAndPersist]);
  useEffect(
    () => () => {
      settleAndPersist();
    },
    [settleAndPersist],
  );

  // Follow changes another tab made to the list or to the thread on screen.
  const syncFromStore = useCallback(async () => {
    const { current } = storeRef;
    if (!current) return;
    refreshThreads();
    const activeId = session.storageThreadId;
    if (!activeId) return;
    const stillActive = () => mountedRef.current && session.storageThreadId === activeId;
    try {
      const chat = await current.getThread(activeId);
      if (!stillActive()) return;
      if (!chat) {
        const rekeyed = isLocalThreadId(activeId)
          ? await findRekeyedThread(current, messagesRef.current[0]?.id)
          : null;
        if (!stillActive()) return;
        if (rekeyed) showStoredChat(rekeyed);
        else forgetConversation();
        return;
      }
      if (session.isStreaming) return;
      if (chat.updatedAt > session.lastSyncedAt) showStoredChat(chat);
    } catch {
      /* ignore */
    }
  }, [session, refreshThreads, showStoredChat, forgetConversation]);

  useEffect(() => {
    if (!store?.subscribe) return undefined;
    return store.subscribe(() => {
      syncFromStore();
    });
  }, [store, syncFromStore]);

  /** The user is sending a message: nothing still loading may land on top of it. */
  const beginTurn = useCallback(() => {
    session.interacted = true;
    session.loadRequest += 1;
    setIsHydrating(false);
  }, [session]);

  const onStreamStart = useCallback(() => {
    persistNow()?.then(refreshThreads);
  }, [persistNow, refreshThreads]);

  const clearHistory = useCallback(() => {
    const storedId = forgetConversation();
    const { current } = storeRef;
    if (!storedId || !current) return;
    // Queued behind pending saves so one of them cannot recreate the deleted thread.
    enqueueWrite(() => current.deleteThread(storedId).catch(() => {})).then(refreshThreads);
  }, [forgetConversation, enqueueWrite, refreshThreads]);

  const leaveConversation = useCallback(() => {
    settleAndPersist()?.then(refreshThreads);
    forgetConversation();
  }, [settleAndPersist, refreshThreads, forgetConversation]);

  const newThread = useCallback(() => {
    if (storeRef.current) leaveConversation();
  }, [leaveConversation]);

  const switchThread = useCallback(
    async (threadId: string) => {
      const { current } = storeRef;
      if (!current || threadId === session.storageThreadId) return;
      leaveConversation();
      const request = session.loadRequest;
      const stillWanted = () => mountedRef.current && request === session.loadRequest;
      setIsHydrating(true);
      try {
        const chat = await current.getThread(threadId);
        if (stillWanted() && chat) showStoredChat(chat);
      } catch {
        /* keep the empty conversation */
      } finally {
        if (stillWanted()) setIsHydrating(false);
      }
    },
    [session, leaveConversation, showStoredChat],
  );

  return {
    isHydrating,
    threads,
    activeThreadId,
    foreignInFlight,
    beginTurn,
    onStreamStart,
    clearHistory,
    newThread,
    switchThread,
  };
}
