import type { Dispatch, SetStateAction } from 'react';
import { ChatMessage, ResultGroupMeta } from '../types';
import {
  handleFollowUpRefinement,
  handleMessage,
  handleSearchResult,
  handleServerError,
  handleStreamEnd,
  handleStreamError,
  updateMessageById,
} from './asaStreamHandlers';

type SetMessages = Dispatch<SetStateAction<ChatMessage[]>>;

export interface AgentStreamCallbacks {
  /** The `start` event arrived, possibly carrying the server thread id. */
  onStart: (threadId?: string) => void;
  /** Fires once, on the first event with content, for load-started tracking. */
  onLoadStart: (intentResultId?: string) => void;
  /** The stream ended normally (not on a server error, a failure, or a cancel). */
  onFinish: (result: { searchResultCount: number; intentResultId?: string }) => void;
}

export interface AgentStreamHandle {
  /** The assistant message this stream writes into, so a cancel can settle the right one. */
  assistantId: string;
  /** Stop reading; the pending `done` settles without touching the assistant message. */
  cancel: () => void;
  done: Promise<void>;
}

/** Drains an agent stream into the assistant message identified by `assistantId`. */
export function readAgentStream(
  stream: ReadableStream,
  assistantId: string,
  setMessages: SetMessages,
  callbacks: AgentStreamCallbacks,
): AgentStreamHandle {
  const reader = stream.getReader();
  let cancelled = false;
  let pendingGroup: ResultGroupMeta | null = null;
  let intentResultId: string | undefined;
  let loadStartFired = false;
  let groupCount = 0;

  const patchAssistant = (patch: Partial<ChatMessage>) => {
    updateMessageById(setMessages, assistantId, (m) => ({ ...m, ...patch }));
  };

  const fireLoadStart = () => {
    if (loadStartFired) return;
    loadStartFired = true;
    callbacks.onLoadStart(intentResultId);
  };

  const done = (async () => {
    try {
      while (!cancelled) {
        // eslint-disable-next-line no-await-in-loop
        const res = await reader.read();
        if (cancelled) break;
        if (res.done) {
          handleStreamEnd(assistantId, setMessages);
          callbacks.onFinish({ searchResultCount: groupCount, intentResultId });
          break;
        }

        const { type, data } = res.value;
        if (!intentResultId && data?.intent_result_id) {
          intentResultId = data.intent_result_id;
          patchAssistant({ intentResultId });
        }

        if (type === 'start') {
          if (data?.thread_id) patchAssistant({ threadId: data.thread_id });
          callbacks.onStart(data?.thread_id);
          fireLoadStart();
        } else if (type === 'group') {
          pendingGroup = {
            display_name: data?.display_name ?? data?.group ?? '',
            value: data?.value ?? data?.group ?? '',
          };
        } else if (type === 'search_result') {
          fireLoadStart();
          groupCount += 1;
          pendingGroup = handleSearchResult(data, pendingGroup, assistantId, setMessages);
        } else if (type === 'message') {
          fireLoadStart();
          handleMessage(data, assistantId, setMessages);
        } else if (type === 'follow_up_refinement') {
          fireLoadStart();
          handleFollowUpRefinement(data, assistantId, setMessages);
        } else if (type === 'server_error') {
          handleServerError(assistantId, setMessages);
          break;
        }
      }
    } catch {
      if (!cancelled) handleStreamError(assistantId, setMessages);
    } finally {
      // Cancelling an errored stream rejects with the stored error; nothing here needs it.
      if (!cancelled) reader.cancel().catch(() => {});
    }
  })();

  return {
    assistantId,
    done,
    cancel: () => {
      cancelled = true;
      reader.cancel().catch(() => {});
    },
  };
}
