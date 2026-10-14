import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, waitFor } from '@storybook/testing-library';
import Chat from '../../components/Chat/Chat';
import CioAsaProvider from '../../components/CioAsaProvider/CioAsaProvider';
import createMockAgentClient, { StreamEvent } from './mockAgentClient';
import { functionArgTypes } from '../fixtures';

const PRODUCT_IMAGE =
  'https://constructorio-integrations.s3.amazonaws.com/tikus-threads/2022-06-29/PANT_ACTIVE-PANT_GWB00623SBL770_1_category.jpg';

const products = (...names: string[]) => ({
  type: 'search_result',
  data: {
    result_id: 'sr-formatted',
    response: {
      results: names.map((value, i) => ({
        value,
        data: { id: String(i + 1), image_url: PRODUCT_IMAGE, price: 100 + i * 20, url: '#' },
      })),
    },
  },
});

// Each reply is sent as separate `message` events, as ASA does in production.
const REPLIES: Record<string, { messages: string[]; products?: string[] }> = {
  'Compare two running shoes': {
    messages: [
      'Both are **lightweight daily trainers**. Here is how they compare:',
      [
        '| Feature | Ultraboost Light | Supernova Rise |',
        '|---|---|---|',
        '| Price | $190 | $140 |',
        '| Cushioning | Light BOOST foam | Responsive foam |',
        '| Best for | Long runs | Everyday miles |',
        '',
        'Pick the **Supernova Rise** to save $50, or the Ultraboost Light for longer runs.',
      ].join('\n'),
    ],
    products: ['Ultraboost Light Running Shoes', 'Supernova Rise'],
  },
  'Compare eight running shoes': {
    messages: [
      'A table wider than the chat scrolls sideways inside the reply:',
      [
        '| Feature | Ultraboost Light | Supernova Rise | Adizero SL | Runfalcon 5 | Response Super | Duramo SL | Adizero Boston | Supernova Prima |',
        '|---|---|---|---|---|---|---|---|---|',
        '| Price | $190 | $140 | $130 | $70 | $140 | $75 | $160 | $150 |',
        '| Weight | 293 g | 294 g | 238 g | 270 g | 310 g | 255 g | 265 g | 300 g |',
        '| Best for | Long runs | Everyday miles | Tempo runs | Beginners | Support | Gym and short runs | Race training | Cushioned miles |',
      ].join('\n'),
    ],
  },
  'What should I pack for a 10k?': {
    messages: [
      'For race day, pack:',
      '- Running shoes you have already broken in\n- A light layer for the start line\n- Water and an energy gel',
      '1. Lay it out the night before\n2. Pin your bib to your shirt',
    ],
  },
  'How do I clean running shoes?': {
    messages: [
      '**Never** put them in the dryer. Brush off dirt, hand-wash with *mild* soap, and air-dry.',
      'See our [care guide](/care) for more.',
    ],
  },
};

// Typed text gets the comparison reply.
const formattedTurn = (intent: string): StreamEvent[] => {
  const reply = REPLIES[intent] ?? REPLIES['Compare two running shoes'];
  return [
    { type: 'start', data: { thread_id: 'story-thread', intent_result_id: 'ir-formatted' } },
    ...reply.messages.map((text) => ({ type: 'message', data: { text } })),
    ...(reply.products ? [products(...reply.products)] : []),
  ];
};

const mockClient = createMockAgentClient({ script: formattedTurn });

const decorator = (Story: React.ComponentType) => (
  <CioAsaProvider cioClient={mockClient} staticRequestConfigs={{ domain: 'story' }}>
    <div style={{ width: '504px', height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
      <Story />
    </div>
  </CioAsaProvider>
);

const meta = {
  title: 'Examples/Formatted Replies',
  component: Chat,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
    docs: {
      description: {
        component:
          "The agent's markdown renders as formatted text: bold, links, lists and tables. Pick a suggestion to see " +
          "each kind of reply. This story replays a scripted stream, so it doesn't need network access.",
      },
    },
  },
  argTypes: functionArgTypes,
  tags: ['!dev'],
  decorators: [decorator],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComparisonTable: Story = {
  args: {
    onClose: () => alert('Close'),
    aspectRatio: '3:4',
    currency: '$',
    initialSuggestions: Object.keys(REPLIES),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Compare two running shoes' }));
    await waitFor(() => canvas.getByRole('table'), { timeout: 5000 });
  },
};
