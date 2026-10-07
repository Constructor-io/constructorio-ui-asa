import { useCallback, useEffect, useRef, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';
import { AssistantSubmitSource, ChatMessage, UseAsaResultsOptions, UseChatReturn } from '../types';
import useAsaTracking from './useAsaTracking';
import useChatPersistence from './persistence/useChatPersistence';
import { LiveTurn, startTurn } from './agentStream';
import { ChatSession, createChatSession, nextMessageId } from '../utils/chatSession';
import { normalizeItemToProduct } from '../utils/productNormalizer';
import { settleCancelledReply } from '../utils/chatThreads';
import useLatest from './useLatest';

export default function useAsaResults(options?: UseAsaResultsOptions): UseChatReturn {
  const contextValue = useCioAsaContext();
  if (!contextValue) {
    throw new Error('useAsaResults must be used within a CioAsaProvider.');
  }
  const {
    cioClient,
    staticRequestConfigs,
    callbacks,
    section,
    persistence,
    persistenceScope,
    persistenceIndex,
  } = contextValue;
  const { domain } = staticRequestConfigs || {};
  if (!cioClient || !domain) {
    throw new Error(
      'useAsaResults requires a configured cioClient and domain. Check your CioAsaProvider props.',
    );
  }

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const normalizeItemRef = useLatest(options?.normalizeItem);
  const sessionRef = useRef<ChatSession | null>(null);
  if (!sessionRef.current) {
    sessionRef.current = createChatSession(options?.initialThreadId, (item) =>
      (normalizeItemRef.current ?? normalizeItemToProduct)(item),
    );
  }
  const session = sessionRef.current;
  const turnRef = useRef<LiveTurn | null>(null);

  const tracking = useAsaTracking({
    tracker: cioClient.tracker,
    section,
    threadId: session.serverThreadId ?? undefined,
  });
  const trackingRef = useLatest(tracking);
  const callbacksRef = useLatest(callbacks);
  const staticRequestConfigsRef = useLatest(staticRequestConfigs);

  /** Stops this tab's stream, if any. `readAgentStream` settles its `done` without touching state. */
  const cancelStream = useCallback(() => {
    turnRef.current?.cancel();
    turnRef.current = null;
  }, []);

  const abortOwnTurn = useCallback(() => {
    if (!session.isStreaming) return;
    const abortedId = turnRef.current?.assistantId;
    cancelStream();
    session.isStreaming = false;
    setIsStreaming(false);
    if (abortedId) setMessages((prev) => settleCancelledReply(prev, abortedId));
    // With persistence on, the cancelled turn is stored as it stands.
    session.dirty = true;
  }, [session, cancelStream]);

  const store = useChatPersistence({
    store: persistence,
    scope: persistenceScope,
    index: persistenceIndex,
    session,
    initialThreadId: options?.initialThreadId,
    messages,
    setMessages,
    isStreaming,
    setIsStreaming,
    turnRef,
    cancelStream,
    abortTurn: abortOwnTurn,
  });

  const { beginTurn, screenOwner, abortForeign } = store;

  useEffect(() => cancelStream, [cancelStream]);

  const sendMessage = useCallback(
    (text: string, source: AssistantSubmitSource = 'input') => {
      const intent = text.trim();
      if (!intent || session.isStreaming || session.foreignInFlight) return;
      beginTurn();

      trackingRef.current.trackSubmit(intent);
      callbacksRef.current?.onAssistantSubmit?.({ intent, source });

      const userMessage: ChatMessage = {
        id: nextMessageId(session),
        role: 'user',
        text: intent,
        status: 'done',
      };
      const assistantMessage: ChatMessage = {
        id: nextMessageId(session),
        role: 'assistant',
        text: '',
        groups: [],
        status: 'loading',
        intent,
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      session.isStreaming = true;

      const agentParams = { ...staticRequestConfigsRef.current };
      delete agentParams.intent;
      delete agentParams.threadId;
      const stream = cioClient.agent.getAgentResultsStream(intent, {
        ...agentParams,
        domain,
        ...(session.serverThreadId && { threadId: session.serverThreadId }),
      });

      turnRef.current = startTurn(stream, assistantMessage, screenOwner, {
        onLoadStart: (intentResultId) => {
          const args = { intent, intentResultId };
          trackingRef.current.trackResultLoadStarted(args);
          callbacksRef.current?.onResultLoadStart?.(args);
        },
        onFinish: ({ threadId, ...result }) => {
          const args = { intent, ...result };
          // The turn may have finished in the background, after the chat moved to another thread.
          trackingRef.current.trackResultLoadFinished({ ...args, threadId });
          callbacksRef.current?.onResultLoadFinish?.(args);
        },
      });
    },
    [
      cioClient,
      domain,
      session,
      beginTurn,
      screenOwner,
      trackingRef,
      callbacksRef,
      staticRequestConfigsRef,
    ],
  );

  /**
   * Cancels the in-flight request while keeping the conversation: the partial reply is
   * settled as `done` (so the typing indicator stops and streamed text survives) and the
   * thread id is kept, so the next message continues the same conversation rather than
   * starting a new one. Use `clearHistory` to reset instead.
   *
   * A reply that had streamed nothing yet is dropped rather than settled — it would
   * otherwise render as a blank bubble, and a cancelled turn would read as a glitch.
   * "Nothing" means no text, no product groups and no follow-up refinement; any one of
   * them is content worth keeping. The user's own message always stays.
   *
   * No beacon is sent: there is no "aborted" ASA event, and reporting the load as
   * finished would be false. An aborted turn therefore leaves an
   * `assistant_result_load_started` with no matching finished event.
   *
   * An answer streaming in another tab is stopped by that tab, which stores the result.
   */
  const abort = useCallback(() => {
    if (session.isStreaming) abortOwnTurn();
    else abortForeign();
  }, [session, abortOwnTurn, abortForeign]);

  return {
    messages,
    sendMessage,
    isStreaming: isStreaming || store.foreignInFlight,
    canAbort: isStreaming || store.canAbortForeign,
    abort,
    clearHistory: store.clearHistory,
    isHydrating: store.isHydrating,
    threads: store.threads,
    activeThreadId: store.activeThreadId,
    newThread: store.newThread,
    switchThread: store.switchThread,
  };
}
