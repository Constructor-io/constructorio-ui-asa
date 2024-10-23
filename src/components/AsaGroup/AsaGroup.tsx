import React from 'react';

interface ProductGridProps {
  title?: string;
  subText?: string;
}

export default function AsaGroup(props: React.PropsWithChildren & ProductGridProps) {
  const { children, title, subText } = props;

  return (
    <div className='cio-grid'>
      {title && <div className='cio-grid-title'>{title}</div>}
      {subText && <div className='cio-grid-subtext'>{subText}</div>}
      <div className='cio-line-break' />
      <div className='cio-carousel-container'>{children}</div>
    </div>
  );
}
