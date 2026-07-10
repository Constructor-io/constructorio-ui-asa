import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import useAsaResults from '../../hooks/useAsaResults';
import { ResultGroupMeta } from '../../types';
import { Product } from '../../utils/productNormalizer';
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
  termsText?: string;
  /** Accessible label for the chat dialog */
  ariaLabel?: string;
  /** Called when a product card is clicked */
  onProductClick?: (product: Product) => void;
  /** Called when "View more" link is clicked in a results group */
  onViewMore?: (group: ResultGroupMeta) => void;
}

const Chat = forwardRef<ChatHandle, ChatProps>(
  (
    {
      onClose,
      className,
      initialSuggestions,
      termsText,
      ariaLabel = 'Shopping assistant chat',
      onProductClick,
      onViewMore,
    },
    ref,
  ) => {
    const { messages, sendMessage, isStreaming, clearHistory } = useAsaResults();
    const [view, setView] = useState<'welcome' | 'chat'>('welcome');
    const chatViewRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      clearHistory: () => {
        clearHistory();
        setView('welcome');
      },
    }));

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
        aria-modal='true'
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
  },
);

Chat.displayName = 'Chat';
export default Chat;
