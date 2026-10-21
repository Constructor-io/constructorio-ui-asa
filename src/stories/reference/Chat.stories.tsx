import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat from '../../components/Chat/Chat';
import { chatDecorator, defaultTermsHtml } from '../fixtures';

const meta: Meta<typeof Chat> = {
  title: 'Components & Utilities/Chat',
  component: Chat,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
    docs: {
      description: {
        component:
          'The conversation UI. Render it inside a `CioAsaProvider`. It fills its container and has ' +
          'no launcher or open state of its own: see [Integration Guide](./?path=/docs/guides-integration-guide--variants). ' +
          'Its methods are on a `ref` (`ChatHandle`): `clearHistory`, `newThread`, `switchThread`, `sendMessage`, `abort`.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    initialSuggestions: {
      description:
        'Static suggestion chips shown on the welcome screen. If the array is empty or not provided, the suggestions section is hidden.',
      control: 'object',
      table: { category: 'Content' },
    },
    termsText: {
      description:
        'Legal disclaimer content shown at the bottom of the welcome screen. `Chat` accepts a ReactNode; in this story you can provide an HTML string which is rendered via dangerouslySetInnerHTML.',
      control: 'text',
      table: { category: 'Content' },
    },
    aspectRatio: {
      control: 'select',
      options: ['1:1', '3:4', '9:16', '4:3', '16:9'],
      description: 'Image aspect ratio for product cards in results.',
      table: { category: 'Results' },
    },
    currency: {
      control: 'text',
      description: 'Currency symbol for product prices.',
      table: { category: 'Results' },
    },
    normalizeItem: {
      description:
        'Map a raw search-result item to the product-card shape (`Product`). Override this when your index metadata uses non-default field names (e.g. `thumbnail` instead of `image_url`).',
      control: false,
      table: {
        category: 'Results',
        type: { summary: '(item, options?) => Product' },
        defaultValue: { summary: 'normalizeItemToProduct' },
      },
    },
    onClose: {
      description:
        'Called when the close button (✕) is clicked. The consumer controls component visibility.',
      table: { category: 'Callbacks' },
    },
    onThreadsChange: {
      description:
        'Fires with the stored conversations (`ThreadSummary[]`) and the active thread id whenever ' +
        'either changes, including changes made in another tab. Requires `persistConversation` on the ' +
        'provider. See [Conversations](./?path=/docs/guides-conversations--variants).',
      table: { category: 'Callbacks' },
    },
    onProductClick: {
      description: 'Called when a product card is clicked in results.',
      table: { category: 'Callbacks' },
    },
    onAddToCart: {
      description:
        'Called when "Add to cart" button is clicked. If not provided, the button is hidden.',
      table: { category: 'Callbacks' },
    },
    onViewMore: {
      description:
        'Called when "View more" link is clicked. If not provided, the link is hidden. ' +
        'The `group` argument carries the echoed CIO request under `data.request` for building a destination URL.',
      table: { category: 'Callbacks' },
    },
    componentOverrides: {
      description:
        'Replace any part with your own render function. See [Customization](./?path=/docs/guides-customization--variants) for every slot.',
      control: false,
      table: {
        category: 'Overrides',
        type: { summary: 'ChatComponentOverrides' },
        defaultValue: { summary: 'undefined' },
      },
    },
    showStopButton: {
      description:
        "Whether the input's send button becomes a stop button while a reply streams. " +
        'Off by default, so the packaged UI is unchanged unless you opt in. While it is off, ' +
        'cancelling is only reachable via `abort()` on the ref, or from your own ' +
        '`componentOverrides.input`.',
      control: 'boolean',
      table: {
        category: 'Content',
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    initialThreadId: {
      description:
        'Resume a specific agent thread. Read once on mount; the thread id is then tracked ' +
        'internally across turns. `abort()` on the chat handle keeps it; `clearHistory()` resets ' +
        'it. With `persistConversation` enabled on the provider, the stored transcript of that ' +
        'thread is restored too.',
      control: 'text',
      table: {
        category: 'Content',
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
      },
    },
    initialPrompt: {
      description:
        'A prompt sent once on mount, after any stored conversation loads, e.g. one the shopper ' +
        'clicked elsewhere on the page before the chat opened. Goes into `initialThreadId` when ' +
        'set. For a chat that is already mounted, call `sendMessage(text, { threadId })` on the ref.',
      control: false,
      table: {
        category: 'Content',
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
      },
    },
    translations: {
      description:
        'UI strings. Omitted keys fall back to English. See [Customization](./?path=/docs/guides-customization--variants) for every key.',
      control: 'object',
      table: {
        category: 'Translations',
        type: { summary: 'Translations' },
      },
    },
  },
  decorators: [chatDecorator],
};

export default meta;
type Story = StoryObj<typeof Chat>;

export const Default: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '504px', height: '100%', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onClose: () => alert('Close clicked'),
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
    aspectRatio: '3:4',
    currency: '$',
    initialSuggestions: [
      'I need luggage suitable for holiday travel',
      "I'm looking for stylish gifts that fit my budget",
      "What's good, quality watch to invest in?",
      'What should I wear to a holiday party?',
    ],
    termsText: defaultTermsHtml,
  },
};
