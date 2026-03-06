import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ProductCard from '../../../components/ProductCard/ProductCard';
import carouselItems from '../../../../spec/local_examples/carouselItems.json';
import ProductCardCarousel from '../../../components/ProductCardCarousel/ProductCardCarousel';

const meta = {
  title: 'Components/ProductCardCarousel',
  component: ProductCardCarousel,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered',
  },
} satisfies Meta<typeof ProductCardCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    children: carouselItems.map((productInfo) => (
      <ProductCard
        key={productInfo.name}
        formatPrice={(number) => `$${number}`}
        // disable the clicking behavior on product cards because it's annoying

        productInfo={{ ...productInfo, url: 'javascript:void(0)' }}
      />
    )),
  },
  decorators: [(Story) => <Story />],
};
