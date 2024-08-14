import React from 'react';

interface ButtonProps {
  text?: string;
  fullWidth?: boolean;
}

export default function Button({ text, fullWidth }: ButtonProps) {
  return (
    <button
      type='button'
      className='cio-asa-button'
      style={fullWidth ? { width: '100%' } : undefined}>
      {text || 'Click Me'}
    </button>
  );
}
