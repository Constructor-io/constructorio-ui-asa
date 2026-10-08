import type { Meta, StoryObj } from '@storybook/react';
import ResultsBlock from '../../components/ResultsBlock/ResultsBlock';
import { functionArgTypes, mockGroups, mockGroupsMultiple, mockGroupsPodTypes } from '../fixtures';

const meta: Meta<typeof ResultsBlock> = {
  title: 'Examples/ResultsBlock',
  component: ResultsBlock,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
  },
  argTypes: functionArgTypes,
  tags: ['!dev'],
};

export default meta;
type Story = StoryObj<typeof ResultsBlock>;

export const Portrait3x4: Story = {
  name: 'aspectRatio = 3:4',
  args: {
    groups: mockGroups,
    aspectRatio: '3:4',
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
  },
};

export const Portrait9x16: Story = {
  name: 'aspectRatio = 9:16',
  args: {
    groups: mockGroups,
    aspectRatio: '9:16',
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
  },
};

export const Landscape4x3: Story = {
  name: 'aspectRatio = 4:3',
  args: {
    groups: mockGroups,
    aspectRatio: '4:3',
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
  },
};

export const Landscape16x9: Story = {
  name: 'aspectRatio = 16:9',
  args: {
    groups: mockGroups,
    aspectRatio: '16:9',
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
  },
};

export const MultipleGroups: Story = {
  args: {
    groups: mockGroupsMultiple,
    aspectRatio: '1:1',
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
  },
};

export const HiddenTitle: Story = {
  name: 'showTitle = False',
  args: {
    groups: mockGroups,
    showTitle: false,
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
  },
};

export const ViewMoreUrlBuilding: Story = {
  name: 'onViewMore = Building a destination URL',
  parameters: {
    docs: {
      description: {
        story:
          'Keyword and category pods both arrive as `search_result` events and need different ' +
          'destinations, so `onViewMore` consumers branch on the echoed `data.request`. The first ' +
          'pod here is a keyword pod (`data.request.term` populated) and routes to a search page; ' +
          'the second is a category pod (`data.request.term` empty, browsing on ' +
          "`browse_filter_value`) and routes to a category page. Note the category pod's " +
          '`value` equals its `display_name` — using it as a query would search for the ' +
          'heading itself. Click "View more products" on each to compare the URLs.',
      },
    },
  },
  args: {
    groups: mockGroupsPodTypes,
    aspectRatio: '1:1',
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onViewMore: (group) => {
      const req = group.data?.request;
      if (!req) return;

      const params = new URLSearchParams();
      Object.entries(req.filters ?? {}).forEach(([name, values]) => {
        [values].flat().forEach((v) => params.append(`filter.${name}`, String(v)));
      });
      if (req.sort_by) params.set('sortBy', String(req.sort_by));
      if (req.sort_order) params.set('sortOrder', String(req.sort_order));

      // Keyword pod -> search page. Category pod (`term` is '') -> category page.
      const url = req.term
        ? `/search?q=${encodeURIComponent(String(req.term))}&${params}`
        : `/category/${encodeURIComponent(String(req.browse_filter_value))}?${params}`;

      alert(`${req.term ? 'Keyword' : 'Category'} pod\n\nWould navigate to:\n${url}`);
    },
  },
};
