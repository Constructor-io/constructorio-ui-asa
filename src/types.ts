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
import { Product } from './utils/productNormalizer';

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
  itemFieldGetters: ItemFieldGetters;
  formatters: Formatters;
  callbacks: Callbacks;
  urlHelpers: UrlHelpers;
}

export interface RequestConfigs extends IAgentParameters {
  intent?: string;
}

export interface ItemFieldGetters {}
export interface Formatters {
  formatPrice: (price?: number) => string;
}
export interface Callbacks {}
export interface UrlHelpers {
  getUrl: () => string | undefined;
  setUrl: (newUrlWithEncodedState: string) => void;
  getStateFromUrl: (urlString: string) => RequestConfigs;
  getUrlFromState: (state: RequestConfigs, options: QueryParamEncodingOptions) => string;
  defaultQueryStringMap: Readonly<DefaultQueryStringMap>;
}

// eslint-disable-next-line prettier/prettier
export interface CioAsaProviderProps
  extends Omit<Partial<AsaContextValue>, 'setCioClientOptions'>,
    UseCioClientProps {}

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
export type PropsWithChildren<P> = P & { children?: ReactNode };

/**
 * Composes a type for a Component that accepts
 * - Props P,
 * - A children function, that takes RenderProps as its argument
 */
export type IncludeRenderProps<ComponentProps, ChildrenFunctionProps> = ComponentProps & {
  children?: ((props: ChildrenFunctionProps) => ReactNode) | React.ReactNode;
};

export interface ProductInfo {
  name: string;
  price: number;
  url: string | undefined;
  imageUrl: string | undefined;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  groups?: ResultGroup[];
  status: ChatMessageStatus;
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
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isStreaming: boolean;
  clearHistory: () => void;
}

/**
 * Translations type for internationalizing UI strings.
 * All keys are optional — any non-provided translation will fall back to the English default.
 */
export type Translations = {
  'CioAsa.button.label'?: string;
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

export interface AiMessageTextBubbleRenderProps {
  text: string;
}

export interface ResultsBlockRenderProps {
  groups: ResultGroup[];
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
  textBubble?: ComponentOverrideProps<AiMessageTextBubbleRenderProps>;
}

export interface ResultsBlockOverrides {
  reactNode?: ComponentOverrideProps<ResultsBlockRenderProps>['reactNode'];
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
