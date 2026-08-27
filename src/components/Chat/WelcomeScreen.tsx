import React from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import {
  AssistantSubmitSource,
  SuggestedQuestionsRenderProps,
  Translations,
  WelcomeScreenInputRenderProps,
  WelcomeScreenOverrides,
  WelcomeScreenTitleRenderProps,
} from '../../types';
import { SendPlaneIcon } from '../icons';
import translate from '../../utils/translate';
import useMessageInput from '../../hooks/useMessageInput';

interface WelcomeScreenProps {
  suggestions?: string[];
  onSend: (text: string, source?: AssistantSubmitSource) => void;
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
  const {
    value: inputValue,
    setValue: setInputValue,
    handleSubmit,
    handleKeyDown,
  } = useMessageInput({ onSend, isDisabled: disabled });

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

  const handleSuggestionClick = (suggestion: string) => onSend(suggestion, 'suggestion');

  const suggestionsRenderProps: SuggestedQuestionsRenderProps = {
    suggestions,
    onSuggestionClick: handleSuggestionClick,
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
              aria-label={translations?.['CioAsa.welcome.sendAriaLabel']}>
              {translate('CioAsa.welcome.sendButton', translations)}
              <SendPlaneIcon />
            </button>
          </div>
        </RenderPropsWrapper>
        {suggestions.length > 0 && (
          <RenderPropsWrapper
            override={componentOverrides?.suggestedQuestions?.reactNode}
            props={suggestionsRenderProps}>
            <div
              className='cio-asa-welcome-screen__suggestions'
              role='group'
              aria-label={translate('CioAsa.welcome.suggestionsAriaLabel', translations)}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type='button'
                  className='cio-asa-welcome-screen__suggestion-chip'
                  disabled={disabled}
                  onClick={() => handleSuggestionClick(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </RenderPropsWrapper>
        )}
      </div>
      {termsText && <div className='cio-asa-welcome-screen__terms'>{termsText}</div>}
    </div>
  );
}

WelcomeScreen.displayName = 'WelcomeScreen';
