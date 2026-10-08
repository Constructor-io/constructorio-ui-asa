import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ResultsBlock from '../../components/ResultsBlock/ResultsBlock';
import { mockGroups } from '../fixtures';

const meta: Meta<typeof ResultsBlock> = {
  title: 'Components & Utilities/ResultsBlock',
  component: ResultsBlock,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
    docs: {
      description: {
        component:
          'Product groups as carousels. `Chat` already renders it; use it yourself only when building on ' +
          '`useAsaResults` (see [Custom UI](./?path=/docs/guides-custom-ui--variants)). ' +
          '`aspectRatio`: `1:1` (default) for square images, `3:4` / `9:16` for portrait (apparel), ' +
          '`4:3` / `16:9` for landscape (electronics).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    groups: {
      description: 'Array of product groups returned from the ASA API.',
      table: { category: 'Data' },
    },
    minCardWidth: { table: { disable: true } },
    gap: { table: { disable: true } },
    aspectRatio: {
      control: 'select',
      options: ['1:1', '3:4', '9:16', '4:3', '16:9'],
      description: 'Controls the image aspect ratio for product cards.',
      table: { category: 'Appearance' },
    },
    showTitle: {
      control: 'boolean',
      description: 'If true, displays a title on top of the products list.',
      table: { category: 'Appearance' },
    },
    normalizeItem: {
      description:
        'Map a raw search-result item to the product-card shape (`Product`). Override this when your index metadata uses non-default field names (e.g. `thumbnail` instead of `image_url`).',
      control: false,
      table: {
        category: 'Data',
        type: { summary: '(item, options?) => Product' },
        defaultValue: { summary: 'normalizeItemToProduct' },
      },
    },
    onProductClick: {
      description: 'Called when a product card is clicked.',
      table: { category: 'Callbacks' },
    },
    onAddToCart: {
      description:
        'Called when "Add to cart" button is clicked on a product card. If not provided, the "Add to Cart" button will not be displayed.',
      table: { category: 'Callbacks' },
    },
    onViewMore: {
      description:
        'Called when "View more products" link is clicked. If not provided, the "View more" link will not be displayed.',
      table: { category: 'Callbacks' },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '700px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResultsBlock>;
export const Default: Story = {
  args: {
    groups: mockGroups,
    aspectRatio: '1:1',
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
  },
};
