/* eslint-disable react/no-danger */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat from '../../../components/Chat/Chat';
import Button from '../../../components/Button/Button';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';

const defaultTermsHtml =
  'By submitting a search via the virtual style assistant, you agree to the information being processed according to our <a href="https://example.com/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a> and <a href="https://example.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</a>.';

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
    desktopLayout: {
      control: 'select',
      options: ['sidebar', 'fullscreen'],
      description:
        'Chat layout on desktop. On mobile, always renders fullscreen.',
      table: {
        category: 'Layout',
        type: { summary: "'sidebar' | 'fullscreen'" },
        defaultValue: { summary: 'sidebar' },
      },
    },
    initialSuggestions: {
      description:
        'Static suggestion chips shown on the welcome screen. If the array is empty or not provided, the suggestions section is hidden.',
      control: 'object',
      table: { category: 'Content' },
    },
    termsText: {
      description:
        'Legal disclaimer content shown at the bottom of the welcome screen. Accepts HTML string with links.',
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
    addToCartText: {
      control: 'text',
      description: 'Custom text for the "Add to cart" button.',
      table: { category: 'Results' },
    },
    viewMoreText: {
      control: 'text',
      description: 'Custom text for the "View more" link.',
      table: { category: 'Results' },
    },
    onClose: {
      description:
        'Called when the close button (✕) is clicked. The consumer controls component visibility.',
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
      description: 'Called when "View more" link is clicked. If not provided, the link is hidden.',
      table: { category: 'Callbacks' },
    },
  },
  decorators: [
    (Story, context) => {
      const { termsText: html, ...rest } = context.args;
      const args = {
        ...rest,
        ...(html && { termsText: <span dangerouslySetInnerHTML={{ __html: html }} /> }),
      };
      return (
        <CioAsaProvider apiKey={DEMO_API_KEY}>
          <div style={{ height: '800px', padding: '30px 0' }}>
            <Story args={args} />
          </div>
        </CioAsaProvider>
      );
    },
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

export const Desktop: Story = {
  name: 'Desktop - Sidebar',
  parameters: {
    docs: {
      description: {
        story:
          '`desktopLayout="sidebar"` — panel slides in from the right with an overlay. This is the default desktop layout.',
      },
    },
  },
  args: {
    desktopLayout: 'sidebar',
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
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '900px',
          height: '800px',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          background: '#f9fafb',
          overflow: 'hidden',
        }}>
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

export const DesktopFullscreen: Story = {
  name: 'Desktop - Fullscreen',
  parameters: {
    docs: {
      description: {
        story:
          '`desktopLayout="fullscreen"` — chat fills the entire screen on desktop.',
      },
    },
  },
  args: {
    desktopLayout: 'fullscreen',
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
  decorators: [
    (Story) => (
      <div
        style={{
          width: '900px',
          height: '800px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e0e0e0',
        }}>
        <Story />
      </div>
    ),
  ],
};

export const Mobile: Story = {
  name: 'Mobile',
  parameters: {
    docs: {
      description: {
        story: 'On mobile viewports, the chat always renders fullscreen regardless of `desktopLayout`.',
      },
    },
  },
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
  decorators: [
    (Story) => (
      <div
        style={{
          width: '366px',
          height: '800px',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid #e0e0e0',
        }}>
        <Story />
      </div>
    ),
  ],
};

export const WithCustomSuggestions: Story = {
  args: {
    onClose: () => alert('Close clicked'),
    onProductClick: (product) => alert(`Product clicked: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
    aspectRatio: '3:4',
    currency: '$',
    initialSuggestions: [
      'Show me summer dresses',
      'Best running shoes under $100',
      'Business casual outfit ideas',
    ],
    termsText: defaultTermsHtml,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '504px', height: '800px', borderRadius: '12px', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

function DesktopIntegrationExample() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '800px',
        background: '#f9fafb',
        overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', bottom: '32px', right: '32px' }}>
        <Button onClick={() => setIsOpen(true)} />
      </div>
      {isOpen && (
        <>
          <div
            className='cio-asa-chat-overlay'
            style={{ position: 'absolute' }}
            onClick={() => setIsOpen(false)}
          />
          <div className='cio-asa-chat-fullscreen cio-asa-chat-fullscreen--right'>
            <Chat
              onClose={() => setIsOpen(false)}
              onProductClick={(product) => alert(`Product clicked: ${product.name}`)}
              onAddToCart={(product) => alert(`Add to cart: ${product.name}`)}
              onViewMore={(group) => alert(`View more: ${group.display_name}`)}
              aspectRatio='3:4'
              currency='$'
              initialSuggestions={[
                'I need luggage suitable for holiday travel',
                "I'm looking for stylish gifts that fit my budget",
                "What's good, quality watch to invest in?",
                'What should I wear to a holiday party?',
              ]}
              termsText={<span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />}
            />
          </div>
        </>
      )}
    </div>
  );
}

export const Integration: Story = {
  name: 'Integration - Desktop',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <DesktopIntegrationExample />,
};

function MobileIntegrationExample() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: '375px',
        height: '800px',
        border: '1px solid #e0e0e0',
        borderRadius: '24px',
        background: '#fff',
        overflow: 'hidden',
        margin: '0 auto',
      }}>
      <div style={{ padding: '24px' }}>
        <p style={{ color: '#666', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
          Tap the button below to open the assistant fullscreen.
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
        <Button onClick={() => setIsOpen(true)} />
      </div>
      {isOpen && (
        <div className='cio-asa-chat-fullscreen'>
          <Chat
            onClose={() => setIsOpen(false)}
            onProductClick={(product) => alert(`Product clicked: ${product.name}`)}
            onAddToCart={(product) => alert(`Add to cart: ${product.name}`)}
            onViewMore={(group) => alert(`View more: ${group.display_name}`)}
            aspectRatio='3:4'
            currency='$'
            initialSuggestions={[
              'I need luggage suitable for holiday travel',
              "I'm looking for stylish gifts that fit my budget",
              "What's good, quality watch to invest in?",
              'What should I wear to a holiday party?',
            ]}
            termsText={<span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />}
          />
        </div>
      )}
    </div>
  );
}

export const IntegrationMobile: Story = {
  name: 'Integration - Mobile',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <MobileIntegrationExample />,
};
