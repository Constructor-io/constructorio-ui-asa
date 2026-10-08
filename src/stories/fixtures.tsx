/* eslint-disable react/no-danger */
import React from 'react';
import type { Decorator } from '@storybook/react';
import CioAsaProvider from '../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../constants';

export const defaultTermsHtml =
  'By submitting a search via the virtual style assistant, you agree to the information being processed according to our <a href="https://example.com/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a> and <a href="https://example.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</a>.';

/** Wraps a Chat story in a provider, and renders a `termsText` HTML string arg as markup. */
export const chatDecorator: Decorator = (Story, context) => {
  const { termsText: html, ...rest } = context.args;
  const args = {
    ...rest,
    ...(html && { termsText: <span dangerouslySetInnerHTML={{ __html: html }} /> }),
  };
  return (
    <CioAsaProvider apiKey={DEMO_API_KEY}>
      <div style={{ height: '800px', padding: '30px 0' }}>
        <Story args={args} />
      </div>
    </CioAsaProvider>
  );
};

const PRODUCT_IMAGE =
  'https://constructorio-integrations.s3.amazonaws.com/tikus-threads/2022-06-29/PANT_ACTIVE-PANT_GWB00623SBL770_1_category.jpg';

export const mockGroups = [
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

export const mockGroupsMultiple = [
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
// `onViewMore` consumers branch on (`data.request`) to build a destination URL. Two pod types
// are shown because they need different destinations and are otherwise indistinguishable — a
// keyword pod (`term` populated) routes to a search page, a category pod (`term` empty, browsing
// on `browse_filter_name`/`browse_filter_value`) routes to a category page.
export const mockGroupsPodTypes = [
  {
    ...mockGroups[0],
    group: {
      display_name: 'Running Shoes',
      value: 'running shoes',
      data: {
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
      },
    },
  },
  {
    ...mockGroupsMultiple[1],
    group: {
      // For category pods the backend sets value to display_name — using it as a
      // query would fire a literal search for this heading.
      display_name: 'Trail Running',
      value: 'Trail Running',
      data: {
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
      },
    },
  },
];

// Controls serialize args to JSON, which drops functions, so these would show as `{}`.
export const functionArgTypes = {
  componentOverrides: { control: false },
  normalizeItem: { control: false },
} as const;
