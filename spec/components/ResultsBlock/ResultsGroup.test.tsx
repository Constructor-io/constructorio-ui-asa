import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsGroup from '../../../src/components/ResultsBlock/ResultsGroup';
import { normalizeItemToProduct } from '../../../src/utils/productNormalizer';
import { ResultGroup } from '../../../src/types';
import {
  mockIntersectionObserver,
  MockIntersectionObserver,
} from '../../local_examples/mockIntersectionObserver';

const groupData: ResultGroup = {
  group: { display_name: 'Shoes', value: 'shoes' },
  searchResultId: 'sr-1',
  intentResultId: 'ir-1',
  searchResults: [
    { value: 'Sneaker', data: { id: '1', image_url: 'https://img/1.jpg', price: 20 } },
    { value: 'Boot', data: { id: '2', image_url: 'https://img/2.jpg', price: 40 } },
  ],
};

function createTracking() {
  return {
    trackSubmit: jest.fn(),
    trackResultLoadStarted: jest.fn(),
    trackResultLoadFinished: jest.fn(),
    trackResultClick: jest.fn(),
    trackResultView: jest.fn(),
    trackSearchSubmit: jest.fn(),
  };
}

function renderGroup(overrides: Partial<React.ComponentProps<typeof ResultsGroup>> = {}) {
  const tracking = createTracking();
  const props: React.ComponentProps<typeof ResultsGroup> = {
    groupData,
    label: 'Shoes',
    slidesToShow: 3,
    gap: 12,
    showTitle: true,
    viewMoreText: 'View more products',
    addToCartText: 'Add to cart',
    saleBadgeText: 'Sale',
    intent: 'shoes',
    intentResultId: 'ir-1',
    normalizeItem: normalizeItemToProduct,
    tracking,
    ...overrides,
  };
  const utils = render(<ResultsGroup {...props} />);
  return { ...utils, tracking };
}

describe('ResultsGroup tracking', () => {
  let io: MockIntersectionObserver;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.restore();
  });

  function scrollIntoView() {
    act(() => {
      io.trigger(true);
    });
  }

  it('fires a result view with mapped items when the pod scrolls into view', () => {
    const onResultView = jest.fn();
    const { tracking } = renderGroup({ callbacks: { onResultView } });

    scrollIntoView();

    expect(tracking.trackResultView).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'shoes',
        searchResultId: 'sr-1',
        intentResultId: 'ir-1',
        numResultsViewed: 2,
      }),
    );
    expect(onResultView).toHaveBeenCalled();
  });

  it('does not fire a view when intent or searchResultId is missing', () => {
    const { tracking } = renderGroup({ intent: undefined });
    scrollIntoView();
    expect(tracking.trackResultView).not.toHaveBeenCalled();
  });

  it('fires a result click and callback on product click', async () => {
    const onResultClick = jest.fn();
    const onProductClick = jest.fn();
    const { tracking } = renderGroup({ callbacks: { onResultClick }, onProductClick });

    await userEvent.click(screen.getByText('Sneaker'));

    expect(tracking.trackResultClick).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'shoes', searchResultId: 'sr-1', itemId: '1' }),
    );
    expect(onResultClick).toHaveBeenCalled();
    expect(onProductClick).toHaveBeenCalled();
  });

  it('fires a search submit and callback on view more', async () => {
    const onSearchSubmit = jest.fn();
    const onViewMore = jest.fn();
    const { tracking } = renderGroup({ callbacks: { onSearchSubmit }, onViewMore });

    await userEvent.click(screen.getByText('View more products'));

    expect(tracking.trackSearchSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'shoes',
        searchTerm: 'shoes',
        userInput: 'shoes',
        searchResultId: 'sr-1',
      }),
    );
    expect(onSearchSubmit).toHaveBeenCalled();
    expect(onViewMore).toHaveBeenCalledWith(groupData.group);
  });
});
