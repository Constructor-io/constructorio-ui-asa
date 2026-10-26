import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { userEvent, within, waitFor } from '@storybook/testing-library';
import Chat from '../../components/Chat/Chat';
import CioAsaProvider from '../../components/CioAsaProvider/CioAsaProvider';
import type { CheckoutTrigger } from '../../types';
import createMockAgentClient from './mockAgentClient';
import { functionArgTypes } from '../fixtures';

const mockClient = createMockAgentClient();

const decorator = (Story: React.ComponentType) => (
  <CioAsaProvider cioClient={mockClient} staticRequestConfigs={{ domain: 'story' }}>
    <div style={{ width: '504px', height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
      <Story />
    </div>
  </CioAsaProvider>
);

const meta = {
  title: 'Examples/Checkout Triggers',
  component: Chat,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
    docs: {
      description: {
        component:
          '`checkoutTriggers` renders checkout buttons under the products of each finished answer. ' +
          "`onTrigger` receives that answer's products, so the host can seed its own checkout flow. " +
          "These stories replay a scripted stream, so they don't need network access.",
      },
    },
  },
  argTypes: functionArgTypes,
  tags: ['!dev'],
  decorators: [decorator],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

const WAIT = { timeout: 5000 };
const baseArgs = { onClose: () => alert('Close'), aspectRatio: '3:4' as const, currency: '$' };

async function askAndWaitFor(canvasElement: HTMLElement, name: string | RegExp) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByRole('textbox'), 'running shoes{Enter}');
  await waitFor(() => canvas.getByRole('button', { name }), WAIT);
}

/** One trigger with the translated default label, under every answer that has products. */
export const Default: Story = {
  args: {
    ...baseArgs,
    checkoutTriggers: [{ id: 'checkout', onTrigger: action('onTrigger: checkout') }],
  },
  play: ({ canvasElement }) => askAndWaitFor(canvasElement, 'Checkout'),
};

/** Only the latest answer offers checkout; earlier turns keep their products but lose the button. */
export const LatestTurnOnly: Story = {
  args: {
    ...baseArgs,
    checkoutTriggers: [
      {
        id: 'buy-all',
        label: 'Buy these',
        triggerWhen: (state) => state.isLatest,
        onTrigger: action('onTrigger: buy-all'),
      },
    ],
  },
  play: ({ canvasElement }) => askAndWaitFor(canvasElement, 'Buy these'),
};

/** Parallel checkout paths from one answer. */
export const MultipleTriggers: Story = {
  args: {
    ...baseArgs,
    checkoutTriggers: [
      { id: 'buy-first', label: 'Buy the first pick', onTrigger: action('onTrigger: buy-first') },
      { id: 'buy-all', label: 'Buy all three', onTrigger: action('onTrigger: buy-all') },
    ],
  },
  play: ({ canvasElement }) => askAndWaitFor(canvasElement, 'Buy all three'),
};

/** `renderButton` replaces the default button; styling becomes yours. */
export const CustomButton: Story = {
  args: {
    ...baseArgs,
    checkoutTriggers: [
      {
        id: 'checkout',
        label: 'Add to bag & checkout',
        renderButton: ({ onClick, label, disabled }) => (
          <button
            type='button'
            onClick={onClick}
            disabled={disabled}
            style={{
              background: 'linear-gradient(90deg, #6c3df4, #b03df4)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}>
            {label}
          </button>
        ),
        onTrigger: action('onTrigger: checkout'),
      },
    ],
  },
  play: ({ canvasElement }) => askAndWaitFor(canvasElement, 'Add to bag & checkout'),
};

/** A disabled trigger stays in the tab order and announces its state natively. */
export const Disabled: Story = {
  args: {
    ...baseArgs,
    checkoutTriggers: [
      { id: 'checkout', label: 'Out of stock', disabled: true, onTrigger: action('onTrigger') },
    ],
  },
  play: ({ canvasElement }) => askAndWaitFor(canvasElement, 'Out of stock'),
};

/** Six triggers, to check how the row wraps. */
export const ManyTriggers: Story = {
  args: {
    ...baseArgs,
    checkoutTriggers: Array.from({ length: 6 }, (_, index): CheckoutTrigger => {
      const id = `trigger-${index + 1}`;
      return { id, label: `Checkout option ${index + 1}`, onTrigger: action(`onTrigger: ${id}`) };
    }),
  },
  play: ({ canvasElement }) => askAndWaitFor(canvasElement, 'Checkout option 6'),
};
