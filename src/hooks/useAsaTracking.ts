import { useCallback, useMemo } from 'react';
import { Tracker } from '@constructor-io/constructorio-client-javascript/lib/types/constructorio';
import { AssistantTrackedItem } from '../types';

/**
 * The installed client (2.88.0) exposes the six `trackAssistant*` methods but its
 * published types don't yet include `threadId` (that lands with the client bump on
 * the `at-194` branch). We describe the parameter shapes we send here — including
 * `threadId` — and call through this narrowed view of the tracker so the extra field
 * compiles now and flows through once the client types catch up.
 */
interface AssistantTracker {
  trackAssistantSubmit(params: { intent: string; section?: string; threadId?: string }): unknown;
  trackAssistantResultLoadStarted(params: {
    intent: string;
    section?: string;
    intentResultId?: string;
    threadId?: string;
  }): unknown;
  trackAssistantResultLoadFinished(params: {
    intent: string;
    searchResultCount: number;
    section?: string;
    intentResultId?: string;
    threadId?: string;
  }): unknown;
  trackAssistantResultClick(params: {
    intent: string;
    searchResultId: string;
    itemId?: string;
    itemName?: string;
    variationId?: string;
    section?: string;
    intentResultId?: string;
    threadId?: string;
  }): unknown;
  trackAssistantResultView(params: {
    intent: string;
    searchResultId: string;
    numResultsViewed: number;
    items?: AssistantTrackedItem[];
    intentResultId?: string;
    section?: string;
    threadId?: string;
  }): unknown;
  trackAssistantSearchSubmit(params: {
    intent: string;
    searchTerm: string;
    userInput: string;
    searchResultId: string;
    groupId?: string;
    section?: string;
    intentResultId?: string;
    threadId?: string;
  }): unknown;
}

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

export interface UseAsaTrackingReturn {
  trackSubmit: (intent: string) => void;
  trackResultLoadStarted: (args: TrackResultLoadStartedArgs) => void;
  trackResultLoadFinished: (args: TrackResultLoadFinishedArgs) => void;
  trackResultClick: (args: TrackResultClickArgs) => void;
  trackResultView: (args: TrackResultViewArgs) => void;
  trackSearchSubmit: (args: TrackSearchSubmitArgs) => void;
}

const NOOP_TRACKING: UseAsaTrackingReturn = {
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
  const assistant = tracker as unknown as AssistantTracker | undefined;

  const base = useMemo(
    () => ({
      ...(section && { section }),
      ...(threadId && { threadId }),
    }),
    [section, threadId],
  );

  const trackSubmit = useCallback(
    (intent: string) => {
      assistant?.trackAssistantSubmit({ intent, ...base });
    },
    [assistant, base],
  );

  const trackResultLoadStarted = useCallback(
    ({ intent, intentResultId }: TrackResultLoadStartedArgs) => {
      assistant?.trackAssistantResultLoadStarted({
        intent,
        ...(intentResultId && { intentResultId }),
        ...base,
      });
    },
    [assistant, base],
  );

  const trackResultLoadFinished = useCallback(
    ({ intent, searchResultCount, intentResultId }: TrackResultLoadFinishedArgs) => {
      assistant?.trackAssistantResultLoadFinished({
        intent,
        searchResultCount,
        ...(intentResultId && { intentResultId }),
        ...base,
      });
    },
    [assistant, base],
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
      assistant?.trackAssistantResultClick({
        intent,
        searchResultId,
        ...(intentResultId && { intentResultId }),
        ...(itemId && { itemId }),
        ...(itemName && { itemName }),
        ...(variationId && { variationId }),
        ...base,
      });
    },
    [assistant, base],
  );

  const trackResultView = useCallback(
    ({ intent, searchResultId, numResultsViewed, intentResultId, items }: TrackResultViewArgs) => {
      assistant?.trackAssistantResultView({
        intent,
        searchResultId,
        numResultsViewed,
        ...(intentResultId && { intentResultId }),
        ...(items && items.length > 0 && { items }),
        ...base,
      });
    },
    [assistant, base],
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
      assistant?.trackAssistantSearchSubmit({
        intent,
        searchTerm,
        userInput,
        searchResultId,
        ...(intentResultId && { intentResultId }),
        ...(groupId && { groupId }),
        ...base,
      });
    },
    [assistant, base],
  );

  return useMemo(() => {
    if (!assistant) return NOOP_TRACKING;
    return {
      trackSubmit,
      trackResultLoadStarted,
      trackResultLoadFinished,
      trackResultClick,
      trackResultView,
      trackSearchSubmit,
    };
  }, [
    assistant,
    trackSubmit,
    trackResultLoadStarted,
    trackResultLoadFinished,
    trackResultClick,
    trackResultView,
    trackSearchSubmit,
  ]);
}
