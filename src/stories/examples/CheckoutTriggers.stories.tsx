import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { within, waitFor } from '@storybook/testing-library';
import Chat, { ChatProps } from '../../components/Chat/Chat';
import CioAsaProvider from '../../components/CioAsaProvider/CioAsaProvider';
import type { CheckoutTrigger, CheckoutTriggerState } from '../../types';
import type { Product } from '../../utils/productNormalizer';
import createMockAgentClient from './mockAgentClient';
import { functionArgTypes } from '../fixtures';

const mockClient = createMockAgentClient();

const decorator = (Story: React.ComponentType) => (
  <CioAsaProvider cioClient={mockClient} staticRequestConfigs={{ domain: 'story' }}>
    <Story />
  </CioAsaProvider>
);

/** Stands in for the host's checkout: lists what the clicked trigger received. */
function FakeCart({ triggerId, products }: { triggerId: string | null; products: Product[] }) {
  const total = products.reduce(
    (sum, product) => sum + Number(product.salePrice ?? product.price ?? 0),
    0,
  );
  return (
    <aside
      aria-label='Your cart'
      style={{
        width: '240px',
        padding: '16px',
        borderRadius: '12px',
        background: '#f4f5f7',
        fontSize: '13px',
        color: '#0f1324',
      }}>
      <strong>Your cart</strong>
      {triggerId === null ? (
        <p style={{ marginBottom: 0 }}>Click a checkout button under the products.</p>
      ) : (
        <>
          <p style={{ margin: '4px 0 12px', color: '#6b7080' }}>
            onTrigger: <code>{triggerId}</code>, {products.length} products
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '8px' }}>
            {products.map((product) => (
              <li
                key={product.id}
                style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span>{product.name}</span>
                <span>${product.salePrice ?? product.price}</span>
              </li>
            ))}
          </ul>
          <p style={{ margin: '12px 0 0', fontWeight: 600 }}>Total ${total}</p>
        </>
      )}
    </aside>
  );
}

/**
 * Renders the chat next to a fake cart, so a click shows what the host would receive.
 * Every trigger's `onTrigger` is wrapped to fill the cart; the Actions tab still logs it.
 */
function ChatWithCart({ checkoutTriggers = [], ...props }: ChatProps) {
  const [received, setReceived] = useState<{ id: string; state: CheckoutTriggerState } | null>(
    null,
  );
  const triggers = checkoutTriggers.map((trigger) => ({
    ...trigger,
    onTrigger: (state: CheckoutTriggerState) => {
      setReceived({ id: trigger.id, state });
      trigger.onTrigger(state);
    },
  }));
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div style={{ width: '504px', height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
        <Chat {...props} checkoutTriggers={triggers} />
      </div>
      <FakeCart triggerId={received?.id ?? null} products={received?.state.products ?? []} />
    </div>
  );
}

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
          'The cart on the right stands in for the host and shows what the clicked trigger received. ' +
          "These stories send a prompt on mount and replay a scripted stream, so they don't need network access.",
      },
    },
  },
  argTypes: functionArgTypes,
  tags: ['!dev'],
  decorators: [decorator],
  render: (args) => <ChatWithCart {...args} />,
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

const WAIT = { timeout: 5000 };
const baseArgs = {
  onClose: () => alert('Close'),
  aspectRatio: '3:4' as const,
  currency: '$',
  initialPrompt: 'running shoes',
};

/** Waits for the answer to finish, so the test-runner's axe pass sees the buttons. */
async function askAndWaitFor(canvasElement: HTMLElement, name: string | RegExp) {
  const canvas = within(canvasElement);
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
