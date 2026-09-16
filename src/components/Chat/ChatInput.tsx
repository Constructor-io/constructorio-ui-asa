import React from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import { ChatInputRenderProps, ComponentOverrideProps, Translations } from '../../types';
import { SendArrowIcon, StopIcon } from '../icons';
import translate from '../../utils/translate';
import useMessageInput from '../../hooks/useMessageInput';

interface ChatInputProps {
  onSubmit: (text: string) => void;
  isDisabled?: boolean;
  /** A reply is streaming: the send button becomes a stop button. */
  isStreaming?: boolean;
  /** Cancel the in-flight reply. */
  onAbort?: () => void;
  /**
   * Whether the built-in stop button replaces send while streaming. When false the send
   * button stays (disabled, as before), but `onAbort` still reaches the render props — a
   * consumer who opts out of the default control can still render their own.
   */
  showStopButton?: boolean;
  translations?: Translations;
  componentOverrides?: ComponentOverrideProps<ChatInputRenderProps>;
}

export default function ChatInput({
  onSubmit,
  isDisabled = false,
  isStreaming = false,
  onAbort,
  showStopButton = true,
  translations,
  componentOverrides,
}: ChatInputProps) {
  const { value, setValue, handleSubmit, handleKeyDown } = useMessageInput({
    onSend: onSubmit,
    isDisabled,
    submitOnEnterOnly: true,
  });

  // The stop button only makes sense when there is something to stop and a way to do it.
  const canAbort = isStreaming && showStopButton && typeof onAbort === 'function';

  const renderProps: ChatInputRenderProps = {
    value,
    onChange: setValue,
    onSubmit: handleSubmit,
    placeholder: translate('CioAsa.input.placeholder', translations),
    isDisabled,
    isStreaming,
    onAbort: onAbort ?? (() => {}),
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
          {canAbort ? (
            <button
              type='button'
              className='cio-asa-chat-input__send cio-asa-chat-input__stop'
              onClick={onAbort}
              aria-label={translate('CioAsa.input.stopAriaLabel', translations)}>
              <StopIcon />
            </button>
          ) : (
            <button
              type='button'
              className='cio-asa-chat-input__send'
              onClick={handleSubmit}
              disabled={isDisabled || !value.trim()}
              aria-label={translate('CioAsa.input.sendAriaLabel', translations)}>
              <SendArrowIcon />
            </button>
          )}
        </div>
      </div>
    </RenderPropsWrapper>
  );
}

ChatInput.displayName = 'ChatInput';
