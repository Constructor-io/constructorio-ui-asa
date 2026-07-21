import { useCallback, useEffect, useRef, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';
import { ResultGroup, ResultGroupMeta, ChatMessage, UseChatReturn } from '../types';

const ERROR_FALLBACK_TEXT = "I can't assist you with that request.";

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

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isStreamingRef.current) return;

      idCounterRef.current += 1;
      const userMessage: ChatMessage = {
        id: `msg-${idCounterRef.current}-${Date.now()}`,
        role: 'user',
        text: text.trim(),
        status: 'done',
      };

      idCounterRef.current += 1;
      const assistantMessage: ChatMessage = {
        id: `msg-${idCounterRef.current}-${Date.now()}`,
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
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessage.id ? { ...msg, status: 'done' } : msg,
                ),
              );
              break;
            }

            const { type, data } = res.value;

            if (type === 'start' && data?.thread_id) {
              threadIdRef.current = data.thread_id;
            }

            if (type === 'group') {
              pendingGroup = {
                display_name: data?.display_name ?? data?.group ?? '',
                value: data?.value ?? data?.group ?? '',
              };
            }

            if (type === 'search_result') {
              const resolvedGroup: ResultGroupMeta = pendingGroup ?? {
                display_name: data?.response?.search_request?.display_name ?? data?.title ?? '',
                value: data?.response?.search_request?.search_term ?? data?.title ?? '',
              };
              const results = data?.response?.results ?? (data?.results ? data.results : [data]);
              const newGroup: ResultGroup = { group: resolvedGroup, searchResults: results };
              pendingGroup = null;
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMessage.id) return msg;
                  return {
                    ...msg,
                    status: 'streaming' as const,
                    groups: [...(msg.groups || []), newGroup],
                  };
                }),
              );
            }

            if (type === 'message') {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMessage.id) return msg;
                  return {
                    ...msg,
                    status: 'streaming' as const,
                    text: (msg.text || '') + (data?.text || ''),
                  };
                }),
              );
            }

            if (type === 'server_error') {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMessage.id) return msg;
                  return { ...msg, text: ERROR_FALLBACK_TEXT, status: 'error' as const };
                }),
              );
              break;
            }
          }
        } catch (e) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== assistantMessage.id) return msg;
              return { ...msg, text: msg.text || ERROR_FALLBACK_TEXT, status: 'error' as const };
            }),
          );
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
    [cioClient, domain],
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
