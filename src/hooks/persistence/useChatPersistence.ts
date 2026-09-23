import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatPersistence, PersistedChat, PersistenceScope } from '../../types';
import {
  findRekeyedThread,
  foreignStreamRemainingMs,
  isInFlight,
  mergeMessages,
  isLocalThreadId,
  moveThreads,
  normalizeHydratedMessages,
  saveThreadAndRetireStale,
} from '../../utils/chatThreads';
import {
  ChatSession,
  adoptStoredChat,
  isOwnMessage,
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
  /** Api key and domain of `store`; a login into another index does not carry anything over. */
  index?: string;
  session: ChatSession;
  initialThreadId?: string;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;
  /** Stop the answer currently streaming in this tab, if any. */
  cancelStream: () => void;
}

/** Whether the conversation has something storage does not have yet: a turn, or ids to retire. */
const hasUnsavedWork = (session: ChatSession) =>
  session.isStreaming || session.dirty || session.orphanIds.length > 0;

/** Restores, saves and syncs the conversation with `store`; inert when `store` is undefined. */
export default function useChatPersistence(params: Params) {
  const {
    store,
    scope,
    index,
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
  // Async writes not yet committed; the page may go away before a queued one gets its lock.
  const pendingWritesRef = useRef(0);
  // Another tab changed the thread while this one streamed; looked at again once the turn is saved.
  const missedSyncRef = useRef(false);
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
  const [rendered, setRendered] = useState({ store, scope, index });
  const carryOverFromRef = useRef<ChatPersistence | undefined>(undefined);
  // Every guest thread moves into the shopper's store on login, so none is left for the next guest.
  const migrateFromRef = useRef<ChatPersistence | undefined>(undefined);
  const settleIntoRef = useRef<{ store: ChatPersistence; messages: ChatMessage[] } | undefined>(
    undefined,
  );
  if (rendered.store !== store) {
    const login =
      rendered.store &&
      store &&
      rendered.index === index &&
      rendered.scope === 'guest' &&
      scope === 'user';
    const carryOver = login && messages.length > 0;
    setRendered({ store, scope, index });
    setThreads([]);
    if (login) migrateFromRef.current = rendered.store;
    if (carryOver) {
      carryOverFromRef.current = rendered.store;
    } else {
      // An unfinished turn still belongs to the previous store; the effect below writes it there.
      if (rendered.store && messages.length > 0 && hasUnsavedWork(session)) {
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
      pendingWritesRef.current += 1;
      return enqueueWrite(async () => {
        const { saved, leftover } = await saveThreadAndRetireStale(
          current,
          snapshot,
          staleIds,
        ).finally(() => {
          pendingWritesRef.current -= 1;
        });
        // Leftovers of a conversation the user has since left stay stored: they may be its only copy.
        const sameConversation =
          storeRef.current === current && session.storageThreadId === snapshot.threadId;
        if (!sameConversation) return;
        if (leftover.length > 0) {
          session.orphanIds = Array.from(new Set([...session.orphanIds, ...leftover]));
        }
        // Not stored and no newer snapshot on its way: pagehide or the next save must write it.
        if (!saved && session.lastSyncedAt === snapshot.updatedAt) session.dirty = true;
      });
    },
    [session, storeRef, messagesRef, enqueueWrite, mountedRef],
  );

  const settleAndPersist = useCallback(() => {
    if (hasUnsavedWork(session)) return persistNow({ settle: true });
    return undefined;
  }, [session, persistNow]);

  /** Write the settled conversation without awaiting anything: the page is going away. */
  const flushBeforeUnload = useCallback(() => {
    if (!hasUnsavedWork(session) && pendingWritesRef.current === 0) return;
    if (storeRef.current?.saveThreadSync) session.dirty = false;
    persistNow({ settle: true, sync: true });
  }, [session, storeRef, persistNow]);

  /** Forget the conversation on screen; returns every id it is stored under. */
  const forgetConversation = useCallback(() => {
    stopForeign();
    cancelStream();
    const { orphanIds } = session;
    const storedId = resetConversation(session);
    session.interacted = true;
    setActiveThreadId(null);
    setMessages([]);
    setIsStreaming(false);
    return storedId ? [storedId, ...orphanIds] : orphanIds;
  }, [session, stopForeign, cancelStream, setMessages, setIsStreaming]);

  // Restore on mount, and again from scratch whenever the store changes. Compared by store, not
  // by a first-run flag, so StrictMode re-running the mount effect is not taken for a switch.
  const effectStoreRef = useRef<{ store: ChatPersistence | undefined } | null>(null);
  useEffect(() => {
    const previous = effectStoreRef.current;
    effectStoreRef.current = { store };
    const carryOverFrom = carryOverFromRef.current;
    carryOverFromRef.current = undefined;
    const migrateFrom = migrateFromRef.current;
    migrateFromRef.current = undefined;
    // Behind the guest store's pending writes, so none of them can recreate a moved record.
    const migrate = (onScreen?: Parameters<typeof moveThreads>[2]) =>
      migrateFrom && store
        ? enqueueWrite(() => moveThreads(migrateFrom, store, onScreen).catch(() => {}))
        : undefined;
    if (carryOverFrom && store && migrateFrom) {
      // A login mid-conversation: the guest conversation continues as the shopper's own.
      stopForeign();
      invalidateThreads();
      const onScreen = {
        threadIds: [session.storageThreadId, ...session.orphanIds].filter(
          (id): id is string => id !== null,
        ),
        firstMessageId: messagesRef.current[0]?.id,
      };
      const guestWritesDone = enqueueWrite(async () => {});
      resetWrites();
      session.orphanIds = [];
      session.lastSyncedAt = 0;
      session.loadRequest += 1;
      session.interacted = true;
      // Saved into the shopper's store first: the guest copies are deleted only once it is there.
      session.dirty = session.isStreaming;
      const saved = persistNow();
      Promise.all([guestWritesDone, saved])
        .then(() => moveThreads(migrateFrom, store, onScreen))
        .catch(() => {})
        .then(refreshThreads);
      setIsHydrating(false);
      return undefined;
    }
    if (previous && previous.store !== store) {
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
      migrate()?.then(refreshThreads);
      resetConversation(session);
      session.interacted = false;
      invalidateThreads();
      resetWrites();
    }

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
      if (session.isStreaming) {
        missedSyncRef.current = true;
        return;
      }
      if (chat.updatedAt > session.lastSyncedAt) {
        showStoredChat(chat);
        return;
      }
      // Turns another tab merged in while this one streamed: add them, and store the full view.
      const shown = new Set(messagesRef.current.map((m) => m.id));
      if (chat.messages.some((m) => !shown.has(m.id) && !isOwnMessage(session, m.id))) {
        session.dirty = true;
        setMessages((prev) => mergeMessages(chat.messages, prev));
      }
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
    setMessages,
  ]);

  // Save once a turn has settled.
  useEffect(() => {
    if (!storeRef.current || messages.length === 0) return;
    if (isStreaming || !session.dirty) return;
    session.dirty = false;
    persistNow()?.then(() => {
      if (!missedSyncRef.current) {
        refreshThreads();
        return;
      }
      missedSyncRef.current = false;
      syncFromStore();
    });
  }, [messages, isStreaming, session, storeRef, persistNow, refreshThreads, syncFromStore]);

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
    const storedIds = forgetConversation();
    const { current } = storeRef;
    if (storedIds.length === 0 || !current) return;
    // Queued behind pending saves so one of them cannot recreate the deleted thread.
    enqueueWrite(() =>
      Promise.all(storedIds.map((id) => current.deleteThread(id).catch(() => {}))).then(() => {}),
    ).then(refreshThreads);
  }, [forgetConversation, storeRef, enqueueWrite, refreshThreads]);

  const leaveConversation = useCallback(() => {
    settleAndPersist()?.then(refreshThreads);
    forgetConversation();
  }, [settleAndPersist, refreshThreads, forgetConversation]);

  const newThread = leaveConversation;

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
