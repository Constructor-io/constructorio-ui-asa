import React, { useState } from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import {
  SuggestedQuestionsRenderProps,
  Translations,
  WelcomeScreenInputRenderProps,
  WelcomeScreenOverrides,
  WelcomeScreenTitleRenderProps,
} from '../../types';
import { SendPlaneIcon } from '../icons';
import translate from '../../utils/translate';

interface WelcomeScreenProps {
  suggestions?: string[];
  onSend: (text: string) => void;
  onClose?: () => void;
  termsText?: React.ReactNode;
  disabled?: boolean;
  translations?: Translations;
  componentOverrides?: WelcomeScreenOverrides;
}

const DEFAULT_SUGGESTIONS: string[] = [];

export default function WelcomeScreen({
  suggestions = DEFAULT_SUGGESTIONS,
  onSend,
  onClose,
  termsText,
  disabled = false,
  translations,
  componentOverrides,
}: WelcomeScreenProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    if (disabled || !inputValue.trim()) return;
    onSend(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const titleRenderProps: WelcomeScreenTitleRenderProps = {
    text: translate('CioAsa.welcome.title', translations),
  };

  const inputRenderProps: WelcomeScreenInputRenderProps = {
    value: inputValue,
    onChange: setInputValue,
    onSubmit: handleSubmit,
    placeholder: translate('CioAsa.welcome.placeholder', translations),
    isDisabled: disabled,
  };

  const suggestionsRenderProps: SuggestedQuestionsRenderProps = {
    suggestions,
    onSuggestionClick: onSend,
  };

  return (
    <div className='cio-asa-welcome-screen'>
      {onClose && (
        <button
          type='button'
          className='cio-asa-welcome-screen__close'
          onClick={onClose}
          aria-label={translate('CioAsa.header.close', translations)}>
          ✕
        </button>
      )}
      <div className='cio-asa-welcome-screen__content'>
        <RenderPropsWrapper
          override={componentOverrides?.title?.reactNode}
          props={titleRenderProps}>
          <h2 id='cio-asa-chat-title' className='cio-asa-welcome-screen__title'>
            {titleRenderProps.text}
          </h2>
        </RenderPropsWrapper>
        <RenderPropsWrapper
          override={componentOverrides?.input?.reactNode}
          props={inputRenderProps}>
          <div
            className={`cio-asa-welcome-screen__input-row${disabled ? ' cio-asa-welcome-screen__input-row--disabled' : ''}`}>
            <input
              type='text'
              className='cio-asa-welcome-screen__input'
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputRenderProps.placeholder}
              disabled={disabled}
              aria-label={translate('CioAsa.welcome.inputAriaLabel', translations)}
            />
            <button
              type='button'
              className='cio-asa-welcome-screen__send-btn'
              onClick={handleSubmit}
              disabled={disabled || !inputValue.trim()}
              aria-label={translate('CioAsa.welcome.sendAriaLabel', translations)}>
              {translate('CioAsa.welcome.sendButton', translations)}
              <SendPlaneIcon />
            </button>
          </div>
        </RenderPropsWrapper>
        {suggestions.length > 0 && (
          <RenderPropsWrapper
            override={componentOverrides?.suggestedQuestions?.reactNode}
            props={suggestionsRenderProps}>
            <nav
              className='cio-asa-welcome-screen__suggestions'
              aria-label={translate('CioAsa.welcome.suggestionsAriaLabel', translations)}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type='button'
                  className='cio-asa-welcome-screen__suggestion-chip'
                  disabled={disabled}
                  onClick={() => onSend(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </nav>
          </RenderPropsWrapper>
        )}
      </div>
      {termsText && <div className='cio-asa-welcome-screen__terms'>{termsText}</div>}
    </div>
  );
}

WelcomeScreen.displayName = 'WelcomeScreen';
