import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatPersistence, PersistedChat } from '../../types';
import {
  findRekeyedThread,
  foreignStreamRemainingMs,
  isInFlight,
  isLocalThreadId,
  normalizeHydratedMessages,
  saveThreadAndRetireStale,
} from '../../utils/chatPersistence';
import { ChatSession, adoptStoredChat, prepareSnapshot, resetConversation } from '../chatSession';
import useLatest from './useLatest';
import useWriteQueue from './useWriteQueue';
import useThreadList from './useThreadList';
import useForeignStream from './useForeignStream';

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

/** Restores, saves and syncs the conversation with `store`; inert when `store` is undefined. */
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
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const storeRef = useLatest(store);
  const messagesRef = useLatest(messages);
  const mountedRef = useRef(true);
  const { enqueue: enqueueWrite, reset: resetWrites } = useWriteQueue();
  const {
    threads,
    setThreads,
    refreshThreads,
    invalidate: invalidateThreads,
  } = useThreadList(storeRef);
  const {
    foreignInFlight,
    setForeignInFlight,
    watch: watchForeign,
    stop: stopForeign,
    clearTimer: clearForeignTimer,
  } = useForeignStream(session);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset during render so the previous store's conversation never paints under the new one.
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

  /** Puts a stored conversation on screen and makes it the one this tab continues. */
  const showStoredChat = useCallback(
    (chat: PersistedChat) => {
      adoptStoredChat(session, chat);
      setActiveThreadId(chat.threadId);
      const remainingMs = foreignStreamRemainingMs(chat);
      if (remainingMs === 0) {
        stopForeign();
        setMessages(normalizeHydratedMessages(chat.messages));
        // Write the settled snapshot back so the list stops reporting it in flight.
        if (isInFlight(chat.messages)) session.dirty = true;
        return;
      }
      setMessages(chat.messages);
      watchForeign(remainingMs, () => {
        if (!mountedRef.current || session.storageThreadId !== chat.threadId) return;
        if (session.isStreaming) return;
        session.dirty = true;
        setMessages((prev) => normalizeHydratedMessages(prev));
      });
    },
    [session, stopForeign, watchForeign, setMessages],
  );

  /** Writes the conversation as it is now. `settle` marks an in-flight answer as finished. */
  const persistNow = useCallback(
    (mode?: { settle?: boolean }): Promise<void> | undefined => {
      const { current } = storeRef;
      if (!current || messagesRef.current.length === 0) return undefined;
      const toSave = mode?.settle
        ? normalizeHydratedMessages(messagesRef.current)
        : messagesRef.current;
      const { snapshot, staleId } = prepareSnapshot(session, toSave);
      setActiveThreadId(snapshot.threadId);
      return enqueueWrite(async () => {
        const orphan = await saveThreadAndRetireStale(current, snapshot, staleId);
        if (orphan) session.orphanId = session.orphanId ?? orphan;
      });
    },
    [session, storeRef, messagesRef, enqueueWrite],
  );

  const settleAndPersist = useCallback(() => {
    if (session.isStreaming || session.dirty) return persistNow({ settle: true });
    return undefined;
  }, [session, persistNow]);

  /** Forget the conversation on screen; returns the id it was stored under. */
  const forgetConversation = useCallback(() => {
    stopForeign();
    cancelStream();
    const storedId = resetConversation(session);
    session.interacted = true;
    setActiveThreadId(null);
    setMessages([]);
    setIsStreaming(false);
    return storedId;
  }, [session, stopForeign, cancelStream, setMessages, setIsStreaming]);

  // Restore on mount, and again from scratch whenever the store changes.
  const storeInitializedRef = useRef(false);
  useEffect(() => {
    if (storeInitializedRef.current) {
      // The store changed (e.g. a login): start over instead of saving the old conversation into it.
      clearForeignTimer();
      cancelStream();
      resetConversation(session);
      session.interacted = false;
      invalidateThreads();
      resetWrites();
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
        const summaries = await store.listThreads();
        if (cancelled) return;
        if (session.interacted) {
          refreshThreads();
          return;
        }
        setThreads(summaries);
        const targetId = initialThreadId ?? summaries[0]?.threadId;
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
  }, [messages, isStreaming, session, storeRef, persistNow, refreshThreads]);

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
  }, [session, storeRef, messagesRef, refreshThreads, showStoredChat, forgetConversation]);

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
  }, [forgetConversation, storeRef, enqueueWrite, refreshThreads]);

  const leaveConversation = useCallback(() => {
    settleAndPersist()?.then(refreshThreads);
    forgetConversation();
  }, [settleAndPersist, refreshThreads, forgetConversation]);

  const newThread = useCallback(() => {
    if (storeRef.current) leaveConversation();
  }, [storeRef, leaveConversation]);

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
    [session, storeRef, leaveConversation, showStoredChat],
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
