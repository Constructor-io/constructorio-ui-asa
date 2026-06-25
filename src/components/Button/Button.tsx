import React from 'react';

export interface AsaButtonProps {
  /** Button text content */
  label?: string;
  /** Color scheme: dark (for light backgrounds) or light (for dark backgrounds) */
  theme?: 'dark' | 'light';
  /** Button size: sm (small) or lg (large) */
  size?: 'sm' | 'lg';
  /** Click handler */
  onClick?: () => void;
}

export default function Button({
  label = 'Shopping assistant',
  theme = 'dark',
  size = 'sm',
  onClick,
}: AsaButtonProps) {
  return (
    <button
      type='button'
      className={`cio-asa-button cio-asa-button--${theme} cio-asa-button--${size}`}
      onClick={onClick}
    >
      {theme === 'dark' ? (
        <svg className='cio-asa-button__icon' width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
          <path d='M12.667 3.16699C12.7573 3.16717 12.8328 3.24274 12.833 3.33301V12.126L10.874 10.167H3.33301C3.24263 10.1668 3.16699 10.0904 3.16699 10V9.16699H11.833V3.16699H12.667ZM0.666992 0.5H9.33301C9.42353 0.5 9.5 0.576467 9.5 0.666992V6.66699C9.49982 6.75737 9.42342 6.83301 9.33301 6.83301H2.45996L0.5 8.79297V0.666992C0.5 0.576468 0.576468 0.5 0.666992 0.5ZM0.833008 7.9873L2.32031 6.5H9.16699V0.833008H0.833008V7.9873Z' fill='white' stroke='white' />
        </svg>
      ) : (
        <svg className='cio-asa-button__icon' width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
          <path d='M14 4.50024C14.0903 4.50043 14.1658 4.57599 14.166 4.66626V13.4592L12.207 11.5002H4.66602C4.57563 11.5001 4.5 11.4237 4.5 11.3333V10.5002H13.166V4.50024H14ZM2 1.83325H10.666C10.7565 1.83325 10.833 1.90972 10.833 2.00024V8.00024C10.8328 8.09063 10.7564 8.16626 10.666 8.16626H3.79297L1.83301 10.1262V2.00024C1.83301 1.90972 1.90948 1.83325 2 1.83325ZM2.16602 9.32056L3.65332 7.83325H10.5V2.16626H2.16602V9.32056Z' fill='black' stroke='black' />
        </svg>
      )}
      <span className='cio-asa-button__label'>{label}</span>
    </button>
  );
}
