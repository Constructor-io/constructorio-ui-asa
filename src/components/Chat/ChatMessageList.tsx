import React, { useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ResultGroupMeta } from '../../types';
import { Product } from '../../utils/productNormalizer';
import { AspectRatio } from '../ResultsBlock/ResultsBlock';
import UserMessage from './UserMessage';
import AiMessage from './AiMessage';

interface ChatMessageListProps {
  messages: ChatMessage[];
  onProductClick?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
  onAddToCart?: (product: Product) => void;
  aspectRatio?: AspectRatio;
  currency?: string;
  addToCartText?: string;
  viewMoreText?: string;
}

export default function ChatMessageList({
  messages,
  onProductClick,
  onViewMore,
  onAddToCart,
  aspectRatio,
  currency,
  addToCartText,
  viewMoreText,
}: ChatMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 100;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    const el = listRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, [messages]);

  return (
    <div
      className='cio-asa-chat-message-list'
      ref={listRef}
      onScroll={handleScroll}
      role='log'
      aria-live='polite'
      aria-label='Chat messages'>
      {messages.map((message) => {
        if (message.role === 'user') {
          return <UserMessage key={message.id} text={message.text} />;
        }
        return (
          <AiMessage
            key={message.id}
            message={message}
            onProductClick={onProductClick}
            onViewMore={onViewMore}
            onAddToCart={onAddToCart}
            aspectRatio={aspectRatio}
            currency={currency}
            addToCartText={addToCartText}
            viewMoreText={viewMoreText}
          />
        );
      })}
    </div>
  );
}

ChatMessageList.displayName = 'ChatMessageList';
