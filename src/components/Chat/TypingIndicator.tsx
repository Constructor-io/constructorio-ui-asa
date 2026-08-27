import React from 'react';
import { Translations } from '../../types';
import translate from '../../utils/translate';

interface TypingIndicatorProps {
  translations?: Translations;
}

export default function TypingIndicator({ translations }: TypingIndicatorProps) {
  return (
    <div className='cio-asa-typing-indicator' role='status'>
      <span className='cio-sr-only'>
        {translate('CioAsa.typingIndicator.ariaLabel', translations)}
      </span>
      <div className='cio-asa-typing-indicator__dots' aria-hidden='true'>
        <span className='cio-asa-typing-indicator__dot' />
        <span className='cio-asa-typing-indicator__dot' />
        <span className='cio-asa-typing-indicator__dot' />
      </div>
    </div>
  );
}

TypingIndicator.displayName = 'TypingIndicator';
