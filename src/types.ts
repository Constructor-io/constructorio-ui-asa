import React from 'react';
import type { ReactNode } from 'react';
import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import {
  ConstructorClientOptions,
  Nullable,
} from '@constructor-io/constructorio-client-javascript/lib/types';
import { IAgentParameters } from '@constructor-io/constructorio-client-javascript/lib/types/agent';
import {
  ComponentOverrideProps,
  CarouselOverrides,
  IncludeComponentOverrides,
} from '@constructor-io/constructorio-ui-components';
import type { Product } from './utils/productNormalizer';

export { Nullable, ConstructorIOClient };

export type CioClientOptions = Omit<ConstructorClientOptions, 'apiKey' | 'sendTrackingEvents'>;

export interface PrimaryColorStyles {
  '--primary-color-h': string;
  '--primary-color-s': string;
  '--primary-color-l': string;
}

export interface AsaContextValue {
  cioClient: Nullable<ConstructorIOClient>;
  cioClientOptions: CioClientOptions;
  setCioClientOptions: React.Dispatch<CioClientOptions>;
  staticRequestConfigs: RequestConfigs;
  formatters: Formatters;
  urlHelpers: UrlHelpers;
  callbacks?: AsaCallbacks;
  section?: string;
  /** Resolved chat persistence store, or `undefined` when persistence is off. */
  persistence?: ChatPersistence;
}

export interface RequestConfigs extends IAgentParameters {
  intent?: string;
}

export interface Formatters {
  formatPrice: (price?: number) => string;
}
export interface UrlHelpers {
  getUrl: () => string | undefined;
  setUrl: (newUrlWithEncodedState: string) => void;
  getStateFromUrl: (urlString: string) => RequestConfigs;
  getUrlFromState: (state: RequestConfigs, options: QueryParamEncodingOptions) => string;
  defaultQueryStringMap: Readonly<DefaultQueryStringMap>;
}

// `cioClientOptions` is intentionally excluded: it is runtime state managed via
// `setCioClientOptions`, not a provider input. Configure the client with `apiKey`
// (optionally after instantiating your own `cioClient`).
export interface CioAsaProviderProps
  extends Omit<
    Partial<AsaContextValue>,
    'setCioClientOptions' | 'cioClientOptions' | 'persistence'
  > {
  apiKey?: string;
  /**
   * Persist the conversation so it survives page loads. Stored in `localStorage`, keyed by
   * api key + domain + user id, with a 7 day TTL. Off when omitted.
   */
  persistence?: boolean;
}

export interface UseCioClientProps {
  apiKey?: string;
  cioClient?: Nullable<ConstructorIOClient>;
  cioClientOptions?: CioClientOptions;
}

export type DefaultQueryStringMap = {
  intent: 'q';
  numResultsPerPage: 'resultsPerPod'; // The API parameter is `num_results_per_page`. We transform this when setting requestConfigs
  filters: 'filters';
};

export interface QueryParamEncodingOptions {
  baseUrl?: string;
  origin?: string;
  pathname?: string;
}

// Type Extenders

/**
 * Composes a type for a Component that accepts
 * - Props P,
 * - A children function, that takes RenderProps as its argument
 */
export type IncludeRenderProps<ComponentProps, ChildrenFunctionProps> = ComponentProps & {
  children?: ((props: ChildrenFunctionProps) => ReactNode) | React.ReactNode;
};

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  groups?: ResultGroup[];
  status: ChatMessageStatus;
  intent?: string;
  intentResultId?: string;
  threadId?: string;
  /** Narrowing question the agent asked at the end of this turn, from a `follow_up_refinement` event. */
  refinement?: FollowUpRefinement;
}

/** A narrowing question with selectable options, emitted by the agent as a `follow_up_refinement` event. */
export interface FollowUpRefinement {
  question: string;
  options: string[];
}

export type ChatMessageStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

/**
 * Echoed CIO search API request from a `search_result` SSE event — the parameters the
 * backend used to fetch this pod's results.
 *
 * Several pod types (keyword search, category browse, recommendations, bestsellers) all
 * arrive as `search_result` events, and nothing at the event level distinguishes them.
 * This request is the only place a consumer can tell them apart:
 * - `term` non-empty -> keyword pod; route to a search page.
 * - `term` empty with `browse_filter_name`/`browse_filter_value` -> category pod; route to
 *   a category page. Do **not** use the pod's `value` as a query here: for category pods the
 *   backend sets it to the heading rather than a search term.
 *
 * Carry `filters`, `filter_match_types` and the sort over to the destination too, otherwise
 * the page shows a different result set than the pod that was clicked.
 */
