import React from 'react';
import ProductCardCarousel from '../ProductCardCarousel/ProductCardCarousel';
import { AsaResultGroup } from '../../hooks/useAsaResults';

interface AsaGroupProps {
  group: AsaResultGroup;
}

export default function AsaGroup(props: React.PropsWithChildren & AsaGroupProps) {
  const { children, group } = props;

  const { display_name: title, text: subText } = group.group;

  const defaultMarkup = (
    <>
      {title && <div className='cio-grid-title'>{title}</div>}
      {subText && <div className='cio-grid-subtext'>{subText}</div>}
      <div className='cio-line-break' />
      <div className='cio-carousel-container'>
        {group.searchResults.map((searchResult) => (
          <ProductCardCarousel searchResult={searchResult} />
        ))}
      </div>
    </>
  );

  return <div className='cio-grid'>{children || defaultMarkup}</div>;
}
