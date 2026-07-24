import React from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import {
  AiMessageLoaderRenderProps,
  AiMessageOverrides,
  AiMessageTextRenderProps,
  ChatMessage,
  Translations,
} from '../../types';
import translate from '../../utils/translate';
import TypingIndicator from './TypingIndicator';

export interface AiMessageProps {
  message: ChatMessage;
  componentOverrides?: AiMessageOverrides;
  translations?: Translations;
}

export default function AiMessage({ message, componentOverrides, translations }: AiMessageProps) {
  const isLoading = message.status === 'loading';
  const isError = message.status === 'error';
  const hasGroups = !!message.groups?.length;
  // On error, fall back to the (translatable) error message when the agent
  // returned no partial text of its own.
  const text = isError
    ? message.text || translate('CioAsa.error.message', translations)
    : message.text || '';
  const hasText = text.length > 0;

  const loaderRenderProps: AiMessageLoaderRenderProps = { translations };
  const textRenderProps: AiMessageTextRenderProps = { text };

  return (
    <div className='cio-asa-ai-message'>
      {isLoading && !hasText && !hasGroups && (
        <RenderPropsWrapper
          override={componentOverrides?.loader?.reactNode}
          props={loaderRenderProps}>
          <TypingIndicator translations={translations} />
        </RenderPropsWrapper>
      )}
      {hasText && (
        <RenderPropsWrapper override={componentOverrides?.text?.reactNode} props={textRenderProps}>
          <div
            className={[
              'cio-asa-ai-message__bubble',
              isError && 'cio-asa-ai-message__bubble--error',
            ]
              .filter(Boolean)
              .join(' ')}>
            <div className='cio-asa-ai-message__text'>{text}</div>
          </div>
        </RenderPropsWrapper>
      )}
    </div>
  );
}

AiMessage.displayName = 'AiMessage';
