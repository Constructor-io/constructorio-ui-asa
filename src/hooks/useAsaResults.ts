import { useCallback, useEffect, useRef, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';
import { AssistantSubmitSource, ResultGroupMeta, ChatMessage, UseChatReturn } from '../types';
import {
  handleSearchResult,
  handleMessage,
  handleServerError,
  handleStreamEnd,
  handleStreamError,
} from './asaStreamHandlers';
import useAsaTracking from './useAsaTracking';

export default function useAsaResults(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const killSwitchRef = useRef(false);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const idCounterRef = useRef(0);

  const contextValue = useCioAsaContext();
  if (!contextValue) {
    throw new Error('useAsaResults must be used within a CioAsaProvider.');
  }
  const { cioClient, staticRequestConfigs, callbacks, section } = contextValue;
  const { domain } = staticRequestConfigs || {};
  if (!cioClient || !domain) {
    throw new Error(
      'useAsaResults requires a configured cioClient and domain. Check your CioAsaProvider props.',
    );
  }

  const tracking = useAsaTracking({
    tracker: cioClient.tracker,
    section,
    threadId: threadIdRef.current ?? undefined,
  });
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const nextMessageId = useCallback(() => {
    idCounterRef.current += 1;
    return `msg-${idCounterRef.current}-${Date.now()}`;
  }, []);

  const sendMessage = useCallback(
    (text: string, source: AssistantSubmitSource = 'input') => {
      const intent = text.trim();
      if (!intent || isStreamingRef.current) return;

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

      const stream = cioClient.agent.getAgentResultsStream(intent, {
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
            setIsStreaming(false);
            isStreamingRef.current = false;
          }
        }
      })();
    },
    [cioClient, domain, nextMessageId],
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

  const clearHistory = useCallback(() => {
    killSwitchRef.current = true;
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    threadIdRef.current = null;
    setMessages([]);
    setIsStreaming(false);
    isStreamingRef.current = false;
  }, []);

  return { messages, sendMessage, isStreaming, clearHistory };
}
