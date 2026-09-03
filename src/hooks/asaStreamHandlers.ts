import { Dispatch, SetStateAction } from 'react';
import { ResultGroup, ResultGroupMeta, ChatMessage } from '../types';

export type MessageUpdater = Dispatch<SetStateAction<ChatMessage[]>>;

/**
 * Internal A/B configuration echoed back on the request. Stripped before the request reaches
 * consumers: it is unstable (the backend omits it on some pods within a single response) and
 * nothing a consumer should branch on. Everything else passes through untouched, so new
 * backend fields reach consumers without a library change.
 */
const INTERNAL_REQUEST_FIELDS = ['features', 'feature_variants'];

function omitInternalRequestFields(request: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(request).filter(([key]) => !INTERNAL_REQUEST_FIELDS.includes(key)),
  );
}

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
  const baseGroup: ResultGroupMeta = pendingGroup ?? {
    display_name: data?.response?.search_request?.display_name ?? data?.title ?? '',
    value: data?.response?.search_request?.search_term ?? data?.title ?? '',
  };
  // The echoed CIO request and its search metadata arrive on the `search_result` event, not
  // on the preceding `group` event, so they are merged in regardless of how the group
  // resolved. Consumers read these off the group in `onViewMore` to build an accurate
  // destination URL (e.g. `search_request.search_term` as the query, plus
  // `request.pre_filter_expression` for scoping).
  const resolvedGroup: ResultGroupMeta = {
    ...baseGroup,
    ...(data?.request && { request: omitInternalRequestFields(data.request) }),
    ...(data?.response?.search_request && { search_request: data.response.search_request }),
    ...(data?.response?.facets && { facets: data.response.facets }),
    ...(data?.response?.alternative_search_requests && {
      alternative_search_requests: data.response.alternative_search_requests,
    }),
  };
  const results = data?.response?.results ?? (data?.results ? data.results : [data]);
  // `result_id` is unique per search_result event; `intent_result_id` is shared across
  // the stream. Both sit at the top level of the SSE event payload.
  const newGroup: ResultGroup = {
    group: resolvedGroup,
    searchResults: results,
    ...(data?.result_id && { searchResultId: data.result_id }),
    ...(data?.intent_result_id && { intentResultId: data.intent_result_id }),
  };
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
