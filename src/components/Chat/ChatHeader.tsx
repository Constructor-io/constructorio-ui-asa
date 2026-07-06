import React from 'react';

interface ChatHeaderProps {
  onClose?: () => void;
}

export default function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className='cio-asa-chat-header'>
      {onClose && (
        <button
          type='button'
          className='cio-asa-chat-header__close'
          onClick={onClose}
          aria-label='Close'
        >
          ✕
        </button>
      )}
    </div>
  );
}
