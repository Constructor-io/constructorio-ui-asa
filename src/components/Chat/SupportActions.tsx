import React from 'react';
import { ChatMessage, SupportAction, Translations } from '../../types';
import translate from '../../utils/translate';

export interface SupportActionsProps {
  message: ChatMessage;
  actions: SupportAction[];
  translations?: Translations;
}

export default function SupportActions({ message, actions, translations }: SupportActionsProps) {
  return (
    <div
      className='cio-asa-support-actions'
      role='group'
      aria-label={translate('CioAsa.supportActions.ariaLabel', translations)}>
      {actions.map((action) => (
        <button
          key={action.label}
          type='button'
          className='cio-asa-support-actions__button'
          onClick={() => action.onClick(message)}>
          {action.label}
        </button>
      ))}
    </div>
  );
}

SupportActions.displayName = 'SupportActions';
