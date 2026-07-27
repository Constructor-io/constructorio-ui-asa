import React from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import { ComponentOverrideProps, Translations, UserMessageRenderProps } from '../../types';
import translate from '../../utils/translate';

interface UserMessageProps {
  text: string;
  translations?: Translations;
  componentOverrides?: ComponentOverrideProps<UserMessageRenderProps>;
}

export default function UserMessage({ text, translations, componentOverrides }: UserMessageProps) {
  const renderProps: UserMessageRenderProps = { text };

  return (
    <RenderPropsWrapper override={componentOverrides?.reactNode} props={renderProps}>
      <div
        className='cio-asa-user-message'
        role='group'
        aria-label={translate('CioAsa.userMessage.ariaLabel', translations)}>
        <div className='cio-asa-user-message__bubble'>{text}</div>
      </div>
    </RenderPropsWrapper>
  );
}

UserMessage.displayName = 'UserMessage';
