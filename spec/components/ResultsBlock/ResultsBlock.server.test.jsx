import React from 'react';
import { renderServerSide, textOf } from '../../test-utils.server';
import ResultsBlock from '../../../src/components/ResultsBlock/ResultsBlock';

const groups = [
  {
    group: { display_name: 'Running shoes', value: 'running-shoes' },
    searchResults: [
      {
        value: 'Trail Runner',
        data: { id: 'p1', image_url: 'https://cdn.test/p1.jpg', price: 99 },
      },
      { value: 'Road Racer', data: { id: 'p2', image_url: 'https://cdn.test/p2.jpg', price: 120 } },
    ],
  },
];

describe('ResultsBlock (SSR)', () => {
  it('renders the group label and every product into the server markup', () => {
    const html = renderServerSide(<ResultsBlock groups={groups} />);

    expect(html).toContain('Running shoes');
    expect(html).toContain('Trail Runner');
    expect(html).toContain('Road Racer');
  });

  it('renders nothing for an empty group list', () => {
    expect(renderServerSide(<ResultsBlock groups={[]} />)).toBe('');
    expect(renderServerSide(<ResultsBlock groups={undefined} />)).toBe('');
  });

  it('hides the group title when showTitle is false', () => {
    const html = renderServerSide(<ResultsBlock groups={groups} showTitle={false} />);

    expect(html).not.toContain('cio-asa-results-group__label');
    expect(html).toContain('Trail Runner');
  });

  it('omits the view-more button unless an onViewMore handler is supplied', () => {
    const withoutHandler = renderServerSide(<ResultsBlock groups={groups} />);
    const withHandler = renderServerSide(<ResultsBlock groups={groups} onViewMore={jest.fn()} />);

    expect(withoutHandler).not.toContain('cio-asa-results-group__view-more');
    expect(withHandler).toContain('View more products');
  });

  it('sets the aspect ratio custom property from the aspectRatio prop', () => {
    const html = renderServerSide(<ResultsBlock groups={groups} aspectRatio='1:1' />);

    expect(html).toContain('--cio-asa-image-ratio');
  });

  it('uses a custom normalizeItem to map raw search results', () => {
    const normalizeItem = jest.fn((item) => ({ id: item.value, name: `Custom ${item.value}` }));

    const html = renderServerSide(<ResultsBlock groups={groups} normalizeItem={normalizeItem} />);

    expect(normalizeItem).toHaveBeenCalledTimes(2);
    expect(html).toContain('Custom Trail Runner');
  });

  it('renders a group title component override', () => {
    const html = renderServerSide(
      <ResultsBlock
        groups={groups}
        componentOverrides={{ groupTitle: { reactNode: ({ label }) => <h4>{label} ✨</h4> } }}
      />,
    );

    expect(textOf(html)).toContain('Running shoes ✨');
    expect(html).not.toContain('cio-asa-results-group__label');
  });

  it('does not fire click handlers during server rendering', () => {
    const onProductClick = jest.fn();
    const onViewMore = jest.fn();

    renderServerSide(
      <ResultsBlock groups={groups} onProductClick={onProductClick} onViewMore={onViewMore} />,
    );

    expect(onProductClick).not.toHaveBeenCalled();
    expect(onViewMore).not.toHaveBeenCalled();
  });

  it('renders without ResizeObserver, which does not exist on the server', () => {
    expect(global.ResizeObserver).toBeUndefined();
    expect(() => renderServerSide(<ResultsBlock groups={groups} />)).not.toThrow();
  });
});
