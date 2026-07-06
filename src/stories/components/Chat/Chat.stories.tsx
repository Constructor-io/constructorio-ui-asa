import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat from '../../../components/Chat/Chat';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';

const termsText = (
  <>
    By submitting a search via the virtual style assistant, you agree to the information being
    processed according to our <a href='#'>Terms &amp; Conditions</a> and{' '}
    <a href='#'>Privacy Notice</a>.
  </>
);

const meta: Meta<typeof Chat> = {
  title: 'Components/Chat',
  component: Chat,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'AI Shopping Assistant chat dialog.\n\n' +
          '**Viewport:**\n' +
          '- **Desktop** — The component displays a dialog which slides from the right side, blocking clickable content below with an overlay.\n' +
          '- **Mobile** — The component displays a full width and height dialog, covering the whole screen.\n\n' +
          '**Content** — You can swap the sections for a customized version of the AI Chat dialog component.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    initialSuggestions: {
      description: 'Array of suggestion prompts displayed on the welcome screen.',
      table: { category: 'Content' },
    },
    termsText: {
      description: 'Legal disclaimer shown at the bottom of the welcome screen.',
      table: { category: 'Content' },
    },
    onClose: {
      description: 'Called when the close button (✕) is clicked.',
      table: { category: 'Callbacks' },
    },
    onProductClick: {
      description: 'Called when a product card is clicked in results.',
      table: { category: 'Callbacks' },
    },
    onViewMore: {
      description: 'Called when "View more products" link is clicked.',
      table: { category: 'Callbacks' },
    },
  },
  decorators: [
    (Story) => (
      <CioAsaProvider apiKey={DEMO_API_KEY}>
        <div style={{ height: '100vh' }}>
          <Story />
        </div>
      </CioAsaProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Chat>;

export const Default: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onClose: () => alert('Close clicked'),
    termsText,
  },
};

export const Desktop: Story = {
  name: 'Viewport - Desktop',
  parameters: {
    docs: {
      description: {
        story: 'Panel slides in from the right side with an overlay blocking content below. Container width: 504px.',
      },
    },
  },
  args: {
    onClose: () => alert('Close clicked'),
    termsText,
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: '900px', height: '700px', border: '1px solid #e0e0e0', borderRadius: '12px', background: '#f9fafb', overflow: 'hidden' }}>
        <div style={{ padding: '40px', color: '#999' }}>
          <p>Page content behind the overlay...</p>
        </div>
        <div className='cio-asa-chat-overlay' style={{ position: 'absolute' }} />
        <div className='cio-asa-chat-panel' style={{ position: 'absolute', width: '504px' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export const Mobile: Story = {
  name: 'Viewport - Mobile',
  parameters: {
    docs: {
      description: {
        story: 'Full width and height dialog covering the whole screen. Container width: 366px.',
      },
    },
  },
  args: {
    onClose: () => alert('Close clicked'),
    termsText,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '366px', height: '700px', borderRadius: '24px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
        <Story />
      </div>
    ),
  ],
};

export const WithCustomSuggestions: Story = {
  args: {
    onClose: () => alert('Close clicked'),
    initialSuggestions: [
      'Show me summer dresses',
      'Best running shoes under $100',
      'Business casual outfit ideas',
    ],
    termsText,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '504px', height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};
