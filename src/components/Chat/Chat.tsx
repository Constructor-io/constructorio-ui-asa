import React, { useState, useRef, useEffect } from 'react';
import useAsaResults from '../../hooks/useAsaResults';
import ChatHeader from './ChatHeader';
import WelcomeScreen from './WelcomeScreen';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ChatProps {
  onClose?: () => void;
  className?: string;
  initialSuggestions?: string[];
  termsText?: React.ReactNode;
  onProductClick?: (product: any) => void;
  onViewMore?: (group: any) => void;
}

export default function Chat({
  onClose,
  className,
  initialSuggestions,
  termsText,
  onProductClick,
  onViewMore,
}: ChatProps) {
  const { messages, sendMessage, isStreaming } = useAsaResults();
  const [view, setView] = useState<'welcome' | 'chat'>('welcome');
  const chatViewRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'chat') {
      const input = chatViewRef.current?.querySelector('input');
      input?.focus();
    }
  }, [view]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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
      role='dialog'
      aria-modal='true'
      aria-label='Shopping assistant chat'
      ref={chatContainerRef}>
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
