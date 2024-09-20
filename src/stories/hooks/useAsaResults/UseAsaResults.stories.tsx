import { Meta, StoryObj } from '@storybook/react';
import AsaResultsTestComponent from './AsaResultsTestComponent';

const meta = {
  title: 'Components/useAsaResults',
  component: AsaResultsTestComponent,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered',
  },
} satisfies Meta<typeof AsaResultsTestComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    intent: 'How do I pack for a picnic',
  },
};
