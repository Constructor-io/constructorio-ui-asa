import React, { useState, useRef, useEffect } from 'react';
import useAsaResults from '../../hooks/useAsaResults';
import { ResultGroupMeta } from '../../types';
import { Product } from '../../utils/productNormalizer';
import ChatHeader from './ChatHeader';
import WelcomeScreen from './WelcomeScreen';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

interface ChatProps {
  onClose?: () => void;
  className?: string;
  initialSuggestions?: string[];
  termsText?: React.ReactNode;
  ariaLabel?: string;
  onProductClick?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
}

export default function Chat({
  onClose,
  className,
  initialSuggestions,
  termsText,
  ariaLabel = 'Shopping assistant chat',
  onProductClick,
  onViewMore,
}: ChatProps) {
  const { messages, sendMessage, isStreaming } = useAsaResults();
  const [view, setView] = useState<'welcome' | 'chat'>('welcome');
  const chatViewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'chat') {
      const input = chatViewRef.current?.querySelector('input');
      input?.focus();
    }
  }, [view]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = (text: string) => {
    if (view === 'welcome') {
      setView('chat');
    }
    sendMessage(text);
  };

  return (
    <div
      className={`cio-asa cio-asa-chat ${className || ''}`}
      ref={containerRef}
      role='dialog'
      aria-modal='false'
      aria-label={ariaLabel}>
      <ChatHeader onClose={onClose} />
      <div className='cio-asa-chat-body'>
        {view === 'welcome' ? (
          <div className='cio-asa-chat-view cio-asa-chat-view--welcome'>
            <WelcomeScreen
              suggestions={initialSuggestions}
              onSend={handleSend}
              termsText={termsText}
            />
          </div>
        ) : (
          <div className='cio-asa-chat-view cio-asa-chat-view--chat' ref={chatViewRef}>
            <ChatMessageList
              messages={messages}
              onProductClick={onProductClick}
              onViewMore={onViewMore}
            />
            <ChatInput onSubmit={handleSend} isDisabled={isStreaming} />
          </div>
        )}
      </div>
    </div>
  );
}

Chat.displayName = 'Chat';
