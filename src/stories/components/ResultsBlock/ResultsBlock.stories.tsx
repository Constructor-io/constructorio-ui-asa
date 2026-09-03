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

// Mirrors what live `search_result` SSE events put on the group: the echoed CIO request, which
// `onViewMore` consumers branch on to build a destination URL. Two pod types are shown because
// they need different destinations and are otherwise indistinguishable — a keyword pod (`term`
// populated) routes to a search page, a category pod (`term` empty, browsing on
// `browse_filter_name`/`browse_filter_value`) routes to a category page.
const mockGroupsPodTypes = [
  {
    ...mockGroups[0],
    group: {
      display_name: 'Running Shoes',
      value: 'running shoes',
      search_request: { display_name: 'Running Shoes', search_term: 'running shoes', params: {} },
      request: {
        term: 'running shoes',
        filters: { activity: ['running'] },
        filter_match_types: { activity: 'any' },
        sort_by: 'relevance',
        sort_order: 'descending',
        page: 1,
        num_results_per_page: 4,
        section: 'Products',
      },
      facets: [{ type: 'range', name: 'price', display_name: 'Price', min: 85, max: 190 }],
    },
  },
  {
    ...mockGroupsMultiple[1],
    group: {
      // For category pods the backend sets search_term to display_name — using it as a
      // query would fire a literal search for this heading.
      display_name: 'Trail Running',
      value: 'Trail Running',
      search_request: { display_name: 'Trail Running', search_term: 'Trail Running', params: {} },
      request: {
        term: '',
        browse_filter_name: 'group_id',
        browse_filter_value: 'cat100260235',
        filters: { terrain: ['trail'] },
        filter_match_types: { terrain: 'any' },
        sort_by: 'relevance',
        sort_order: 'descending',
        page: 1,
        num_results_per_page: 4,
        section: 'Products',
      },
      facets: [{ type: 'range', name: 'price', display_name: 'Price', min: 100, max: 210 }],
    },
  },
];

const meta: Meta<typeof ResultsBlock> = {
  title: 'Components/ResultsBlock',
  component: ResultsBlock,
  parameters: {
    a11y: { test: 'error' },
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

export const ViewMoreUrlBuilding: Story = {
  name: 'onViewMore = Building a destination URL',
  parameters: {
    docs: {
      description: {
        story:
          'Keyword and category pods both arrive as `search_result` events and need different ' +
          'destinations, so `onViewMore` consumers branch on the echoed `request`. The first ' +
          'pod here is a keyword pod (`request.term` populated) and routes to a search page; ' +
          'the second is a category pod (`request.term` empty, browsing on ' +
          "`browse_filter_value`) and routes to a category page. Note the category pod's " +
          '`search_term` equals its `display_name` — using it as a query would search for the ' +
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
      const req = group.request;
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
