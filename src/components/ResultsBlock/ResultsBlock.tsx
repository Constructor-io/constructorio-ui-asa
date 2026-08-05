import React, { useRef, useState, useEffect } from 'react';
import { ResultGroup, ResultGroupMeta, ResultsBlockOverrides } from '../../types';
import { normalizeItemToProduct, Product, NormalizeOptions } from '../../utils/productNormalizer';
import { useCioAsaContext } from '../../hooks/useCioAsaContext';
import useAsaTracking from '../../hooks/useAsaTracking';
import { AspectRatio, PEEK_FRACTION, aspectRatioMap } from './constants';
import ResultsGroup from './ResultsGroup';
import './ResultsBlock.css';

export type { AspectRatio } from './constants';

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
  intent?: string;
  intentResultId?: string;
  threadId?: string;
  /**
   * Map a raw search-result item to the `Product` shape rendered by the card.
   * Override this when your index metadata uses non-default field names
   * (e.g. `imageUrl` instead of `image_url`). Defaults to `normalizeItemToProduct`.
   */
  normalizeItem?: (item: any, options?: NormalizeOptions) => Product;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
  componentOverrides?: ResultsBlockOverrides;
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
  intent,
  intentResultId,
  threadId,
  normalizeItem = normalizeItemToProduct,
  onProductClick,
  onAddToCart,
  onViewMore,
  componentOverrides,
}: ResultsBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [slidesToShow, setSlidesToShow] = useState(3 + PEEK_FRACTION);

  const context = useCioAsaContext();
  const tracking = useAsaTracking({
    tracker: context?.cioClient?.tracker ?? undefined,
    section: context?.section,
    threadId,
  });
  const callbacks = context?.callbacks;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const compute = () => {
      const width = el.clientWidth;
      const count = Math.max(1, Math.floor(width / (minCardWidth + gap)));
      setSlidesToShow(count + PEEK_FRACTION);
    };

    compute();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minCardWidth, gap]);

  if (!groups || groups.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className='cio-asa-results-block'
      style={{ '--cio-asa-image-ratio': aspectRatioMap[aspectRatio] } as React.CSSProperties}>
      {groups.map((groupData, index) => {
        const label = groupData.group?.display_name || groupData.group?.value || '';
        const groupKey = `${groupData.group?.value || label}-${index}`;
        return (
          <ResultsGroup
            key={groupKey}
            groupData={groupData}
            label={label}
            slidesToShow={slidesToShow}
            gap={gap}
            showTitle={showTitle}
            viewMoreText={viewMoreText}
            addToCartText={addToCartText}
            saleBadgeText={saleBadgeText}
            currency={currency}
            intent={intent}
            intentResultId={intentResultId}
            normalizeItem={normalizeItem}
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
            onViewMore={onViewMore}
            componentOverrides={componentOverrides}
            tracking={tracking}
            callbacks={callbacks}
          />
        );
      })}
    </div>
  );
}

ResultsBlock.displayName = 'ResultsBlock';
export default ResultsBlock;
