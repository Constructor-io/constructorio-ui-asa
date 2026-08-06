import { Meta, StoryObj } from '@storybook/react';
import AsaResultsTemplateComponent from './AsaResultsTemplateComponent';

const meta = {
  title: 'Hooks/useAsaResults',
  component: AsaResultsTemplateComponent,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AsaResultsTemplateComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    defaultPrompt: 'How do I pack for a picnic',
  },
};
