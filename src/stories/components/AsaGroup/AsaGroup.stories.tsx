import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import sampleGroup from '../../../../spec/local_examples/sampleGroup.json';
import AsaGroup from '../../../components/AsaGroup/AsaGroup';

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
    group: sampleGroup,
  },
  decorators: [(Story) => <Story />],
};
