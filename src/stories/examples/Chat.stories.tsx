/* eslint-disable react/no-danger */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat from '../../components/Chat/Chat';
import Button from '../../components/Button/Button';
import { Default } from '../reference/Chat.stories';
import { chatDecorator, defaultTermsHtml, functionArgTypes } from '../fixtures';

const meta: Meta<typeof Chat> = {
  title: 'Examples/Chat',
  component: Chat,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
  },
  argTypes: functionArgTypes,
  decorators: [chatDecorator],
  tags: ['!dev'],
};

export default meta;
type Story = StoryObj<typeof Chat>;

export const Desktop: Story = {
  name: 'Desktop - Sidebar',
  parameters: {
    docs: {
      description: {
        story: 'Chat placed in a fixed-width container (504px) — renders as a sidebar panel.',
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
        story: 'Chat placed in a full-width container — fills the entire available space.',
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
  parameters: {
    docs: {
      description: {
        story: 'Chat placed in a narrow container (366px) — simulates a mobile viewport.',
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
          <button
            type='button'
            className='cio-asa-chat-overlay'
            style={{ position: 'absolute' }}
            onClick={() => setIsOpen(false)}
            aria-label='Close chat'
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

export const Inline: Story = {
  name: 'Inline (no onClose)',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '504px' }}>
      <a href='#after-chat'>Focusable element before the chat</a>
      <div style={{ height: '700px' }}>
        <Chat
          initialSuggestions={['I need luggage suitable for holiday travel']}
          onProductClick={(product) => alert(`Product clicked: ${product.name}`)}
        />
      </div>
      <button id='after-chat' type='button' onClick={() => alert('Reached the page again')}>
        Focusable element after the chat
      </button>
    </div>
  ),
};

export const CancellingAResponse: Story = {
  name: 'Cancelling a Response',
  parameters: {
    docs: {
      description: {
        story:
          'Send a message, then press the stop button in the input while the reply is still ' +
          'streaming. `abort()` cancels the request, keeps the partial reply and preserves the ' +
          'thread, so a follow-up continues the same conversation. No tracking beacon is sent for ' +
          'an aborted turn.\n\n' +
          'The button is off by default; this story only adds `showStopButton`. For a UI-side ' +
          'timeout, or a cancel button of your own, call `abort()` on the chat `ref` instead — see ' +
          'the Integration Guide.',
      },
    },
  },
  args: {
    ...Default.args,
    showStopButton: true,
    initialSuggestions: ['Tell me everything about winter coats'],
  },
};
