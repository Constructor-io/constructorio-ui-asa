// Components
export { default as CioAsaProvider } from './components/CioAsaProvider/CioAsaProvider';
export { default as Button } from './components/Button/Button';
export { default as Chat } from './components/Chat/Chat';
export type { ChatHandle } from './components/Chat/Chat';
export { default as ChatHeader } from './components/Chat/ChatHeader';
export { default as WelcomeScreen } from './components/Chat/WelcomeScreen';
export { default as ChatMessageList } from './components/Chat/ChatMessageList';
export { default as UserMessage } from './components/Chat/UserMessage';
export { default as AiMessage } from './components/Chat/AiMessage';
export type { AiMessageProps } from './components/Chat/AiMessage';
export { default as TypingIndicator } from './components/Chat/TypingIndicator';
export { default as ChatInput } from './components/Chat/ChatInput';
export { default as ResultsBlock } from './components/ResultsBlock/ResultsBlock';

// Re-export from ui-components
export { ProductCard, Carousel } from '@constructor-io/constructorio-ui-components';

// Hooks
export { default as useAsaResults } from './hooks/useAsaResults';

// Utils
export { normalizeItemToProduct } from './utils/productNormalizer';
export type { Product, NormalizeOptions } from './utils/productNormalizer';

// Types
export * from './types';
