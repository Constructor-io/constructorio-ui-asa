import { useCallback, useEffect, useRef, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';
import { AssistantSubmitSource, ChatMessage, UseAsaResultsOptions, UseChatReturn } from '../types';
import useAsaTracking from './useAsaTracking';
import useChatPersistence from './persistence/useChatPersistence';
import { AgentStreamHandle, readAgentStream } from './agentStream';
import { ChatSession, createChatSession, nextMessageId } from '../utils/chatSession';
import useLatest from './useLatest';

export default function useAsaResults(options?: UseAsaResultsOptions): UseChatReturn {
  const contextValue = useCioAsaContext();
  if (!contextValue) {
    throw new Error('useAsaResults must be used within a CioAsaProvider.');
  }
  const { cioClient, staticRequestConfigs, callbacks, section, persistence, persistenceScope } =
    contextValue;
  const { domain } = staticRequestConfigs || {};
  if (!cioClient || !domain) {
    throw new Error(
      'useAsaResults requires a configured cioClient and domain. Check your CioAsaProvider props.',
    );
  }

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionRef = useRef<ChatSession | null>(null);
  if (!sessionRef.current) sessionRef.current = createChatSession(options?.initialThreadId);
  const session = sessionRef.current;
  const streamRef = useRef<AgentStreamHandle | null>(null);

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
    streamRef.current?.cancel();
    streamRef.current = null;
  }, []);

  const store = useChatPersistence({
    store: persistence,
    scope: persistenceScope,
    session,
    initialThreadId: options?.initialThreadId,
    messages,
    setMessages,
    isStreaming,
    setIsStreaming,
    cancelStream,
  });

  const { beginTurn, onStreamStart } = store;

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

      const handle = readAgentStream(stream, assistantMessage.id, setMessages, {
        onStart: (threadId) => {
          if (threadId) session.serverThreadId = threadId;
          onStreamStart();
        },
        onLoadStart: (intentResultId) => {
          const args = { intent, intentResultId };
          trackingRef.current.trackResultLoadStarted(args);
          callbacksRef.current?.onResultLoadStart?.(args);
        },
        onFinish: (result) => {
          const args = { intent, ...result };
          trackingRef.current.trackResultLoadFinished(args);
          callbacksRef.current?.onResultLoadFinish?.(args);
        },
      });
      streamRef.current = handle;
      handle.done.then(() => {
        // A stream cancelled by a reset has already been accounted for.
        if (streamRef.current !== handle) return;
        streamRef.current = null;
        session.dirty = true;
        session.isStreaming = false;
        setIsStreaming(false);
      });
    },
    [
      cioClient,
      domain,
      session,
      beginTurn,
      onStreamStart,
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
   */
  const abort = useCallback(() => {
    if (!session.isStreaming) return;
    const abortedId = streamRef.current?.assistantId;
    cancelStream();
    session.isStreaming = false;
    setIsStreaming(false);
    if (abortedId) {
      setMessages((prev) =>
        prev.flatMap((msg) => {
          if (msg.id !== abortedId) return [msg];
          if (!msg.text && !msg.groups?.length && !msg.refinement) return [];
          return [{ ...msg, status: 'done' as const }];
        }),
      );
    }
    // With persistence on, the cancelled turn is stored as it stands.
    session.dirty = true;
  }, [session, cancelStream]);

  return {
    messages,
    sendMessage,
    isStreaming: isStreaming || store.foreignInFlight,
    abort,
    clearHistory: store.clearHistory,
    isHydrating: store.isHydrating,
    threads: store.threads,
    activeThreadId: store.activeThreadId,
    newThread: store.newThread,
    switchThread: store.switchThread,
  };
}
