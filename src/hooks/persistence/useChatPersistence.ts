import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatPersistence, PersistedChat, PersistenceScope } from '../../types';
import {
  findRekeyedThread,
  foreignStreamRemainingMs,
  isInFlight,
  isLocalThreadId,
  normalizeHydratedMessages,
  saveThreadAndRetireStale,
} from '../../utils/chatThreads';
import {
  ChatSession,
  adoptStoredChat,
  prepareSnapshot,
  resetConversation,
} from '../../utils/chatSession';
import useIsMounted from '../useIsMounted';
import useLatest from '../useLatest';
import useWriteQueue from './useWriteQueue';
import useThreadList from './useThreadList';
import useForeignStream from './useForeignStream';

interface Params {
  store: ChatPersistence | undefined;
  /** Whose store it is; a switch from `'guest'` to `'user'` carries the conversation over. */
  scope?: PersistenceScope;
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
    scope,
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
  const mountedRef = useIsMounted();
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

  // Reset during render so the previous store's conversation never paints under the new one.
  // A login keeps the guest conversation on screen instead and moves it into the shopper's store.
  const [rendered, setRendered] = useState({ store, scope });
  const carryOverFromRef = useRef<ChatPersistence | undefined>(undefined);
  const settleIntoRef = useRef<{ store: ChatPersistence; messages: ChatMessage[] } | undefined>(
    undefined,
  );
  if (rendered.store !== store) {
    const carryOver =
      rendered.store &&
      store &&
      rendered.scope === 'guest' &&
      scope === 'user' &&
      messages.length > 0;
    setRendered({ store, scope });
    setThreads([]);
    if (carryOver) {
      carryOverFromRef.current = rendered.store;
    } else {
      // An unfinished turn still belongs to the previous store; the effect below writes it there.
      if (rendered.store && messages.length > 0 && (session.isStreaming || session.dirty)) {
        settleIntoRef.current = { store: rendered.store, messages };
      }
      setMessages([]);
      setActiveThreadId(null);
      setForeignInFlight(false);
      setIsStreaming(false);
      setIsHydrating(Boolean(store));
    }
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
    [session, stopForeign, watchForeign, setMessages, mountedRef],
  );

  /** Writes the conversation as it is now; `settle` finishes an in-flight answer, `sync` skips awaiting. */
  const persistNow = useCallback(
    (mode?: { settle?: boolean; sync?: boolean }): Promise<void> | undefined => {
      const { current } = storeRef;
      if (!current || messagesRef.current.length === 0) return undefined;
      const toSave = mode?.settle
        ? normalizeHydratedMessages(messagesRef.current)
        : messagesRef.current;
      const { snapshot, staleIds } = prepareSnapshot(session, toSave);
      if (mode?.sync && current.saveThreadSync) {
        current.saveThreadSync(snapshot, staleIds);
        return undefined;
      }
      if (mountedRef.current) setActiveThreadId(snapshot.threadId);
      return enqueueWrite(async () => {
        const orphans = await saveThreadAndRetireStale(current, snapshot, staleIds);
        // A write that outlived a store switch must not leak its leftovers into the new store.
        if (orphans.length > 0 && storeRef.current === current) {
          session.orphanIds = Array.from(new Set([...session.orphanIds, ...orphans]));
        }
      });
    },
    [session, storeRef, messagesRef, enqueueWrite, mountedRef],
  );

  const settleAndPersist = useCallback(() => {
    if (session.isStreaming || session.dirty) return persistNow({ settle: true });
    return undefined;
  }, [session, persistNow]);

  /** Write the settled conversation without awaiting anything: the page is going away. */
  const flushBeforeUnload = useCallback(() => {
    if (!session.isStreaming && !session.dirty) return;
    if (storeRef.current?.saveThreadSync) session.dirty = false;
    persistNow({ settle: true, sync: true });
  }, [session, storeRef, persistNow]);

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
    const carryOverFrom = carryOverFromRef.current;
    carryOverFromRef.current = undefined;
    if (carryOverFrom && store) {
      // A login mid-conversation: the guest conversation continues as the shopper's own.
      stopForeign();
      invalidateThreads();
      const guestId = session.storageThreadId;
      // Behind the guest store's pending writes, so none of them can recreate the record.
      if (guestId) enqueueWrite(() => carryOverFrom.deleteThread(guestId).catch(() => {}));
      resetWrites();
      session.orphanIds = [];
      session.lastSyncedAt = 0;
      session.loadRequest += 1;
      session.interacted = true;
      if (session.isStreaming) {
        session.dirty = true;
      } else {
        session.dirty = false;
        persistNow()?.then(refreshThreads);
      }
      setIsHydrating(false);
      return undefined;
    }
    if (storeInitializedRef.current) {
      // The store changed (e.g. a logout): start over instead of saving the old conversation into it.
      clearForeignTimer();
      cancelStream();
      const settleInto = settleIntoRef.current;
      settleIntoRef.current = undefined;
      if (settleInto) {
        const { snapshot, staleIds } = prepareSnapshot(
          session,
          normalizeHydratedMessages(settleInto.messages),
        );
        enqueueWrite(() =>
          saveThreadAndRetireStale(settleInto.store, snapshot, staleIds).then(() => {}),
        );
      }
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
    window.addEventListener('pagehide', flushBeforeUnload);
    return () => window.removeEventListener('pagehide', flushBeforeUnload);
  }, [store, flushBeforeUnload]);
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
        if (rekeyed) {
          showStoredChat(rekeyed);
          return;
        }
        // Evicted or expired, not deleted: keep it; writing back here would ping-pong with the other tab.
        const deleted = current.isThreadDeleted ? await current.isThreadDeleted(activeId) : true;
        if (!stillActive()) return;
        if (deleted) forgetConversation();
        else session.dirty = true;
        return;
      }
      if (session.isStreaming) return;
      if (chat.updatedAt > session.lastSyncedAt) showStoredChat(chat);
    } catch {
      /* ignore */
    }
  }, [
    session,
    storeRef,
    messagesRef,
    refreshThreads,
    showStoredChat,
    forgetConversation,
    mountedRef,
  ]);

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
    [session, storeRef, leaveConversation, showStoredChat, mountedRef],
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
