import React from 'react';

interface UserMessageProps {
  text: string;
}

export default function UserMessage({ text }: UserMessageProps) {
  return (
    <div className='cio-asa-user-message' role='group' aria-label='You said'>
      <div className='cio-asa-user-message__bubble'>{text}</div>
    </div>
  );
}
