import { useCallback, useMemo } from 'react';
import { Tracker } from '@constructor-io/constructorio-client-javascript/lib/types/constructorio';
import { AgentButtonClickPayload, AssistantSubmitSource, AssistantTrackedItem } from '../types';

export interface UseAsaTrackingProps {
  tracker?: Tracker;
  section?: string;
  /** Thread id of the current conversation, forwarded to every event when present. */
  threadId?: string;
}

export interface TrackResultLoadStartedArgs {
  intent: string;
  intentResultId?: string;
}

export interface TrackResultLoadFinishedArgs {
  intent: string;
  searchResultCount: number;
  intentResultId?: string;
  /** Thread the answer belongs to, when it can differ from the hook's `threadId`. */
  threadId?: string;
}

export interface TrackResultClickArgs {
  intent: string;
  searchResultId: string;
  intentResultId?: string;
  itemId?: string;
  itemName?: string;
  variationId?: string;
}

export interface TrackResultViewArgs {
  intent: string;
  searchResultId: string;
  numResultsViewed: number;
  intentResultId?: string;
  items?: AssistantTrackedItem[];
}

export interface TrackSearchSubmitArgs {
  intent: string;
  searchTerm: string;
  userInput: string;
  searchResultId: string;
  intentResultId?: string;
  groupId?: string;
}

export type TrackAgentButtonClickArgs = AgentButtonClickPayload;

export interface UseAsaTrackingReturn {
  trackAgentButtonClick: (args: TrackAgentButtonClickArgs) => void;
  trackSubmit: (intent: string, source?: AssistantSubmitSource) => void;
  trackResultLoadStarted: (args: TrackResultLoadStartedArgs) => void;
  trackResultLoadFinished: (args: TrackResultLoadFinishedArgs) => void;
  trackResultClick: (args: TrackResultClickArgs) => void;
  trackResultView: (args: TrackResultViewArgs) => void;
  trackSearchSubmit: (args: TrackSearchSubmitArgs) => void;
}

/** Beacon `source` values, aligned with the ones the behavioral-actions API documents. */
const BEACON_SUBMIT_SOURCES: Record<AssistantSubmitSource, string> = {
  input: 'input',
  suggestion: 'suggestion',
  refinement: 'follow_up',
};

const NOOP_TRACKING: UseAsaTrackingReturn = {
  trackAgentButtonClick: () => {},
  trackSubmit: () => {},
  trackResultLoadStarted: () => {},
  trackResultLoadFinished: () => {},
  trackResultClick: () => {},
  trackResultView: () => {},
  trackSearchSubmit: () => {},
};

/**
 * Fires ASA behavioral tracking events through the Constructor client. Each returned
 * function maps to one `trackAssistant*` beacon and merges in `section` + `threadId`.
 * Mirrors the tracking-hook pattern used by constructorio-ui-pia.
 */
export default function useAsaTracking({
  tracker,
  section,
  threadId,
}: UseAsaTrackingProps): UseAsaTrackingReturn {
  const base = useMemo(
    () => ({
      ...(section && { section }),
      ...(threadId && { threadId }),
    }),
    [section, threadId],
  );

  const trackAgentButtonClick = useCallback(
    ({ mode, agentDomain, positionOnPage, pageType, instanceId }: TrackAgentButtonClickArgs) => {
      tracker?.trackAgentButtonClick?.({
        mode,
        agentDomain,
        ...(positionOnPage && { positionOnPage }),
        ...(pageType && { pageType }),
        ...(instanceId && { instanceId }),
        ...(section && { section }),
      });
    },
    [tracker, section],
  );

  const trackSubmit = useCallback(
    (intent: string, source?: AssistantSubmitSource) => {
      tracker?.trackAssistantSubmit({
        intent,
        ...(source && { source: BEACON_SUBMIT_SOURCES[source] }),
        ...base,
      });
    },
    [tracker, base],
  );

  const trackResultLoadStarted = useCallback(
    ({ intent, intentResultId }: TrackResultLoadStartedArgs) => {
      tracker?.trackAssistantResultLoadStarted({
        intent,
        ...(intentResultId && { intentResultId }),
        ...base,
      });
    },
    [tracker, base],
  );

  const trackResultLoadFinished = useCallback(
    ({
      intent,
      searchResultCount,
      intentResultId,
      threadId: turnThreadId,
    }: TrackResultLoadFinishedArgs) => {
      tracker?.trackAssistantResultLoadFinished({
        intent,
        searchResultCount,
        ...(intentResultId && { intentResultId }),
        ...base,
        ...(turnThreadId && { threadId: turnThreadId }),
      });
    },
    [tracker, base],
  );

  const trackResultClick = useCallback(
    ({
      intent,
      searchResultId,
      intentResultId,
      itemId,
      itemName,
      variationId,
    }: TrackResultClickArgs) => {
      tracker?.trackAssistantResultClick({
        intent,
        searchResultId,
        ...(intentResultId && { intentResultId }),
        ...(itemId && { itemId }),
        ...(itemName && { itemName }),
        ...(variationId && { variationId }),
        ...base,
      });
    },
    [tracker, base],
  );

  const trackResultView = useCallback(
    ({ intent, searchResultId, numResultsViewed, intentResultId, items }: TrackResultViewArgs) => {
      tracker?.trackAssistantResultView({
        intent,
        searchResultId,
        numResultsViewed,
        ...(intentResultId && { intentResultId }),
        ...(items && items.length > 0 && { items }),
        ...base,
      });
    },
    [tracker, base],
  );

  const trackSearchSubmit = useCallback(
    ({
      intent,
      searchTerm,
      userInput,
      searchResultId,
      intentResultId,
      groupId,
    }: TrackSearchSubmitArgs) => {
      tracker?.trackAssistantSearchSubmit({
        intent,
        searchTerm,
        userInput,
        searchResultId,
        ...(intentResultId && { intentResultId }),
        ...(groupId && { groupId }),
        ...base,
      });
    },
    [tracker, base],
  );

  return useMemo(() => {
    if (!tracker) return NOOP_TRACKING;
    return {
      trackAgentButtonClick,
      trackSubmit,
      trackResultLoadStarted,
      trackResultLoadFinished,
      trackResultClick,
      trackResultView,
      trackSearchSubmit,
    };
  }, [
    tracker,
    trackAgentButtonClick,
    trackSubmit,
    trackResultLoadStarted,
    trackResultLoadFinished,
    trackResultClick,
    trackResultView,
    trackSearchSubmit,
  ]);
}
