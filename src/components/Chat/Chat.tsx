import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import useAsaResults from '../../hooks/useAsaResults';
import useFocusTrap from '../../hooks/useFocusTrap';
import { ChatComponentOverrides, ChatMessage, ResultGroupMeta, Translations } from '../../types';
import { Product, NormalizeOptions } from '../../utils/productNormalizer';
import translate from '../../utils/translate';
import { AspectRatio } from '../ResultsBlock/ResultsBlock';
import ChatHeader from './ChatHeader';
import WelcomeScreen from './WelcomeScreen';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

export interface ChatHandle {
  clearHistory: () => void;
}

interface ChatProps {
  /** Called when the close button (✕) is clicked. The consumer controls visibility. */
  onClose?: () => void;
  /** Additional CSS class name for the root container */
  className?: string;
  /** Suggestion chips shown on the welcome screen */
  initialSuggestions?: string[];
  /** Legal/terms text displayed below the welcome screen input */
  termsText?: React.ReactNode;
  /** Called when a product card is clicked */
  onProductClick?: (product: Product) => void;
  /** Called when "View more" link is clicked in a results group */
  onViewMore?: (group: ResultGroupMeta) => void;
  /** Called when "Add to cart" button is clicked. If not provided, the button is hidden. */
  onAddToCart?: (product: Product) => void;
  /** Image aspect ratio for product cards */
  aspectRatio?: AspectRatio;
  /** Currency symbol for product prices */
  currency?: string;
  /**
   * Map a raw search-result item to the `Product` shape rendered by result cards.
   * Override this when your index metadata uses non-default field names.
   */
  normalizeItem?: (item: any, options?: NormalizeOptions) => Product;
  /** Override any sub-component with custom render props or React nodes */
  componentOverrides?: ChatComponentOverrides;
  /** Translation overrides for internationalizing UI strings */
  translations?: Translations;
}

// a11y: text for the screen-reader live region that voices the conversation
function getAnnouncement(messages: ChatMessage[], translations?: Translations): string {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role !== 'assistant') return '';

  if (lastMessage.status === 'loading' || lastMessage.status === 'streaming') {
    const userText = messages[messages.length - 2]?.text ?? '';
    const youSaid = translate('CioAsa.userMessage.ariaLabel', translations);
    const typing = translate('CioAsa.typingIndicator.ariaLabel', translations);
    return `${youSaid}: ${userText}. ${typing}`;
  }

  if (lastMessage.status === 'done' && lastMessage.text) {
    return `${translate('CioAsa.aiMessage.ariaLabel', translations)}: ${lastMessage.text}`;
  }

  return '';
}

const Chat = forwardRef<ChatHandle, ChatProps>(
  (
    {
      onClose,
      className,
      initialSuggestions,
      termsText,
      onProductClick,
      onViewMore,
      onAddToCart,
      aspectRatio,
      currency,
      normalizeItem,
      componentOverrides,
      translations,
    },
    ref,
  ) => {
    const { messages, sendMessage, isStreaming, clearHistory } = useAsaResults();
    const chatViewRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isWelcome = messages.length === 0;
    const isModal = typeof onClose === 'function';
    const announcement = getAnnouncement(messages, translations);

    useImperativeHandle(ref, () => ({
      clearHistory,
    }));

    useEffect(() => {
      const root = isWelcome ? containerRef.current : chatViewRef.current;
      const input = root?.querySelector('input');
      if (input) {
        // preventScroll: focusing must not scroll the page — the host may render Chat
        // below the fold (or, as in Storybook docs, several instances on one page).
        try {
          input.focus({ preventScroll: true });
        } catch {
          input.focus();
        }
      }
    }, [isWelcome]);

    useFocusTrap(containerRef, { onEscape: onClose, trapFocus: isModal });

    return (
      <div
        className={['cio-asa', 'cio-asa-chat', className].filter(Boolean).join(' ')}
        ref={containerRef}
        role='dialog'
        aria-modal={isModal ? 'true' : undefined}
        aria-label={translate(
          isWelcome ? 'CioAsa.welcome.title' : 'CioAsa.header.title',
          translations,
        )}>
        <div className='cio-sr-only' role='status'>
          {announcement}
        </div>
        <div className='cio-asa-chat-body'>
          {isWelcome ? (
            <div className='cio-asa-chat-view cio-asa-chat-view--welcome'>
              <WelcomeScreen
                suggestions={initialSuggestions}
                onSend={sendMessage}
                onClose={onClose}
                termsText={termsText}
                translations={translations}
                componentOverrides={componentOverrides?.welcomeScreen}
              />
            </div>
          ) : (
            <div className='cio-asa-chat-view cio-asa-chat-view--chat' ref={chatViewRef}>
              <ChatHeader
                onClose={onClose}
                translations={translations}
                componentOverrides={componentOverrides?.header}
              />
              <ChatMessageList
                messages={messages}
                onProductClick={onProductClick}
                onViewMore={onViewMore}
                onAddToCart={onAddToCart}
                aspectRatio={aspectRatio}
                currency={currency}
                normalizeItem={normalizeItem}
                addToCartText={translate('CioAsa.results.addToCart', translations)}
                viewMoreText={translate('CioAsa.results.viewMore', translations)}
                aiMessageOverrides={componentOverrides?.aiMessage}
                userMessageOverrides={componentOverrides?.userMessage}
                resultsBlockOverrides={componentOverrides?.resultsBlock}
                translations={translations}
              />
              <ChatInput
                onSubmit={sendMessage}
                isDisabled={isStreaming}
                translations={translations}
                componentOverrides={componentOverrides?.input}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

Chat.displayName = 'Chat';
export default Chat;
