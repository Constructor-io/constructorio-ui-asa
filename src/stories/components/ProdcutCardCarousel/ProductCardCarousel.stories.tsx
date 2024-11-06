import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import sampleCarousel from '../../../../spec/local_examples/sampleCarousel.json';
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
    searchResult: sampleCarousel,
  },
  decorators: [(Story) => <Story />],
};
