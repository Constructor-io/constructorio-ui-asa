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
import { renderMarkdown } from '../../utils/markdown';
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
  const errorKey = message.interrupted ? 'CioAsa.error.interrupted' : 'CioAsa.error.message';
  const text = isError ? message.text || translate(errorKey, translations) : message.text || '';
  const hasText = text.length > 0;
  const html = renderMarkdown(text);

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
            key={isError ? 'error' : 'text'}
            className={[
              'cio-asa-ai-message__bubble',
              isError && 'cio-asa-ai-message__bubble--error',
            ]
              .filter(Boolean)
              .join(' ')}
            role={isError ? 'alert' : undefined}>
            {html ? (
              <div
                className='cio-asa-ai-message__text'
                // Sanitized by renderMarkdown
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className='cio-asa-ai-message__text'>{text}</div>
            )}
          </div>
        </RenderPropsWrapper>
      )}
    </div>
  );
}

AiMessage.displayName = 'AiMessage';