export interface SearchResultEventRequest {
  num_results_per_page?: number;
  ids?: string[];
  term?: string;
  page?: number;
  fmt_options?: Record<string, unknown>;
  sort_by?: string;
  sort_order?: string;
  section?: string;
  /** Facet name a category pod browses on (e.g. `'group_id'`). Absent on keyword pods. */
  browse_filter_name?: string;
  /** Facet value a category pod browses on (e.g. `'cat100260235'`). Absent on keyword pods. */
  browse_filter_value?: string;
  /** Filters the agent applied to build this pod, e.g. `{ event: ['wedding'] }`. */
  filters?: Record<string, unknown>;
  /** Match type per filter, e.g. `{ event: 'any' }`. */
  filter_match_types?: Record<string, unknown>;
  pre_filter_expression?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResultGroupMeta {
  display_name: string;
  value?: string;
  /** Backend metadata for this pod. */
  data?: { display_name?: string; request?: SearchResultEventRequest; [key: string]: unknown };
}

export interface ResultGroup {
  group: ResultGroupMeta;
  searchResults: Record<string, unknown>[];
  searchResultId?: string;
  intentResultId?: string;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (text: string, source?: AssistantSubmitSource) => void;
  /** True while an answer is streaming, here or, with persistence on, in another tab on the same thread. */
  isStreaming: boolean;
  clearHistory: () => void;
  /** True while a persisted conversation is being loaded. Always `false` when persistence is off. */
  isHydrating: boolean;
  /** Stored conversations, most recent first. Empty when persistence is off. */
  threads: ThreadSummary[];
  /** Id of the stored conversation currently shown, or `null` for an unsaved one. */
  activeThreadId: string | null;
  /** Start an empty conversation, keeping the current one in storage. */
  newThread: () => void;
  /** Load a stored conversation and continue it. No-op when persistence is off. */
  switchThread: (threadId: string) => Promise<void>;
}

export interface UseAsaResultsOptions {
  /**
   * Seed the thread id to resume a prior conversation. Read once on mount. With persistence
   * enabled, the matching stored transcript is restored too when one exists.
   */
  initialThreadId?: string;
}

// --- Persistence ---

/** A stored conversation. `threadId` is the server thread id, or a `local-` id for non-conversational domains. */
export interface PersistedChat {
  version: 1;
  threadId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /**
   * Id of the browser tab that last wrote the record. Lets a reloaded tab tell its own
   * interrupted answer (settled at once) from one still streaming in another tab.
   */
  owner?: string;
}

export interface ThreadSummary {
  threadId: string;
  /** First user message, truncated. */
  title: string;
  createdAt: number;
  updatedAt: number;
  /** True while the latest answer is still streaming (possibly in another tab). */
  inFlight: boolean;
}

/** Storage contract the chat hook talks to; implemented by `createLocalStoragePersistence`. */
export interface ChatPersistence {
  /** Most recently updated first. */
  listThreads(): Promise<ThreadSummary[]>;
  getThread(threadId: string): Promise<PersistedChat | null>;
  saveThread(chat: PersistedChat): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  /**
   * Optional. Notify when stored threads change outside this hook instance (another tab).
   * Returns an unsubscribe function.
   */
  subscribe?(listener: () => void): () => void;
}

export interface LocalStoragePersistenceOptions {
  /** Storage key prefix. Default `'cio-asa:chat'`. */
  key?: string;
  /** Appended to the key to isolate conversations, e.g. per api key + domain. */
  namespace?: string;
  /** Threads idle longer than this are dropped on read. Default 7 days, matching server retention. */
  ttlMs?: number;
  /** Cap on user/assistant turns kept per thread. Unlimited by default. */
  maxTurns?: number;
  /** Cap on threads kept. Unlimited by default. */
  maxThreads?: number;
  /** Storage to use instead of `window.localStorage` (e.g. `sessionStorage`). */
  storage?: Storage;
}

// --- Behavioral tracking ---

/** How an intent was submitted: typed input, a welcome-screen suggestion chip, or a refinement chip. */
export type AssistantSubmitSource = 'input' | 'suggestion' | 'refinement';

/** An item within a viewed/clicked search_result pod. */
export interface AssistantTrackedItem {
  itemId?: string;
  itemName?: string;
  variationId?: string;
}

/**
 * Optional consumer callbacks fired alongside the built-in behavioral tracking.
 * Each fires immediately after its corresponding `trackAssistant*` beacon is sent,
 * so consumers can mirror ASA analytics into their own systems. All are optional.
 */
export interface AsaCallbacks {
  /** User submitted an intent (typed) or clicked a suggestion / refinement chip. */
  onAssistantSubmit?: (payload: { intent: string; source: AssistantSubmitSource }) => void;
  /** The ASA response stream started. */
  onResultLoadStart?: (payload: { intent: string; intentResultId?: string }) => void;
  /** The ASA response stream finished; `searchResultCount` = number of pods loaded. */
  onResultLoadFinish?: (payload: {
    intent: string;
    searchResultCount: number;
    intentResultId?: string;
  }) => void;
  /** A product inside a search_result pod was clicked. */
  onResultClick?: (payload: {
    intent: string;
    searchResultId: string;
    intentResultId?: string;
    item: AssistantTrackedItem;
  }) => void;
  /** A search_result pod scrolled into view. */
  onResultView?: (payload: {
    intent: string;
    searchResultId: string;
    intentResultId?: string;
    numResultsViewed: number;
    items?: AssistantTrackedItem[];
  }) => void;
  /** A search query inside a search_result pod was submitted (e.g. "View more"). */
  onSearchSubmit?: (payload: {
    intent: string;
    searchTerm: string;
    userInput: string;
    searchResultId: string;
    intentResultId?: string;
    groupId?: string;
  }) => void;
}

/**
 * Translations type for internationalizing UI strings.
 * All keys are optional — any non-provided translation will fall back to the English default.
 */
export type Translations = {
  'CioAsa.header.title'?: string;
  'CioAsa.header.close'?: string;
  'CioAsa.input.placeholder'?: string;
  'CioAsa.input.ariaLabel'?: string;
  'CioAsa.input.sendAriaLabel'?: string;
  'CioAsa.welcome.title'?: string;
  'CioAsa.welcome.placeholder'?: string;
  'CioAsa.welcome.sendButton'?: string;
  'CioAsa.welcome.inputAriaLabel'?: string;
  /** @deprecated No default; the send button is named by its visible label. */
  'CioAsa.welcome.sendAriaLabel'?: string;
  'CioAsa.welcome.suggestionsAriaLabel'?: string;
  'CioAsa.messageList.ariaLabel'?: string;
  'CioAsa.typingIndicator.ariaLabel'?: string;
  'CioAsa.userMessage.ariaLabel'?: string;
  'CioAsa.aiMessage.ariaLabel'?: string;
  'CioAsa.results.viewMore'?: string;
  'CioAsa.results.addToCart'?: string;
  'CioAsa.results.saleBadge'?: string;
  'CioAsa.refinement.ariaLabel'?: string;
  'CioAsa.error.message'?: string;
};

// --- Component Override Render Props ---

export interface ChatHeaderRenderProps {
  title: string;
  onClose?: () => void;
}

export interface ChatInputRenderProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  isDisabled: boolean;
}

