import React from 'react';
import { ProductInfo } from '../../types';
import './ProductCard.css';
import '../../styles.css';
import Button from '../Button/Button';

export interface ProductCardRenderProps {
  /**
   * Function to format the price.
   */
  formatPrice: (price: number) => string;
  /**
   * Object containing information about the current product, variation
   */
  productInfo: ProductInfo;
}

export default function ProductCard(props: ProductCardRenderProps) {
  const { productInfo, formatPrice } = props;
  const { itemName, itemPrice, itemImageUrl, itemUrl } = productInfo;

  return (
    <a className='cio-product-card' href={itemUrl}>
      <div className='cio-image-container'>
        <img alt={itemName} src={itemImageUrl} className='cio-image' />
      </div>

      <div className='cio-content'>
        <div className='cio-item-name'>{itemName}</div>
        <div className='cio-item-price'>{formatPrice(itemPrice)}</div>
      </div>

      <div>
        <Button text='Add to Cart' fullWidth />
      </div>
    </a>
  );
}
