import React, { useEffect, useRef, useCallback } from 'react';
import {
  AiMessageOverrides,
  ChatMessage,
  ComponentOverrideProps,
  ResultGroupMeta,
  ResultsBlockOverrides,
  Translations,
  UserMessageRenderProps,
} from '../../types';
import translate from '../../utils/translate';
import { Product, NormalizeOptions } from '../../utils/productNormalizer';
import ResultsBlock, { AspectRatio } from '../ResultsBlock/ResultsBlock';
import UserMessage from './UserMessage';
import AiMessage from './AiMessage';

interface ChatMessageListProps {
  messages: ChatMessage[];
  onProductClick?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
  onAddToCart?: (product: Product) => void;
  aspectRatio?: AspectRatio;
  currency?: string;
  normalizeItem?: (item: any, options?: NormalizeOptions) => Product;
  addToCartText?: string;
  viewMoreText?: string;
  aiMessageOverrides?: AiMessageOverrides;
  userMessageOverrides?: ComponentOverrideProps<UserMessageRenderProps>;
  resultsBlockOverrides?: ResultsBlockOverrides;
  translations?: Translations;
}

export default function ChatMessageList({
  messages,
  onProductClick,
  onViewMore,
  onAddToCart,
  aspectRatio,
  currency,
  normalizeItem,
  addToCartText,
  viewMoreText,
  aiMessageOverrides,
  userMessageOverrides,
  resultsBlockOverrides,
  translations,
}: ChatMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 100;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (!isNearBottomRef.current) return;
    const el = listRef.current;
    if (!el) return;

    // Smooth-scroll only when a new message is added; use 'auto' for the frequent
    // updates during SSE streaming to avoid restarting the animation on every chunk.
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: isNewMessage ? 'smooth' : 'auto' });
    });
  }, [messages]);

  return (
    <div
      className='cio-asa-chat-message-list'
      ref={listRef}
      onScroll={handleScroll}
      role='log'
      aria-live='polite'
      tabIndex={0}
      aria-label={translate('CioAsa.messageList.ariaLabel', translations)}>
      {messages.map((message) => {
        if (message.role === 'user') {
          return (
            <UserMessage
              key={message.id}
              text={message.text}
              translations={translations}
              componentOverrides={userMessageOverrides}
            />
          );
        }

        const hasGroups = !!message.groups?.length;

        return (
          <div key={message.id} className='cio-asa-ai-message-group'>
            <AiMessage
              message={message}
              componentOverrides={aiMessageOverrides}
              translations={translations}
            />
            {hasGroups && (
              <ResultsBlock
                groups={message.groups!}
                onProductClick={onProductClick}
                onViewMore={onViewMore}
                onAddToCart={onAddToCart}
                aspectRatio={aspectRatio}
                currency={currency}
                normalizeItem={normalizeItem}
                addToCartText={addToCartText}
                viewMoreText={viewMoreText}
                saleBadgeText={translate('CioAsa.results.saleBadge', translations)}
                componentOverrides={resultsBlockOverrides}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

ChatMessageList.displayName = 'ChatMessageList';
