import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, waitFor } from '@storybook/testing-library';
import Chat from '../../../components/Chat/Chat';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import createMockAgentClient from './mockAgentClient';

const mockClient = createMockAgentClient();

const frame = (Story: React.ComponentType) => (
  <div style={{ width: '504px', height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
    <Story />
  </div>
);

const decorator = (Story: React.ComponentType) => (
  <CioAsaProvider cioClient={mockClient} staticRequestConfigs={{ domain: 'story' }}>
    {frame(Story)}
  </CioAsaProvider>
);

const meta = {
  title: 'Components/Chat/Follow-up Refinements',
  component: Chat,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
    docs: {
      description: {
        component:
          'When the agent emits a `follow_up_refinement` event, its question and options render as chips below the ' +
          'products of that turn. Clicking a chip sends the option as a regular follow-up message. Only the latest ' +
          "refinement is interactive; earlier ones stay visible but inert. These stories replay a scripted stream, so they don't need network access.",
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

const WAIT = { timeout: 5000 };

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function askAndWaitForChips(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByRole('textbox'), 'running shoes{Enter}');
  await waitFor(() => {
    const chip = canvas.getByRole('button', { name: "Men's styles" }) as HTMLButtonElement;
    assert(!chip.disabled, 'refinement chip should be enabled once the stream ends');
  }, WAIT);
}

export const Default: Story = {
  decorators: [decorator],
  args: {
    onClose: () => alert('Close'),
    aspectRatio: '3:4',
    currency: '$',
  },
  play: async ({ canvasElement }) => {
    await askAndWaitForChips(canvasElement);
  },
};

export const AfterChoosingAnOption: Story = {
  decorators: [decorator],
  args: {
    onClose: () => alert('Close'),
    aspectRatio: '3:4',
    currency: '$',
  },
  play: async ({ canvasElement }) => {
    await askAndWaitForChips(canvasElement);
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: "Men's styles" }));
    await waitFor(() => {
      const chips = canvas.getAllByRole('button', { name: "Men's styles" }) as HTMLButtonElement[];
      assert(chips.length === 2, 'expected the earlier and the new refinement to both render');
      assert(chips[0].disabled, 'earlier refinement should be inert');
      assert(!chips[1].disabled, 'latest refinement should be interactive');
    }, WAIT);
  },
};

export const CustomRendering: Story = {
  decorators: [decorator],
  args: {
    onClose: () => alert('Close'),
    aspectRatio: '3:4',
    currency: '$',
    componentOverrides: {
      aiMessage: {
        followUpRefinement: {
          reactNode: ({ question, options, onOptionClick, isDisabled }) => (
            <fieldset
              disabled={isDisabled}
              style={{ border: '1px dashed #a980ff', borderRadius: '8px', padding: '12px' }}>
              <legend style={{ fontSize: '13px', fontWeight: 600 }}>{question}</legend>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '6px' }}>
                {options.map((option) => (
                  <li key={option}>
                    <button
                      type='button'
                      onClick={() => onOptionClick(option)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d4deff',
                        background: isDisabled ? '#f4f5f7' : '#f0f4ff',
                        cursor: isDisabled ? 'default' : 'pointer',
                      }}>
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>
          ),
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await askAndWaitForChips(canvasElement);
  },
};
