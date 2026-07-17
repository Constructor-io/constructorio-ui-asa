import React from 'react';
import { Translations } from '../../types';
import translate from '../../utils/translate';

interface TypingIndicatorProps {
  translations?: Translations;
}

export default function TypingIndicator({ translations }: TypingIndicatorProps) {
  return (
    <div
      className='cio-asa-typing-indicator'
      role='status'
      aria-label={translate('CioAsa.typingIndicator.ariaLabel', translations)}>
      <div className='cio-asa-typing-indicator__dots'>
        <span className='cio-asa-typing-indicator__dot' />
        <span className='cio-asa-typing-indicator__dot' />
        <span className='cio-asa-typing-indicator__dot' />
      </div>
    </div>
  );
}

TypingIndicator.displayName = 'TypingIndicator';
