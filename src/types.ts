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
  extends Omit<Partial<AsaContextValue>, 'setCioClientOptions' | 'cioClientOptions'> {
  apiKey?: string;
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
}

export type ChatMessageStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export interface ResultGroupMeta {
  display_name: string;
  value?: string;
  data?: { display_name?: string; [key: string]: unknown };
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
  isStreaming: boolean;
  clearHistory: () => void;
}

// --- Behavioral tracking ---

/** How an intent was submitted: typed into the input, or a suggestion chip clicked. */
export type AssistantSubmitSource = 'input' | 'suggestion';

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
  /** User submitted an intent (typed) or clicked a suggestion. */
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
  'CioAsa.welcome.sendAriaLabel'?: string;
  'CioAsa.welcome.suggestionsAriaLabel'?: string;
  'CioAsa.messageList.ariaLabel'?: string;
  'CioAsa.typingIndicator.ariaLabel'?: string;
  'CioAsa.userMessage.ariaLabel'?: string;
  'CioAsa.results.viewMore'?: string;
  'CioAsa.results.addToCart'?: string;
  'CioAsa.results.saleBadge'?: string;
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
