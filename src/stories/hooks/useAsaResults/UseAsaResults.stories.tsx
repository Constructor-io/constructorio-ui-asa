import { Meta, StoryObj } from '@storybook/react';
import AsaResultsTemplateComponent from './AsaResultsTemplateComponent';

const meta = {
  title: 'Hooks/useAsaResults',
  component: AsaResultsTemplateComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    defaultPrompt: {
      description: 'Message pre-filled into the input for the demo.',
      control: 'text',
    },
    initialThreadId: {
      description:
        'Optional seed for the thread id. Pass a value saved in browser storage to resume a prior ' +
        'conversation on the same server-side thread. Read once on mount; `clearHistory()` resets it.',
      control: 'text',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
      },
    },
  },
} satisfies Meta<typeof AsaResultsTemplateComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    defaultPrompt: 'How do I pack for a picnic',
  },
};

export const ResumeExistingThread: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Pass a previously stored thread id via `useAsaResults({ initialThreadId })` to resume a ' +
          'conversation persisted outside the hook (e.g. in `localStorage`). The hook forwards it on the ' +
          'first request so the server continues the same thread.',
      },
    },
  },
  args: {
    defaultPrompt: 'What else would you recommend?',
    initialThreadId: 'thread-from-browser-storage',
  },
};
