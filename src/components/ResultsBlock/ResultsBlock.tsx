import React, { useRef, useState, useEffect } from 'react';
import { Carousel, ProductCard } from '@constructor-io/constructorio-ui-components';
import { ResultGroup, ResultGroupMeta } from '../../types';
import { normalizeItemToProduct, Product } from '../../utils/productNormalizer';
import { PLACEHOLDER_IMAGE } from '../../constants';
import './ResultsBlock.css';

export type AspectRatio = '1:1' | '3:4' | '9:16' | '4:3' | '16:9';

interface ResultsBlockProps {
  groups: ResultGroup[];
  aspectRatio?: AspectRatio;
  minCardWidth?: number;
  gap?: number;
  showTitle?: boolean;
  viewMoreText?: string;
  addToCartText?: string;
  currency?: string;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
}

const PEEK_FRACTION = 0.3;

const aspectRatioMap: Record<AspectRatio, string> = {
  '1:1': '1 / 1',
  '3:4': '3 / 4',
  '9:16': '9 / 16',
  '4:3': '4 / 3',
  '16:9': '16 / 9',
};

function PreviousButton() {
  return null;
}

function NextButton() {
  return null;
}

function ResultsBlock({
  groups,
  aspectRatio = '3:4',
  minCardWidth = 150,
  gap = 12,
  showTitle = true,
  viewMoreText = 'View more products',
  addToCartText = 'Add to cart',
  currency,
  onProductClick,
  onAddToCart,
  onViewMore,
}: ResultsBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [slidesToShow, setSlidesToShow] = useState(3 + PEEK_FRACTION);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const width = el.clientWidth;
      const count = Math.max(1, Math.floor(width / (minCardWidth + gap)));
      setSlidesToShow(count + PEEK_FRACTION);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!groups || groups.length === 0) return null;

  const handleAddToCart = onAddToCart
    ? (_e: React.MouseEvent, product: Product) => onAddToCart(product)
    : undefined;

  const renderProductCard = (renderProps: any) => {
    const product = renderProps.product as Product;
    return (
      <ProductCard
        product={product}
        className='cio-asa-product-card'
        onProductClick={onProductClick}
        onAddToCart={handleAddToCart}
        addToCartText={addToCartText}>
        <ProductCard.ImageSection className='cio-asa-product-card__image-wrapper' imageUrl={product.imageUrl || PLACEHOLDER_IMAGE}>
          {product.badge && <span className='cio-asa-product-card__badge'>{product.badge}</span>}
        </ProductCard.ImageSection>
        <ProductCard.Content className='cio-asa-product-card__info'>
          <ProductCard.TitleSection className='cio-asa-product-card__name' />
          {currency && <ProductCard.PriceSection className='cio-asa-product-card__price' priceCurrency={currency} />}
          {onAddToCart && <ProductCard.AddToCartButton className='cio-asa-product-card__add-to-cart' />}
        </ProductCard.Content>
      </ProductCard>
    );
  };

  return (
    <div ref={containerRef} className='cio-asa-results-block' style={{ '--cio-asa-image-ratio': aspectRatioMap[aspectRatio] } as React.CSSProperties}>
      {groups.map((groupData) => {
        const label = groupData.group?.display_name || groupData.group?.value || '';
        const groupKey = groupData.group?.value || label;
        const products = groupData.searchResults.map(normalizeItemToProduct);

        return (
          <div className='cio-asa-results-group' key={groupKey}>
            {showTitle && label && <h3 className='cio-asa-results-group__label'>{label}</h3>}
            <Carousel<Product>
              items={products}
              loop={false}
              responsive={{
                0: { gap: gap, slidesToShow },
              }}
              componentOverrides={{
                previous: { reactNode: PreviousButton },
                next: { reactNode: NextButton },
                item: {
                  productCard: {
                    reactNode: renderProductCard,
                  },
                },
              }}
            />
            {onViewMore && (
              <button
                type='button'
                className='cio-asa-results-group__view-more'
                onClick={() => onViewMore(groupData.group)}>
                <span className='cio-asa-results-group__view-more-text'>{viewMoreText}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M8.25979 4.20698L4.63903 0.72032L5.33267 -1.97313e-07L9.84668 4.34682L9.84668 5.06714L5.33267 9.41396L4.63903 8.69364L8.25979 5.20698L-0.000141371 5.20698L-0.000141328 4.20698L8.25979 4.20698Z" fill="currentColor"/>
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

ResultsBlock.displayName = 'ResultsBlock';
export default ResultsBlock;
