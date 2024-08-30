import React from 'react';
import { ProductInfo } from '../../types';
import Button from '../Button/Button';

export interface ProductCardProps {
  /**
   * Function to format the price.
   */
  formatPrice: (price: number) => string;
  /**
   * Object containing information about the current product, variation
   */
  productInfo: ProductInfo;
}

export default function ProductCard(props: ProductCardProps) {
  const { productInfo, formatPrice } = props;
  const { name, price, imageUrl, url } = productInfo;

  return (
    <a className='cio-product-card' href={url}>
      <div className='cio-image-container'>
        <img alt={name} src={imageUrl} className='cio-image' />
      </div>

      <div className='cio-content'>
        <div className='cio-item-name'>{name}</div>
        <div className='cio-item-price'>{formatPrice(price)}</div>
      </div>

      <div className='cio-cart-button'>
        <Button text='Add to Cart' fullWidth />
      </div>
    </a>
  );
}
