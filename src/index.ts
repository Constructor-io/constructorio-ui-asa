// Components
export { default as CioAsaProvider } from './components/CioAsaProvider/CioAsaProvider';
export { default as Chat } from './components/Chat/Chat';
export type { ChatHandle } from './components/Chat/Chat';
export { default as ResultsBlock } from './components/ResultsBlock/ResultsBlock';
export type { AspectRatio } from './components/ResultsBlock/ResultsBlock';
export { default as Button } from './components/Button/Button';
export type { ButtonProps } from './components/Button/Button';

// Hooks
export { default as useAsaResults } from './hooks/useAsaResults';
export { default as useAsaTracking } from './hooks/useAsaTracking';
export { default as useCioAsaContext } from './hooks/useCioAsaContext';
export type { UseAsaTrackingProps, UseAsaTrackingReturn } from './hooks/useAsaTracking';

// Utils
export { normalizeItemToProduct } from './utils/productNormalizer';
export type { Product, NormalizeOptions } from './utils/productNormalizer';

// Re-exported client value from the JS client (used to construct/type a cioClient)
export { ConstructorIOClient } from './types';

// Public types
export type {
  // Constructor client / helpers
  Nullable,
  // Provider configuration
  CioAsaProviderProps,
  AsaContextValue,
  CioClientOptions,
  RequestConfigs,
  Formatters,
  UrlHelpers,
  QueryParamEncodingOptions,
  DefaultQueryStringMap,
  // Internationalization
  Translations,
  // Chat data model
  ChatMessage,
  ChatMessageStatus,
  ResultGroup,
  ResultGroupMeta,
  UseChatReturn,
  // Behavioral tracking
  AsaCallbacks,
  AssistantSubmitSource,
  AssistantTrackedItem,
  // Customization via componentOverrides
  ChatComponentOverrides,
  WelcomeScreenOverrides,
  ChatInputOverrides,
  AiMessageOverrides,
  ResultsBlockOverrides,
  ComponentOverrideProps,
  IncludeComponentOverrides,
  // Render props passed to component overrides
  ChatHeaderRenderProps,
  ChatInputRenderProps,
  WelcomeScreenTitleRenderProps,
  WelcomeScreenInputRenderProps,
  SuggestedQuestionsRenderProps,
  UserMessageRenderProps,
  AiMessageLoaderRenderProps,
  AiMessageTextRenderProps,
  ResultsGroupTitleRenderProps,
  ResultsViewMoreRenderProps,
} from './types';
