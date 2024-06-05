import React from 'react';

interface ButtonProps {
  text?: string;
}

export default function Button({ text }: ButtonProps) {
  return (
    <button type='button' className='cio-asa-button'>
      {text || 'Click Me'}
    </button>
  );
}
