import React from 'react';

export default function TypingIndicator() {
  return (
    <div className='cio-asa-typing-indicator' role='status' aria-label='Assistant is typing'>
      <div className='cio-asa-typing-indicator__dots'>
        <span className='cio-asa-typing-indicator__dot' />
        <span className='cio-asa-typing-indicator__dot' />
        <span className='cio-asa-typing-indicator__dot' />
      </div>
    </div>
  );
}
