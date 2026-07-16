import React from 'react';
import { ChatMessage } from '../../types';
import TypingIndicator from './TypingIndicator';

export interface AiMessageOverrides {
  loader?: React.ReactNode;
  textBubble?: (text: string) => React.ReactNode;
}

export interface AiMessageProps {
  message: ChatMessage;
  componentOverrides?: AiMessageOverrides;
}

export default function AiMessage({ message, componentOverrides }: AiMessageProps) {
  const isLoading = message.status === 'loading';
  const hasText = message.text && message.text.length > 0;
  const hasGroups = message.groups && message.groups.length > 0;

  return (
    <div className='cio-asa-ai-message'>
      {isLoading && !hasText && !hasGroups && (
        componentOverrides?.loader ?? <TypingIndicator />
      )}
      {hasText && (
        componentOverrides?.textBubble ? (
          componentOverrides.textBubble(message.text!)
        ) : (
          <div className='cio-asa-ai-message__bubble'>
            <div className='cio-asa-ai-message__text'>{message.text}</div>
          </div>
        )
      )}
    </div>
  );
}

AiMessage.displayName = 'AiMessage';
