import React from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import { ChatHeaderRenderProps, ComponentOverrideProps, Translations } from '../../types';
import translate from '../../utils/translate';

interface ChatHeaderProps {
  onClose?: () => void;
  translations?: Translations;
  componentOverrides?: ComponentOverrideProps<ChatHeaderRenderProps>;
}

export default function ChatHeader({ onClose, translations, componentOverrides }: ChatHeaderProps) {
  const renderProps: ChatHeaderRenderProps = {
    title: translate('CioAsa.header.title', translations),
    onClose,
  };

  return (
    <RenderPropsWrapper override={componentOverrides?.reactNode} props={renderProps}>
      <div className='cio-asa-chat-header'>
        <h2 id='cio-asa-chat-title' className='cio-asa-chat-header__title'>
          {renderProps.title}
        </h2>
        {onClose && (
          <button
            type='button'
            className='cio-asa-chat-header__close'
            onClick={onClose}
            aria-label={translate('CioAsa.header.close', translations)}
          />
        )}
      </div>
    </RenderPropsWrapper>
  );
}

ChatHeader.displayName = 'ChatHeader';