export interface WelcomeScreenTitleRenderProps {
  text: string;
}

export interface WelcomeScreenInputRenderProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  isDisabled: boolean;
}

export interface SuggestedQuestionsRenderProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export interface UserMessageRenderProps {
  text: string;
}

export interface AiMessageLoaderRenderProps {
  translations?: Translations;
}

export interface AiMessageTextRenderProps {
  text: string;
}

export interface FollowUpRefinementRenderProps {
  question: string;
  options: string[];
  /** Sends the option as a follow-up message. No-op while `isDisabled`. */
  onOptionClick: (option: string) => void;
  /** True for earlier refinements and while a response is streaming. */
  isDisabled: boolean;
}

export interface ResultsGroupTitleRenderProps {
  label: string;
}

export interface ResultsViewMoreRenderProps {
  group: ResultGroupMeta;
  onClick: () => void;
}

// --- Component Override Types ---

export interface WelcomeScreenOverrides {
  title?: ComponentOverrideProps<WelcomeScreenTitleRenderProps>;
  input?: ComponentOverrideProps<WelcomeScreenInputRenderProps>;
  suggestedQuestions?: ComponentOverrideProps<SuggestedQuestionsRenderProps>;
}

export interface ChatInputOverrides {
  reactNode?: ComponentOverrideProps<ChatInputRenderProps>['reactNode'];
}

export interface AiMessageOverrides {
  loader?: ComponentOverrideProps<AiMessageLoaderRenderProps>;
  text?: ComponentOverrideProps<AiMessageTextRenderProps>;
  followUpRefinement?: ComponentOverrideProps<FollowUpRefinementRenderProps>;
}

export interface ResultsBlockOverrides {
  groupTitle?: ComponentOverrideProps<ResultsGroupTitleRenderProps>;
  viewMore?: ComponentOverrideProps<ResultsViewMoreRenderProps>;
  carousel?: CarouselOverrides<Product>;
}

export interface ChatComponentOverrides {
  header?: ComponentOverrideProps<ChatHeaderRenderProps>;
  welcomeScreen?: WelcomeScreenOverrides;
  input?: ComponentOverrideProps<ChatInputRenderProps>;
  userMessage?: ComponentOverrideProps<UserMessageRenderProps>;
  aiMessage?: AiMessageOverrides;
  resultsBlock?: ResultsBlockOverrides;
}

export type { ComponentOverrideProps, IncludeComponentOverrides };
