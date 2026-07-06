import React, { useState } from 'react';

interface ChatInputProps {
  onSubmit: (text: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSubmit,
  isDisabled = false,
  placeholder = 'Ask a question about this product',
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim() || isDisabled) return;
    onSubmit(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className='cio-asa-chat-input'>
      <input
        type='text'
        className='cio-asa-chat-input__field'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        aria-label='Type your message'
      />
      <button
        type='button'
        className='cio-asa-chat-input__send'
        onClick={handleSubmit}
        disabled={isDisabled || !value.trim()}
        aria-label='Send message'>
        <svg
          width='10'
          height='11'
          viewBox='0 0 10 11'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          aria-hidden='true'>
          <path
            d='M0.5 5L5 0.5L9.5 5M5 1.125V10.25'
            stroke='#0F1324'
            strokeOpacity='0.7'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </button>
    </div>
  );
}
