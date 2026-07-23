import { Dispatch, SetStateAction } from 'react';
import { ResultGroup, ResultGroupMeta, ChatMessage } from '../types';

export type MessageUpdater = Dispatch<SetStateAction<ChatMessage[]>>;

function updateMessageById(
  setMessages: MessageUpdater,
  id: string,
  patch: (msg: ChatMessage) => ChatMessage,
) {
  setMessages((prev) => prev.map((msg) => (msg.id === id ? patch(msg) : msg)));
}

export function handleSearchResult(
  data: any,
  pendingGroup: ResultGroupMeta | null,
  assistantId: string,
  setMessages: MessageUpdater,
): ResultGroupMeta | null {
  const resolvedGroup: ResultGroupMeta = pendingGroup ?? {
    display_name: data?.response?.search_request?.display_name ?? data?.title ?? '',
    value: data?.response?.search_request?.search_term ?? data?.title ?? '',
  };
  const results = data?.response?.results ?? (data?.results ? data.results : [data]);
  const newGroup: ResultGroup = { group: resolvedGroup, searchResults: results };
  updateMessageById(setMessages, assistantId, (msg) => ({
    ...msg,
    status: 'streaming',
    groups: [...(msg.groups || []), newGroup],
  }));
  return null;
}

export function handleMessage(data: any, assistantId: string, setMessages: MessageUpdater) {
  updateMessageById(setMessages, assistantId, (msg) => ({
    ...msg,
    status: 'streaming',
    text: (msg.text || '') + (data?.text || ''),
  }));
}

export function handleServerError(assistantId: string, setMessages: MessageUpdater) {
  updateMessageById(setMessages, assistantId, (msg) => ({
    ...msg,
    status: 'error',
  }));
}

export function handleStreamEnd(assistantId: string, setMessages: MessageUpdater) {
  updateMessageById(setMessages, assistantId, (msg) => ({ ...msg, status: 'done' }));
}

export function handleStreamError(assistantId: string, setMessages: MessageUpdater) {
  updateMessageById(setMessages, assistantId, (msg) => ({
    ...msg,
    status: 'error',
  }));
}
