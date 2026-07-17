import React from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import {
  AiMessageLoaderRenderProps,
  AiMessageOverrides,
  AiMessageTextBubbleRenderProps,
  ChatMessage,
  Translations,
} from '../../types';
import TypingIndicator from './TypingIndicator';

export interface AiMessageProps {
  message: ChatMessage;
  componentOverrides?: AiMessageOverrides;
  translations?: Translations;
}

export default function AiMessage({ message, componentOverrides, translations }: AiMessageProps) {
  const isLoading = message.status === 'loading';
  const hasText = message.text && message.text.length > 0;
  const hasGroups = message.groups && message.groups.length > 0;

  const loaderRenderProps: AiMessageLoaderRenderProps = { translations };
  const textBubbleRenderProps: AiMessageTextBubbleRenderProps = { text: message.text || '' };

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
        <RenderPropsWrapper
          override={componentOverrides?.textBubble?.reactNode}
          props={textBubbleRenderProps}>
          <div className='cio-asa-ai-message__bubble'>
            <div className='cio-asa-ai-message__text'>{message.text}</div>
          </div>
        </RenderPropsWrapper>
      )}
    </div>
  );
}

AiMessage.displayName = 'AiMessage';
