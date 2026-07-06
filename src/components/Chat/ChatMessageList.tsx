import React, { useEffect, useRef } from 'react';
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className='cio-asa-chat-message-list'>
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
      <div ref={bottomRef} />
    </div>
  );
}
