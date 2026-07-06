import { useCallback, useRef, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';
import { ResultGroup, ChatMessage, UseChatReturn } from '../types';

const ERROR_FALLBACK_TEXT = "I can't assist you with that request.";

let messageIdCounter = 0;
function generateId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}-${Date.now()}`;
}

export default function useAsaResults(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const killSwitchRef = useRef(false);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const threadIdRef = useRef<string | null>(null);

  const contextValue = useCioAsaContext();
  const { cioClient, staticRequestConfigs } = contextValue || {};
  const { domain } = staticRequestConfigs || {};

  const sendMessage = useCallback(
    (text: string) => {
      if (!cioClient || !domain || !text.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        text: text.trim(),
        status: 'done',
      };

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        text: '',
        groups: [],
        status: 'loading',
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      killSwitchRef.current = false;

      const AgentClass = (cioClient.agent as any).constructor;
      if (AgentClass?.EventTypes && !AgentClass.EventTypes.MESSAGE) {
        AgentClass.EventTypes.MESSAGE = 'message';
      }

      const params: any = { domain };
      if (threadIdRef.current) {
        params.thread_id = threadIdRef.current;
      }
      const stream = cioClient.agent.getAgentResultsStream(text.trim(), params);
      const reader = stream.getReader();
      readerRef.current = reader;

      (async () => {
        try {
          // eslint-disable-next-line no-await-in-loop
          while (!killSwitchRef.current) {
            // eslint-disable-next-line no-await-in-loop
            const res = await reader.read();
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

            if (type === 'search_result') {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMessage.id) return msg;
                  const response = data?.response;
                  const results = response?.results || [];
                  const searchRequest = response?.search_request;
                  const group = {
                    display_name: searchRequest?.display_name || data?.title || '',
                    value: searchRequest?.search_term || data?.title || '',
                  };
                  const newGroup: ResultGroup = { group, searchResults: results };
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
          reader.cancel();
          readerRef.current = null;
          setIsStreaming(false);
        }
      })();
    },
    [cioClient, domain, isStreaming],
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
  }, []);

  return { messages, sendMessage, isStreaming, clearHistory };
}
