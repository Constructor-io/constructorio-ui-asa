import React from 'react';
import { ProductCard } from '@constructor-io/constructorio-ui-components';
import type {
  ProductCardProps,
  ProductCardOverrides,
} from '@constructor-io/constructorio-ui-components';
import { Product } from '../../utils/productNormalizer';
import { PLACEHOLDER_IMAGE } from '../../constants';

interface ProductCardRendererOptions {
  currency?: string;
  addToCartText?: string;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  componentOverrides?: ProductCardOverrides;
}

export default function createProductCardRenderer({
  currency,
  addToCartText,
  onProductClick,
  onAddToCart,
  componentOverrides,
}: ProductCardRendererOptions) {
  const handleAddToCart = onAddToCart
    ? (_e: React.MouseEvent, product: Product) => onAddToCart(product)
    : undefined;

  return function renderProductCard(renderProps: ProductCardProps) {
    const product = renderProps.product as Product;
    return (
      <ProductCard
        product={product}
        className='cio-asa-product-card'
        onProductClick={onProductClick}
        onAddToCart={handleAddToCart}
        addToCartText={addToCartText}
        componentOverrides={componentOverrides}>
        <ProductCard.ImageSection
          className='cio-asa-product-card__image-wrapper'
          imageUrl={product.imageUrl || PLACEHOLDER_IMAGE}>
          {product.badge && <span className='cio-asa-product-card__badge'>{product.badge}</span>}
        </ProductCard.ImageSection>
        <ProductCard.Content className='cio-asa-product-card__info'>
          <ProductCard.TitleSection className='cio-asa-product-card__name' />
          {currency && (
            <ProductCard.PriceSection
              className='cio-asa-product-card__price'
              priceCurrency={currency}
            />
          )}
          {onAddToCart && (
            <ProductCard.AddToCartButton className='cio-asa-product-card__add-to-cart' />
          )}
        </ProductCard.Content>
      </ProductCard>
    );
  };
}
