import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import carouselItems from '../../../../spec/local_examples/carouselItems.json';
import ProductCard from '../../../components/ProductCard/ProductCard';
import AsaGroup from '../../../components/AsaGroup/AsaGroup';
import ProductCardCarousel from '../../../components/ProductCardCarousel/ProductCardCarousel';

const meta = {
  title: 'Components/AsaGroup',
  component: AsaGroup,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered',
  },
} satisfies Meta<typeof AsaGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    children: Array(5).fill(
      <ProductCardCarousel
        title='Tomatoes'
        subText='Fresh, juicy tomatoes full of flavor. Ideal for salads, sauces, and more. Packed with vitamins and antioxidants'>
        {carouselItems.map((productInfo) => (
          <ProductCard
            formatPrice={(number) => `$${number}`}
            // disable the clicking behavior on product cards because it's annoying
            // eslint-disable-next-line no-script-url
            productInfo={{ ...productInfo, url: 'javascript:void(0)' }}
          />
        ))}
      </ProductCardCarousel>,
    ),
    title: 'Vegetables',
    subText: 'Fresh, crisp vegetables packed with nutrients. Perfect for healthy meals and snacks',
  },
  decorators: [(Story) => <Story />],
};
