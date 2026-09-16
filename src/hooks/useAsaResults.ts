import { useCallback, useEffect, useRef, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';
import {
  AssistantSubmitSource,
  ChatPersistence,
  ResultGroupMeta,
  ChatMessage,
  PersistedChat,
  ThreadSummary,
  UseAsaResultsOptions,
  UseChatReturn,
} from '../types';
import {
  handleSearchResult,
  handleMessage,
  handleFollowUpRefinement,
  handleServerError,
  handleStreamEnd,
  handleStreamError,
} from './asaStreamHandlers';
import useAsaTracking from './useAsaTracking';
import {
  IN_FLIGHT_GRACE_MS,
  PERSISTED_CHAT_VERSION,
  createLocalThreadId,
  isInFlight,
  isLocalThreadId,
  normalizeHydratedMessages,
} from '../utils/chatPersistence';

export default function useAsaResults(options?: UseAsaResultsOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const killSwitchRef = useRef(false);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const threadIdRef = useRef<string | null>(options?.initialThreadId ?? null);
  const idCounterRef = useRef(0);

  const contextValue = useCioAsaContext();
  if (!contextValue) {
    throw new Error('useAsaResults must be used within a CioAsaProvider.');
  }
  const { cioClient, staticRequestConfigs, callbacks, section, persistence } = contextValue;
  const { domain } = staticRequestConfigs || {};
  if (!cioClient || !domain) {
    throw new Error(
      'useAsaResults requires a configured cioClient and domain. Check your CioAsaProvider props.',
    );
  }

  const [isHydrating, setIsHydrating] = useState(Boolean(persistence));
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const persistenceRef = useRef(persistence);
  persistenceRef.current = persistence;
  const storageThreadIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const interactedRef = useRef(false);
  const loadRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const lastSyncedAtRef = useRef(0);
  const lastSavedCountRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const inFlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearInFlightTimer = useCallback(() => {
    if (inFlightTimerRef.current) {
      clearTimeout(inFlightTimerRef.current);
      inFlightTimerRef.current = null;
    }
  }, []);

  const refreshThreads = useCallback(async () => {
    const store = persistenceRef.current;
    if (!store) return;
    try {
      const list = await store.listThreads();
      if (mountedRef.current) setThreads(list);
    } catch {
      /* ignore */
    }
  }, []);

  const applyChat = useCallback(
    (chat: PersistedChat) => {
      clearInFlightTimer();
      storageThreadIdRef.current = chat.threadId;
      createdAtRef.current = chat.createdAt;
      threadIdRef.current = isLocalThreadId(chat.threadId) ? null : chat.threadId;
      idCounterRef.current = chat.messages.length;
      lastSyncedAtRef.current = chat.updatedAt;
      lastSavedCountRef.current = chat.messages.length;
      setActiveThreadId(chat.threadId);

      const age = Date.now() - chat.updatedAt;
      const stillStreamingElsewhere = isInFlight(chat.messages) && age < IN_FLIGHT_GRACE_MS;
      if (!stillStreamingElsewhere) {
        setMessages(normalizeHydratedMessages(chat.messages));
        return;
      }
      setMessages(chat.messages);
      inFlightTimerRef.current = setTimeout(() => {
        inFlightTimerRef.current = null;
        if (!mountedRef.current || storageThreadIdRef.current !== chat.threadId) return;
        setMessages((prev) => normalizeHydratedMessages(prev));
      }, IN_FLIGHT_GRACE_MS - age);
    },
    [clearInFlightTimer],
  );

  const tracking = useAsaTracking({
    tracker: cioClient.tracker,
    section,
    threadId: threadIdRef.current ?? undefined,
  });
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const staticRequestConfigsRef = useRef(staticRequestConfigs);
  staticRequestConfigsRef.current = staticRequestConfigs;

  const nextMessageId = useCallback(() => {
    idCounterRef.current += 1;
    return `msg-${idCounterRef.current}-${Date.now()}`;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const store = persistenceRef.current;
    if (!store) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const list = await store.listThreads();
        if (cancelled) return;
        setThreads(list);
        const targetId = options?.initialThreadId ?? list[0]?.threadId;
        const chat = targetId ? await store.getThread(targetId) : null;
        if (cancelled || !chat || interactedRef.current) return;
        applyChat(chat);
      } catch {
        /* storage unavailable: start empty */
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearInFlightTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistNow = useCallback((): Promise<void> | undefined => {
    const store = persistenceRef.current;
    const { current } = messagesRef;
    if (!store || current.length === 0) return undefined;

    const previousId = storageThreadIdRef.current;
    const threadId = threadIdRef.current ?? previousId ?? createLocalThreadId();
    storageThreadIdRef.current = threadId;
    if (previousId && previousId !== threadId) {
      store.deleteThread(previousId).catch(() => {});
    }
    const now = Date.now();
    createdAtRef.current = createdAtRef.current ?? now;
    lastSyncedAtRef.current = now;
    lastSavedCountRef.current = current.length;
    setActiveThreadId(threadId);
    return store
      .saveThread({
        version: PERSISTED_CHAT_VERSION,
        threadId,
        messages: current,
        createdAt: createdAtRef.current,
        updatedAt: now,
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!persistenceRef.current || messages.length === 0) return;
    if (isStreaming || !dirtyRef.current) return;
    dirtyRef.current = false;
    persistNow()?.then(refreshThreads);
  }, [messages, isStreaming, persistNow, refreshThreads]);

  useEffect(() => {
    if (!persistenceRef.current || typeof window === 'undefined') return undefined;
    const onPageHide = () => {
      if (isStreamingRef.current) persistNow();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [persistNow]);

  const sendMessage = useCallback(
    (text: string, source: AssistantSubmitSource = 'input') => {
      const intent = text.trim();
      if (!intent || isStreamingRef.current) return;
      interactedRef.current = true;

      trackingRef.current.trackSubmit(intent);
      callbacksRef.current?.onAssistantSubmit?.({ intent, source });

      const userMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'user',
        text: intent,
        status: 'done',
      };

      const assistantMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'assistant',
        text: '',
        groups: [],
        status: 'loading',
        intent,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      isStreamingRef.current = true;
      killSwitchRef.current = false;

      // `intent` is passed as the first argument and `threadId` is managed per-stream
      // below, so both are stripped here. Everything else configured on the provider
      // (filters, guard, numResultsPerEvent, numResultEvents, qsParam,
      // preFilterExpression, fmtOptions, ...) is forwarded to the agent as-is.
      const agentParams = { ...staticRequestConfigsRef.current };
      delete agentParams.intent;
      delete agentParams.threadId;
      const stream = cioClient.agent.getAgentResultsStream(intent, {
        ...agentParams,
        domain,
        ...(threadIdRef.current && { threadId: threadIdRef.current }),
      });
      const reader = stream.getReader();
      readerRef.current = reader;

      // Mutable per-stream state kept on an object so the closures below don't capture
      // reassigned loop-locals (which eslint's no-loop-func forbids).
      const streamState = {
        pendingGroup: null as ResultGroupMeta | null,
        intentResultId: undefined as string | undefined,
        loadStartFired: false,
        groupCount: 0,
      };

      const patchAssistant = (patch: Partial<ChatMessage>) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessage.id ? { ...m, ...patch } : m)),
        );
      };

      const fireLoadStart = () => {
        if (streamState.loadStartFired) return;
        streamState.loadStartFired = true;
        const args = { intent, intentResultId: streamState.intentResultId };
        trackingRef.current.trackResultLoadStarted(args);
        callbacksRef.current?.onResultLoadStart?.(args);
      };

      (async () => {
        try {
          // eslint-disable-next-line no-await-in-loop
          while (!killSwitchRef.current) {
            // eslint-disable-next-line no-await-in-loop
            const res = await reader.read();
            if (killSwitchRef.current) break;
            if (res.done) {
              handleStreamEnd(assistantMessage.id, setMessages);
              const finishArgs = {
                intent,
                searchResultCount: streamState.groupCount,
                intentResultId: streamState.intentResultId,
              };
              trackingRef.current.trackResultLoadFinished(finishArgs);
              callbacksRef.current?.onResultLoadFinish?.(finishArgs);
              break;
            }

            const { type, data } = res.value;

            // `intent_result_id` is shared across the stream; capture it from the first
            // event that carries it so load-start/finish can attribute correctly.
            if (!streamState.intentResultId && data?.intent_result_id) {
              streamState.intentResultId = data.intent_result_id;
              patchAssistant({ intentResultId: streamState.intentResultId });
            }

            if (type === 'start') {
              if (data?.thread_id) {
                threadIdRef.current = data.thread_id;
                patchAssistant({ threadId: data.thread_id });
              }
              persistNow()?.then(refreshThreads);
              fireLoadStart();
            } else if (type === 'group') {
              streamState.pendingGroup = {
                display_name: data?.display_name ?? data?.group ?? '',
                value: data?.value ?? data?.group ?? '',
              };
            } else if (type === 'search_result') {
              fireLoadStart();
              streamState.groupCount += 1;
              streamState.pendingGroup = handleSearchResult(
                data,
                streamState.pendingGroup,
                assistantMessage.id,
                setMessages,
              );
            } else if (type === 'message') {
              fireLoadStart();
              handleMessage(data, assistantMessage.id, setMessages);
            } else if (type === 'follow_up_refinement') {
              fireLoadStart();
              handleFollowUpRefinement(data, assistantMessage.id, setMessages);
            } else if (type === 'server_error') {
              handleServerError(assistantMessage.id, setMessages);
              break;
            }
          }
        } catch {
          handleStreamError(assistantMessage.id, setMessages);
        } finally {
          if (readerRef.current === reader) {
            reader.cancel();
            readerRef.current = null;
            dirtyRef.current = true;
            setIsStreaming(false);
            isStreamingRef.current = false;
          }
        }
      })();
    },
    [cioClient, domain, nextMessageId, persistNow, refreshThreads],
  );

  useEffect(
    () => () => {
      killSwitchRef.current = true;
      if (readerRef.current) {
        readerRef.current.cancel();
        readerRef.current = null;
      }
    },
    [],
  );

  const resetConversation = useCallback(() => {
    clearInFlightTimer();
    killSwitchRef.current = true;
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    threadIdRef.current = null;
    const storedId = storageThreadIdRef.current;
    storageThreadIdRef.current = null;
    createdAtRef.current = null;
    dirtyRef.current = false;
    interactedRef.current = true;
    loadRequestRef.current += 1;
    lastSyncedAtRef.current = 0;
    lastSavedCountRef.current = 0;
    setActiveThreadId(null);
    setMessages([]);
    setIsStreaming(false);
    isStreamingRef.current = false;
    return storedId;
  }, [clearInFlightTimer]);

  const clearHistory = useCallback(() => {
    const storedId = resetConversation();
    const store = persistenceRef.current;
    if (storedId && store) {
      store
        .deleteThread(storedId)
        .catch(() => {})
        .then(refreshThreads);
    }
  }, [resetConversation, refreshThreads]);

  const newThread = useCallback(() => {
    resetConversation();
  }, [resetConversation]);

  const switchThread = useCallback(
    async (threadId: string) => {
      const store = persistenceRef.current;
      if (!store || threadId === storageThreadIdRef.current) return;
      resetConversation();
      const request = loadRequestRef.current;
      setIsHydrating(true);
      try {
        const chat = await store.getThread(threadId);
        if (!mountedRef.current || request !== loadRequestRef.current) return;
        if (chat) applyChat(chat);
      } catch {
        /* keep the empty conversation */
      } finally {
        if (mountedRef.current && request === loadRequestRef.current) setIsHydrating(false);
      }
    },
    [resetConversation, applyChat],
  );

  const findRekeyedThread = useCallback(
    async (store: ChatPersistence): Promise<PersistedChat | null> => {
      const firstId = messagesRef.current[0]?.id;
      if (!firstId) return null;
      const list = await store.listThreads();
      const candidates = list.filter((t) => !isLocalThreadId(t.threadId));
      const loaded = await Promise.all(candidates.map((t) => store.getThread(t.threadId)));
      return loaded.find((c) => c?.messages[0]?.id === firstId) ?? null;
    },
    [],
  );

  const syncFromStorage = useCallback(async () => {
    const store = persistenceRef.current;
    if (!store) return;
    refreshThreads();
    const activeId = storageThreadIdRef.current;
    if (!activeId) return;
    try {
      const chat = await store.getThread(activeId);
      if (!mountedRef.current || storageThreadIdRef.current !== activeId) return;
      if (!chat) {
        const rekeyed = isLocalThreadId(activeId) ? await findRekeyedThread(store) : null;
        if (!mountedRef.current || storageThreadIdRef.current !== activeId) return;
        if (rekeyed) applyChat(rekeyed);
        else resetConversation();
        return;
      }
      if (isStreamingRef.current) return;
      if (chat.updatedAt > lastSyncedAtRef.current) applyChat(chat);
    } catch {
      /* ignore */
    }
  }, [refreshThreads, resetConversation, applyChat, findRekeyedThread]);

  useEffect(() => {
    const store = persistenceRef.current;
    if (!store?.subscribe) return undefined;
    return store.subscribe(() => {
      syncFromStorage();
    });
  }, [syncFromStorage]);

  return {
    messages,
    sendMessage,
    isStreaming,
    clearHistory,
    isHydrating,
    threads,
    activeThreadId,
    newThread,
    switchThread,
  };
}
