import React from 'react';
import { Carousel } from '@constructor-io/constructorio-ui-components';
import { ResultGroup } from '../../types';
import { normalizeItemToProduct, Product } from '../../utils/productNormalizer';
import { PLACEHOLDER_IMAGE } from '../../constants';
import './ResultsBlock.css';

export type AspectRatio = '1:1' | '3:4' | '9:16' | '4:3' | '16:9';

interface ResultsBlockProps {
  groups: ResultGroup[];
  aspectRatio?: AspectRatio;
  cardsToShow?: 3 | 5;
  showTitle?: boolean;
  showLink?: boolean;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onViewMore?: (group: ResultGroup['group']) => void;
}

const slidesConfig: Record<3 | 5, number> = {
  3: 3.3,
  5: 5.3,
};

const aspectRatioMap: Record<AspectRatio, string> = {
  '1:1': '1 / 1',
  '3:4': '3 / 4',
  '9:16': '9 / 16',
  '4:3': '4 / 3',
  '16:9': '16 / 9',
};

const emptyOverride = () => null;

interface ProductCardProps {
  product: Product;
  imageStyle: React.CSSProperties;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

function ProductCard({ product, imageStyle, onProductClick, onAddToCart }: ProductCardProps) {
  return (
    <div
      className='cio-asa-product-card'
      role='button'
      tabIndex={0}
      onClick={() => onProductClick?.(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onProductClick?.(product);
      }}>
      <div className='cio-asa-product-card__image-wrapper' style={imageStyle}>
        {product.badge && <span className='cio-asa-product-card__badge'>{product.badge}</span>}
        <img
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          className='cio-asa-product-card__image'
        />
      </div>
      <div className='cio-asa-product-card__info'>
        <span className='cio-asa-product-card__name'>{product.name}</span>
        {product.price && (
          <div className='cio-asa-product-card__price'>
            {product.salePrice ? (
              <>
                <span className='cio-asa-product-card__price--sale'>${product.salePrice}</span>
                <span className='cio-asa-product-card__price--original'>${product.price}</span>
              </>
            ) : (
              <span className='cio-asa-product-card__price--current'>${product.price}</span>
            )}
          </div>
        )}
        {onAddToCart && (
          <button
            type='button'
            className='cio-asa-product-card__add-to-cart'
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}>
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <circle cx='9' cy='21' r='1' />
              <circle cx='20' cy='21' r='1' />
              <path d='M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' />
            </svg>
            Add to cart
          </button>
        )}
      </div>
    </div>
  );
}

export default function ResultsBlock({
  groups,
  aspectRatio = '3:4',
  cardsToShow = 3,
  showTitle = true,
  showLink = true,
  onProductClick,
  onAddToCart,
  onViewMore,
}: ResultsBlockProps) {
  if (!groups || groups.length === 0) return null;

  const imageStyle = { aspectRatio: aspectRatioMap[aspectRatio] };

  const renderProductCard = (renderProps: any) => {
    const product = renderProps.product as Product;
    return (
      <ProductCard
        product={product}
        imageStyle={imageStyle}
        onProductClick={onProductClick}
        onAddToCart={onAddToCart}
      />
    );
  };

  return (
    <div className='cio-asa-results-block'>
      {groups.map((groupData) => {
        const label = groupData.group?.display_name || groupData.group?.value || '';
        const groupKey = groupData.group?.value || label;
        const products = groupData.searchResults.map(normalizeItemToProduct);

        return (
          <div className='cio-asa-results-group' key={groupKey}>
            {showTitle && label && <h3 className='cio-asa-results-group__label'>{label}</h3>}
            <Carousel
              items={products as any}
              loop={false}
              responsive={{
                0: { gap: 12, slidesToShow: slidesConfig[cardsToShow] },
              }}
              componentOverrides={{
                previous: { reactNode: emptyOverride },
                next: { reactNode: emptyOverride },
                item: {
                  productCard: {
                    reactNode: renderProductCard,
                  },
                },
              }}
            />
            {showLink && onViewMore && (
              <button
                type='button'
                className='cio-asa-results-group__view-more'
                onClick={() => onViewMore(groupData.group)}>
                View more products &nbsp;→
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
