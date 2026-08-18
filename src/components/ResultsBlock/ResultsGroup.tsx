import React from 'react';
import { Carousel, RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import {
  AsaCallbacks,
  ResultGroup,
  ResultGroupMeta,
  ResultsBlockOverrides,
  ResultsGroupTitleRenderProps,
  ResultsViewMoreRenderProps,
} from '../../types';
import { Product, NormalizeOptions } from '../../utils/productNormalizer';
import useAsaTracking from '../../hooks/useAsaTracking';
import useViewportTracking from '../../hooks/useViewportTracking';
import { ArrowRightIcon } from '../icons';
import createProductCardRenderer from './renderProductCard';

function PreviousButton() {
  return null;
}

function NextButton() {
  return null;
}

export interface ResultsGroupProps {
  groupData: ResultGroup;
  label: string;
  slidesToShow: number;
  gap: number;
  showTitle: boolean;
  viewMoreText: string;
  addToCartText: string;
  saleBadgeText: string;
  currency?: string;
  intent?: string;
  intentResultId?: string;
  normalizeItem: (item: any, options?: NormalizeOptions) => Product;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
  componentOverrides?: ResultsBlockOverrides;
  tracking: ReturnType<typeof useAsaTracking>;
  callbacks?: AsaCallbacks;
}

/**
 * Renders a single search_result pod (one carousel) and fires its pod-level behavioral
 * events: `assistant_search_result_view` (on scroll into view), `assistant_search_result_click`
 * (product click), and `assistant_search_submit` ("view more"). Each SDK beacon is paired
 * with its optional consumer callback. Events only fire when both `intent` and the pod's
 * `searchResultId` are known.
 */
export default function ResultsGroup({
  groupData,
  label,
  slidesToShow,
  gap,
  showTitle,
  viewMoreText,
  addToCartText,
  saleBadgeText,
  currency,
  intent,
  intentResultId,
  normalizeItem,
  onProductClick,
  onAddToCart,
  onViewMore,
  componentOverrides,
  tracking,
  callbacks,
}: ResultsGroupProps) {
  const { searchResultId } = groupData;
  const products = groupData.searchResults.map((item) => normalizeItem(item, { saleBadgeText }));
  const canTrack = !!intent && !!searchResultId;

  const { ref: viewRef } = useViewportTracking({
    enabled: canTrack,
    onView: () => {
      if (!intent || !searchResultId) return;
      const items = products.map((p) => ({
        itemId: p.id,
        itemName: p.name,
        ...(p.variationId && { variationId: p.variationId }),
      }));
      const payload = {
        intent,
        searchResultId,
        intentResultId,
        numResultsViewed: products.length,
        items,
      };
      tracking.trackResultView(payload);
      callbacks?.onResultView?.(payload);
    },
  });

  const handleProductClick = (product: Product) => {
    if (intent && searchResultId) {
      tracking.trackResultClick({
        intent,
        searchResultId,
        intentResultId,
        itemId: product.id,
        itemName: product.name,
        variationId: product.variationId,
      });
      callbacks?.onResultClick?.({
        intent,
        searchResultId,
        intentResultId,
        item: {
          itemId: product.id,
          itemName: product.name,
          ...(product.variationId && { variationId: product.variationId }),
        },
      });
    }
    onProductClick?.(product);
  };

  const handleViewMore = () => {
    if (intent && searchResultId) {
      const searchTerm = groupData.group?.value || groupData.group?.display_name || '';
      const payload = {
        intent,
        searchTerm,
        userInput: searchTerm,
        searchResultId,
        intentResultId,
      };
      tracking.trackSearchSubmit(payload);
      callbacks?.onSearchSubmit?.(payload);
    }
    onViewMore?.(groupData.group);
  };

  const renderProductCard = createProductCardRenderer({
    currency,
    addToCartText,
    onProductClick: handleProductClick,
    onAddToCart,
    componentOverrides: componentOverrides?.carousel?.item?.productCard,
  });

  const titleRenderProps: ResultsGroupTitleRenderProps = { label };
  const viewMoreRenderProps: ResultsViewMoreRenderProps = {
    group: groupData.group,
    onClick: handleViewMore,
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
    <div className='cio-asa-results-group' ref={viewRef}>
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
            onClick={handleViewMore}>
            <span className='cio-asa-results-group__view-more-text'>{viewMoreText}</span>
            <ArrowRightIcon />
          </button>
        </RenderPropsWrapper>
      )}
    </div>
  );
}

ResultsGroup.displayName = 'ResultsGroup';
