import React, { useState } from 'react';
import useAsaResults from '../../hooks/useAsaResults';
import ChatHeader from './ChatHeader';
import WelcomeScreen from './WelcomeScreen';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

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

  const handleSend = (text: string) => {
    if (view === 'welcome') {
      setView('chat');
    }
    sendMessage(text);
  };

  return (
    <div className={`cio-asa cio-asa-chat ${className || ''}`}>
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
          <div className='cio-asa-chat-view cio-asa-chat-view--chat'>
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
