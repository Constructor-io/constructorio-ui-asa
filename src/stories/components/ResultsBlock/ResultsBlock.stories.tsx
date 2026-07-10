import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ResultsBlock from '../../../components/ResultsBlock/ResultsBlock';

const PRODUCT_IMAGE =
  'https://constructorio-integrations.s3.amazonaws.com/tikus-threads/2022-06-29/PANT_ACTIVE-PANT_GWB00623SBL770_1_category.jpg';

const mockGroups = [
  {
    group: { display_name: 'Running Shoes', data: { display_name: 'Running Shoes' } },
    searchResults: [
      {
        value: 'Adizero EVO SL Shoes',
        data: { id: '1', image_url: PRODUCT_IMAGE, price: 150, sale_price: 75, badge: 'Sale' },
      },
      {
        value: 'Tracefinder Trail Running Shoes Ultralight Premium Edition With Extra Cushioning',
        data: { id: '2', image_url: PRODUCT_IMAGE, price: 120 },
      },
      {
        value: 'Runfalcon Running Shoes',
        data: { id: '3', image_url: PRODUCT_IMAGE, price: 134 },
      },
      {
        value: 'Ultraboost Light Running Shoes',
        data: { id: '7', image_url: PRODUCT_IMAGE, price: 190 },
      },
      {
        value: 'Supernova Rise',
        data: { id: '8', image_url: PRODUCT_IMAGE, price: 140, sale_price: 99, badge: 'Sale' },
      },
      {
        value: 'Duramo Speed Shoes',
        data: { id: '9', image_url: PRODUCT_IMAGE, price: 85 },
      },
    ],
  },
];

const mockGroupsMultiple = [
  ...mockGroups,
  {
    group: { display_name: 'Trail Running', data: { display_name: 'Trail Running' } },
    searchResults: [
      {
        value: 'Terrex Agravic Speed',
        data: { id: '4', image_url: PRODUCT_IMAGE, price: 180 },
      },
      {
        value: 'Terrex Free Hiker 2 GORE-TEX Hiking Shoes Waterproof Edition',
        data: { id: '5', image_url: PRODUCT_IMAGE, price: 210 },
      },
      {
        value: 'Terrex Trailmaker 2',
        data: { id: '6', image_url: PRODUCT_IMAGE, price: 100 },
      },
    ],
  },
];

const meta: Meta<typeof ResultsBlock> = {
  title: 'Components/ResultsBlock',
  component: ResultsBlock,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Just take this component and add it to your project.\n\n' +
          'ResultsBlock renders grouped product results from the ASA (AI Shopping Assistant) API. ' +
          'It uses `ProductCard` and `Carousel` from `@constructor-io/constructorio-ui-components` internally.\n\n' +
          '**aspectRatio** - With this you can control the image aspect the following options:\n' +
          '1. 1:1 (Square) - Default option. Best suited for squared-shaped catalog images.\n' +
          '2. 3:4 (Portrait) - For portrait images, commonly seen for apparel.\n' +
          '3. 9:16 (Portrait) - For portrait images, commonly seen for apparel.\n' +
          '4. 4:3 (Landscape) - For landscape images, commonly seen in electronics, automobiles, etc.\n' +
          '5. 16:9 (Landscape) - For landscape images, commonly seen in electronics, automobiles, etc.',
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

export const Square1x1: Story = {
  name: 'aspectRatio = 1:1 (Default)',
  args: {
    groups: mockGroups,
    aspectRatio: '1:1',
    currency: '$',
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
  },
};

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
