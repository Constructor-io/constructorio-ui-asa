import React from 'react';
import { ChatMessage, ResultGroupMeta } from '../../types';
import { Product } from '../../utils/productNormalizer';
import TypingIndicator from './TypingIndicator';
import ResultsBlock from '../ResultsBlock/ResultsBlock';

interface AiMessageProps {
  message: ChatMessage;
  onProductClick?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
}

export default function AiMessage({ message, onProductClick, onViewMore }: AiMessageProps) {
  const isLoading = message.status === 'loading';
  const hasText = message.text && message.text.length > 0;
  const hasGroups = message.groups && message.groups.length > 0;

  return (
    <div className='cio-asa-ai-message' role='group' aria-label='Assistant said'>
      {isLoading && !hasText && !hasGroups && <TypingIndicator />}
      {hasText && (
        <div className='cio-asa-ai-message__bubble'>
          <div className='cio-asa-ai-message__text'>{message.text}</div>
        </div>
      )}
      {hasGroups && (
        <ResultsBlock
          groups={message.groups!}
          onProductClick={onProductClick}
          onViewMore={onViewMore}
        />
      )}
    </div>
  );
}

AiMessage.displayName = 'AiMessage';
