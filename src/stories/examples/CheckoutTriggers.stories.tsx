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

/**
 * A trigger as these stories use it: `pick` is the host's choice of which of the answer's
 * products go in the cart. The library always hands over every product of the answer.
 */
type StoryTrigger = CheckoutTrigger & { pick?: (products: Product[]) => Product[] };

const money = (value: Product['price']) => `$${Number(value ?? 0).toFixed(2)}`;

/** Stands in for the host's checkout: lists what the clicked trigger put in the cart. */
function FakeCart({ triggerId, products }: { triggerId: string | null; products: Product[] }) {
  const total = products.reduce((sum, p) => sum + Number(p.salePrice ?? p.price ?? 0), 0);
  return (
    <aside
      aria-label='Your cart'
      style={{
        width: '280px',
        padding: '20px',
        borderRadius: '12px',
        background: '#ffffff',
        border: '1px solid #e9eaec',
        boxShadow: '0 1px 2px rgba(18, 18, 105, 0.055), 0 2px 4px rgba(18, 18, 105, 0.07)',
        fontFamily: "'Inter', sans-serif",
        fontSize: '13px',
        lineHeight: '20px',
        color: '#0f1324',
        boxSizing: 'border-box',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '15px', fontWeight: 600 }}>Your cart</span>
        {triggerId && (
          <span style={{ fontSize: '12px', color: '#6b7080' }}>
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>
      {triggerId === null ? (
        <p style={{ margin: '12px 0 0', color: '#6b7080' }}>
          Click a checkout button under the products.
        </p>
      ) : (
        <>
          <p style={{ margin: '4px 0 16px', fontSize: '12px', color: '#6b7080' }}>
            from <code style={{ fontSize: '12px' }}>onTrigger</code> of{' '}
            <code style={{ fontSize: '12px' }}>{triggerId}</code>
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '12px' }}>
            {products.map((product) => (
              <li key={product.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img
                  src={product.imageUrl}
                  alt=''
                  style={{
                    width: '44px',
                    height: '44px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    background: '#f4f5f7',
                    flex: 'none',
                  }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>{product.name}</span>
                <span style={{ fontWeight: 500 }}>{money(product.salePrice ?? product.price)}</span>
              </li>
            ))}
          </ul>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid #e9eaec',
              fontWeight: 600,
            }}>
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </>
      )}
    </aside>
  );
}

/**
 * Renders the chat next to a fake cart, so a click shows what the host put in it. Each
 * trigger's `onTrigger` is wrapped to fill the cart with its `pick` of the products, or all
 * of them. The Actions tab still logs the real call.
 */
function ChatWithCart({ checkoutTriggers = [], ...props }: ChatProps) {
  const [cart, setCart] = useState<{ id: string; products: Product[] } | null>(null);
  const triggers = (checkoutTriggers as StoryTrigger[]).map(({ pick, ...trigger }) => ({
    ...trigger,
    onTrigger: (state: CheckoutTriggerState) => {
      setCart({ id: trigger.id, products: pick ? pick(state.products) : state.products });
      trigger.onTrigger(state);
    },
  }));
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div style={{ width: '504px', height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
        <Chat {...props} checkoutTriggers={triggers} />
      </div>
      <FakeCart triggerId={cart?.id ?? null} products={cart?.products ?? []} />
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
          'The cart on the right stands in for the host and shows what the clicked trigger put in it. ' +
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

/** Parallel paths from one answer. Each trigger receives all three products; "Buy the first pick" keeps one. */
export const MultipleTriggers: Story = {
  args: {
    ...baseArgs,
    checkoutTriggers: [
      {
        id: 'buy-first',
        label: 'Buy the first pick',
        pick: (products) => products.slice(0, 1),
        onTrigger: action('onTrigger: buy-first'),
      } as StoryTrigger,
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
