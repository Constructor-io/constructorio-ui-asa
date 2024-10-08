import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ProductCard from '../../../components/ProductCard/ProductCard';
import carouselItems from '../../../../spec/local_examples/carouselItems.json';
import ProductCardCarousel from '../../../components/ProductCardCarousel/ProductCardCarousel';

const meta = {
  title: 'Components/ProductCardCarousel',
  component: ProductCardCarousel,
  decorators: [
    (Story) => (
      <div style={{ width: 1100 }}>
        <Story />
      </div>
    ),
  ],
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
        formatPrice={(number) => `$${number}`}
        // disable the clicking behavior on product cards because it's annoying
        // eslint-disable-next-line no-script-url
        productInfo={{ ...productInfo, url: 'javascript:void(0)' }}
      />
    )),
    title: 'Tomatoes',
    subText:
      'Fresh, juicy tomatoes full of flavor. Ideal for salads, sauces, and more. Packed with vitamins and antioxidants',
  },
  decorators: [(Story) => <Story />],
};
