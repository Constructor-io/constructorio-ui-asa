import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import ResultsBlock from '../../../src/components/ResultsBlock/ResultsBlock';
import { ResultGroup } from '../../../src/types';

const groups: ResultGroup[] = [
  {
    group: { display_name: 'Shoes', value: 'shoes' },
    searchResults: [
      { value: 'Sneaker', data: { id: '1', image_url: 'https://img/1.jpg', price: 20 } },
      { value: 'Boot', data: { id: '2', image_url: 'https://img/2.jpg', price: 40 } },
    ],
  },
];

describe('ResultsBlock', () => {
  it('renders nothing when there are no groups', () => {
    const { container } = render(<ResultsBlock groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the group title', () => {
    render(<ResultsBlock groups={groups} />);
    expect(screen.getByRole('heading', { name: 'Shoes' })).toBeInTheDocument();
  });

  it('hides the group title when showTitle is false', () => {
    render(<ResultsBlock groups={groups} showTitle={false} />);
    expect(screen.queryByRole('heading', { name: 'Shoes' })).not.toBeInTheDocument();
  });

  it('renders product names from the normalized search results', () => {
    render(<ResultsBlock groups={groups} />);
    expect(screen.getByText('Sneaker')).toBeInTheDocument();
    expect(screen.getByText('Boot')).toBeInTheDocument();
  });

  it('renders a "View more" button only when onViewMore is given and calls it', async () => {
    const onViewMore = jest.fn();
    const { rerender } = render(<ResultsBlock groups={groups} />);
    expect(screen.queryByText('View more products')).not.toBeInTheDocument();

    rerender(<ResultsBlock groups={groups} onViewMore={onViewMore} />);
    await userEvent.click(screen.getByText('View more products'));
    expect(onViewMore).toHaveBeenCalledWith(groups[0].group);
  });

  it('sets the aspect-ratio CSS variable', () => {
    const { container } = render(<ResultsBlock groups={groups} aspectRatio='16:9' />);
    const block = container.querySelector('.cio-asa-results-block') as HTMLElement;
    expect(block.style.getPropertyValue('--cio-asa-image-ratio')).toBe('16 / 9');
  });

  it('renders a group title override', () => {
    render(
      <ResultsBlock
        groups={groups}
        componentOverrides={{ groupTitle: { reactNode: ({ label }) => <h3>{`G: ${label}`}</h3> } }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'G: Shoes' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ResultsBlock groups={groups} onViewMore={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
