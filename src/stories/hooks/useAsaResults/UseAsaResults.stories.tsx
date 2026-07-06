import { Meta, StoryObj } from '@storybook/react';
import AsaResultsTemplateComponent from './AsaResultsTemplateComponent';

const meta = {
  title: 'Hooks/useAsaResults',
  component: AsaResultsTemplateComponent,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AsaResultsTemplateComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    defaultPrompt: 'How do I pack for a picnic',
  },
};
