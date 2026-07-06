import React, { useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../../types';
import UserMessage from './UserMessage';
import AiMessage from './AiMessage';

interface ChatMessageListProps {
  messages: ChatMessage[];
  onProductClick?: (product: any) => void;
  onViewMore?: (group: any) => void;
}

export default function ChatMessageList({
  messages,
  onProductClick,
  onViewMore,
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
          />
        );
      })}
    </div>
  );
}
