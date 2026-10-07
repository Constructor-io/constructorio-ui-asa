import { Meta, StoryObj } from '@storybook/react';
import AsaResultsTemplateComponent from './AsaResultsTemplateComponent';

const meta = {
  title: 'Hooks/useAsaResults',
  component: AsaResultsTemplateComponent,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
    docs: {
      description: {
        component:
          'Headless access to the ASA conversation. Must be rendered inside a `CioAsaProvider`.\n\n' +
          'Returns `{ messages, sendMessage, isStreaming, abort, clearHistory }`. The demo below wires ' +
          '**Stop** to `abort()` — it cancels the in-flight response while keeping the conversation and ' +
          'the thread, so the next message continues where it left off. Use it for a cancel button or a ' +
          'UI-side timeout (`setTimeout(abort, ms)`). `clearHistory()` also cancels, but resets ' +
          'everything.\n\n' +
          '**Note on tracking** — `assistant_submit`, `assistant_result_load_started` and ' +
          '`assistant_result_load_finished` fire from this hook, but `assistant_search_result_view`, ' +
          '`assistant_search_result_click` and `assistant_search_submit` fire from `ResultsBlock`. ' +
          'Render `ResultsBlock` for the results area, or fire them yourself via `useAsaTracking`.',
      },
    },
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

export const CancellingAResponse: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Send a message, then press **Stop** while the response is still streaming. `abort()` ' +
          'cancels the request, settles the partial reply as `done`, and keeps the thread — inspect ' +
          '`messages` below and send a follow-up to confirm the conversation continues. No tracking ' +
          'beacon is sent for an aborted turn.',
      },
    },
  },
  args: {
    defaultPrompt: 'Tell me everything about winter coats',
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
