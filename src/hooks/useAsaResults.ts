import { useCallback, useEffect, useRef, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';
import { ResultGroupMeta, ChatMessage, UseChatReturn } from '../types';
import {
  handleSearchResult,
  handleMessage,
  handleServerError,
  handleStreamEnd,
  handleStreamError,
} from './asaStreamHandlers';

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
  const { cioClient, staticRequestConfigs } = contextValue;
  const { domain } = staticRequestConfigs || {};
  if (!cioClient || !domain) {
    throw new Error(
      'useAsaResults requires a configured cioClient and domain. Check your CioAsaProvider props.',
    );
  }

  const nextMessageId = useCallback(() => {
    idCounterRef.current += 1;
    return `msg-${idCounterRef.current}-${Date.now()}`;
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isStreamingRef.current) return;

      const userMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'user',
        text: text.trim(),
        status: 'done',
      };

      const assistantMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'assistant',
        text: '',
        groups: [],
        status: 'loading',
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      isStreamingRef.current = true;
      killSwitchRef.current = false;

      const stream = cioClient.agent.getAgentResultsStream(text.trim(), {
        domain,
        ...(threadIdRef.current && { threadId: threadIdRef.current }),
      });
      const reader = stream.getReader();
      readerRef.current = reader;

      (async () => {
        let pendingGroup: ResultGroupMeta | null = null;

        try {
          // eslint-disable-next-line no-await-in-loop
          while (!killSwitchRef.current) {
            // eslint-disable-next-line no-await-in-loop
            const res = await reader.read();
            if (killSwitchRef.current) break;
            if (res.done) {
              handleStreamEnd(assistantMessage.id, setMessages);
              break;
            }

            const { type, data } = res.value;

            if (type === 'start' && data?.thread_id) {
              threadIdRef.current = data.thread_id;
            } else if (type === 'group') {
              pendingGroup = {
                display_name: data?.display_name ?? data?.group ?? '',
                value: data?.value ?? data?.group ?? '',
              };
            } else if (type === 'search_result') {
              pendingGroup = handleSearchResult(
                data,
                pendingGroup,
                assistantMessage.id,
                setMessages,
              );
            } else if (type === 'message') {
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
