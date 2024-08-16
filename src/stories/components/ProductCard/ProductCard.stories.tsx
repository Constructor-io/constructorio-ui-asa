import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ProductCard from '../../../components/ProductCard/ProductCard';
import productInfo from './items.json';

const meta = {
  title: 'Components/ProductCard',
  component: ProductCard,
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered',
  },
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    formatPrice: (number) => `$${number}`,
    productInfo,
  },
  decorators: [(Story) => <Story />],
};
