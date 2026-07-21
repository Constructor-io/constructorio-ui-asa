import React, { useRef, useState, useEffect } from 'react';
import {
  Carousel,
  ProductCard,
  RenderPropsWrapper,
} from '@constructor-io/constructorio-ui-components';
import type { ProductCardProps } from '@constructor-io/constructorio-ui-components';
import {
  ResultGroup,
  ResultGroupMeta,
  ResultsBlockOverrides,
  ResultsGroupTitleRenderProps,
  ResultsViewMoreRenderProps,
} from '../../types';
import { normalizeItemToProduct, Product } from '../../utils/productNormalizer';
import { ArrowRightIcon } from '../icons';
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
  saleBadgeText?: string;
  currency?: string;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
  componentOverrides?: ResultsBlockOverrides;
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
  saleBadgeText = 'Sale',
  currency,
  onProductClick,
  onAddToCart,
  onViewMore,
  componentOverrides,
}: ResultsBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [slidesToShow, setSlidesToShow] = useState(3 + PEEK_FRACTION);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const compute = () => {
      const width = el.clientWidth;
      const count = Math.max(1, Math.floor(width / (minCardWidth + gap)));
      setSlidesToShow(count + PEEK_FRACTION);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minCardWidth, gap]);

  if (!groups || groups.length === 0) return null;

  const handleAddToCart = onAddToCart
    ? (_e: React.MouseEvent, product: Product) => onAddToCart(product)
    : undefined;

  const productCardOverrides = componentOverrides?.carousel?.item?.productCard;

  const renderProductCard = (renderProps: ProductCardProps) => {
    const product = renderProps.product as Product;
    return (
      <ProductCard
        product={product}
        className='cio-asa-product-card'
        onProductClick={onProductClick}
        onAddToCart={handleAddToCart}
        addToCartText={addToCartText}
        componentOverrides={productCardOverrides}>
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

  return (
    <div
      ref={containerRef}
      className='cio-asa-results-block'
      style={{ '--cio-asa-image-ratio': aspectRatioMap[aspectRatio] } as React.CSSProperties}>
      {groups.map((groupData, index) => {
        const label = groupData.group?.display_name || groupData.group?.value || '';
        const groupKey = `${groupData.group?.value || label}-${index}`;
        const products = groupData.searchResults.map((item) =>
          normalizeItemToProduct(item, { saleBadgeText }),
        );

        const titleRenderProps: ResultsGroupTitleRenderProps = { label };
        const viewMoreRenderProps: ResultsViewMoreRenderProps = {
          group: groupData.group,
          onClick: () => onViewMore?.(groupData.group),
        };

        const userCarousel = componentOverrides?.carousel;
        const carouselOverrides = {
          previous: { reactNode: PreviousButton },
          next: { reactNode: NextButton },
          ...userCarousel,
          item: {
            ...userCarousel?.item,
            productCard: {
              reactNode: renderProductCard,
            },
          },
        };

        return (
          <div className='cio-asa-results-group' key={groupKey}>
            {showTitle && label && (
              <RenderPropsWrapper
                override={componentOverrides?.groupTitle?.reactNode}
                props={titleRenderProps}>
                <h3 className='cio-asa-results-group__label'>{label}</h3>
              </RenderPropsWrapper>
            )}
            <Carousel<Product>
              items={products}
              loop={false}
              responsive={{
                0: { gap, slidesToShow },
              }}
              componentOverrides={carouselOverrides}
            />
            {onViewMore && (
              <RenderPropsWrapper
                override={componentOverrides?.viewMore?.reactNode}
                props={viewMoreRenderProps}>
                <button
                  type='button'
                  className='cio-asa-results-group__view-more'
                  onClick={() => onViewMore(groupData.group)}>
                  <span className='cio-asa-results-group__view-more-text'>{viewMoreText}</span>
                  <ArrowRightIcon />
                </button>
              </RenderPropsWrapper>
            )}
          </div>
        );
      })}
    </div>
  );
}

ResultsBlock.displayName = 'ResultsBlock';
export default ResultsBlock;
