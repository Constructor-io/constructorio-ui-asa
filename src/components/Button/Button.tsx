import React from 'react';
import { Button as CioButton } from '@constructor-io/constructorio-ui-components';
import { ChatBubbleDarkIcon, ChatBubbleLightIcon } from '../icons';

export interface ButtonProps {
  /** Color scheme: dark (for light backgrounds) or light (for dark backgrounds) */
  theme?: 'dark' | 'light';
  /** Button size: sm (small) or lg (large) */
  size?: 'sm' | 'lg';
  /** Click handler */
  onClick?: () => void;
  /** Button label text */
  label?: string;
}

export default function Button({
  theme = 'dark',
  size = 'sm',
  onClick,
  label = 'Shopping assistant',
}: ButtonProps) {
  return (
    <CioButton
      className={`cio-asa-button cio-asa-button--${theme} cio-asa-button--${size}`}
      size={size === 'lg' ? 'default' : 'sm'}
      onClick={onClick}>
      {theme === 'dark' ? <ChatBubbleDarkIcon /> : <ChatBubbleLightIcon />}
      <span className='cio-asa-button__label'>{label}</span>
    </CioButton>
  );
}
