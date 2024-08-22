import React from 'react';

type Direction = 'Prev' | 'Next';

interface NavArrowProps {
  direction: Direction;
  onClick: () => void;
}

export default function NavArrow(props: NavArrowProps) {
  const { onClick, direction } = props;

  return (
    <div
      className={`cio-nav-arrow ${direction === 'Next' ? 'cio-nav-arrow-next' : 'cio-nav-arrow-prev'}`}
      onClick={onClick}
      onKeyDown={onClick}
      role='button'
      tabIndex={-1}>
      <svg
        stroke='currentColor'
        fill='currentColor'
        strokeWidth='0'
        viewBox='20 0 512 512'
        height='32px'
        width='32px'
        xmlns='http://www.w3.org/2000/svg'>
        <path
          fill='none'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='48'
          d={direction === 'Next' ? 'm184 112 144 144-144 144' : 'M328 112 184 256l144 144'}
        />
      </svg>
    </div>
  );
}
