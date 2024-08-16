import React from 'react';

interface ButtonProps {
  text?: string;
  fullWidth?: boolean;
}

export default function Button({ text, fullWidth }: ButtonProps) {
  return (
    <button
      type='button'
      className={`cio-asa-button ${fullWidth ? 'cio-asa-button-full-width' : ''}`}>
      {text || 'Click Me'}
    </button>
  );
}
