import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import Button from '../../../components/Button/Button';
import ProductCard from '../../../components/ProductCard/ProductCard';

const meta = {
  title: 'Components/ProductCard',
  component: ProductCard,
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
    productInfo: {
      itemName: 'Wonder Bread Classic White Round Top - 20 Oz',
      itemPrice: 12.34,
      itemImageUrl:
        'https://example.com/images/product.jpg',
      itemUrl: '',
    },
  },
  decorators: [(Story) => <Story />],
};
