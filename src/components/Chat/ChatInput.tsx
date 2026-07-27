import React from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import { ChatInputRenderProps, ComponentOverrideProps, Translations } from '../../types';
import { SendArrowIcon } from '../icons';
import translate from '../../utils/translate';
import useMessageInput from '../../hooks/useMessageInput';

interface ChatInputProps {
  onSubmit: (text: string) => void;
  isDisabled?: boolean;
  translations?: Translations;
  componentOverrides?: ComponentOverrideProps<ChatInputRenderProps>;
}

export default function ChatInput({
  onSubmit,
  isDisabled = false,
  translations,
  componentOverrides,
}: ChatInputProps) {
  const { value, setValue, handleSubmit, handleKeyDown } = useMessageInput({
    onSend: onSubmit,
    isDisabled,
    submitOnEnterOnly: true,
  });

  const renderProps: ChatInputRenderProps = {
    value,
    onChange: setValue,
    onSubmit: handleSubmit,
    placeholder: translate('CioAsa.input.placeholder', translations),
    isDisabled,
  };

  return (
    <RenderPropsWrapper override={componentOverrides?.reactNode} props={renderProps}>
      <div className='cio-asa-chat-input-wrapper'>
        <div className='cio-asa-chat-input'>
          <input
            type='text'
            className='cio-asa-chat-input__field'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={renderProps.placeholder}
            disabled={isDisabled}
            aria-label={translate('CioAsa.input.ariaLabel', translations)}
          />
          <button
            type='button'
            className='cio-asa-chat-input__send'
            onClick={handleSubmit}
            disabled={isDisabled || !value.trim()}
            aria-label={translate('CioAsa.input.sendAriaLabel', translations)}>
            <SendArrowIcon />
          </button>
        </div>
      </div>
    </RenderPropsWrapper>
  );
}

ChatInput.displayName = 'ChatInput';
