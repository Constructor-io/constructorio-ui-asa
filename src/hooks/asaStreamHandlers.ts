import { Dispatch, SetStateAction } from 'react';
import {
  ResultGroup,
  ResultGroupMeta,
  ChatMessage,
  ClarificationQuizQuestion,
  SearchResultEventRequest,
} from '../types';

export type MessageUpdater = Dispatch<SetStateAction<ChatMessage[]>>;

/**
 * Internal A/B configuration echoed back on the request. Stripped before the request reaches
 * consumers: it is unstable (the backend omits it on some pods within a single response) and
 * nothing a consumer should branch on. Everything else passes through untouched, so new
 * backend fields reach consumers without a library change.
 */
const INTERNAL_REQUEST_FIELDS = ['features', 'feature_variants'];

function omitInternalRequestFields(request: Record<string, unknown>): SearchResultEventRequest {
  return Object.fromEntries(
    Object.entries(request).filter(([key]) => !INTERNAL_REQUEST_FIELDS.includes(key)),
  ) as SearchResultEventRequest;
}

export function updateMessageById(
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
  // The echoed CIO request arrives on the `search_result` event, not on the preceding `group`
  // event, so it is merged in regardless of how the group resolved. Consumers branch on
  // `data.request.term` in `onViewMore` to build the destination URL.
  const resolvedGroup: ResultGroupMeta = {
    ...baseGroup,
    ...(data?.request && {
      data: { ...baseGroup.data, request: omitInternalRequestFields(data.request) },
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

/** Returns the message's `route`, e.g. `'customer_support'`, when the agent routed it. */
export function handleMessage(
  data: any,
  assistantId: string,
  setMessages: MessageUpdater,
): string | undefined {
  const route = typeof data?.route === 'string' ? data.route : undefined;
  updateMessageById(setMessages, assistantId, (msg) => ({
    ...msg,
    status: 'streaming',
    text: [msg.text, data?.text].filter(Boolean).join('\n'),
    ...(route && { route }),
  }));
  return route;
}

export function handleFollowUpRefinement(
  data: any,
  assistantId: string,
  setMessages: MessageUpdater,
) {
  const question = typeof data?.question === 'string' ? data.question.trim() : '';
  const options = Array.isArray(data?.options)
    ? data.options.filter((o: unknown): o is string => typeof o === 'string' && o.trim() !== '')
    : [];
  if (question === '' || options.length === 0) return;
  updateMessageById(setMessages, assistantId, (msg) => ({
    ...msg,
    status: 'streaming',
    refinement: { question, options },
  }));
}

const ANSWER_TYPES = new Set(['single_select', 'multi_select', 'free_text']);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function toQuizQuestion(q: any): ClarificationQuizQuestion | null {
  if (!isText(q?.id) || !isText(q?.question) || !ANSWER_TYPES.has(q?.answer_type)) return null;
  const options = Array.isArray(q.options)
    ? q.options
        .filter((o: any) => isText(o?.id) && isText(o?.label))
        .map((o: any) => ({ id: o.id, label: o.label.trim() }))
    : [];
  if (q.answer_type !== 'free_text' && options.length === 0) return null;
  return {
    id: q.id,
    question: q.question.trim(),
    answerType: q.answer_type,
    options: q.answer_type === 'free_text' ? [] : options,
    allowFreeText: q.answer_type !== 'free_text' && q.allow_free_text === true,
  };
}

/** Stores the quiz, keeping only well-formed questions and options; ignores a quiz with none left. */
export function handleClarificationQuiz(
  data: any,
  assistantId: string,
  setMessages: MessageUpdater,
) {
  const questions = Array.isArray(data?.questions)
    ? data.questions.map(toQuizQuestion).filter(Boolean)
    : [];
  if (questions.length === 0) return;
  updateMessageById(setMessages, assistantId, (msg) => ({
    ...msg,
    status: 'streaming',
    quiz: { quizId: isText(data?.quiz_id) ? data.quiz_id : assistantId, questions },
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
