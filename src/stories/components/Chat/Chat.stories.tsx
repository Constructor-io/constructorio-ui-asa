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
          'The component fills its container (`width: 100%; height: 100%`). ' +
          'Control the layout (sidebar, fullscreen, panel) by styling the parent wrapper or using the `className` prop.\n\n' +
          '**Content** — You can swap the sections for a customized version of the AI Chat dialog component.\n\n' +
          '**Results** — Product results are rendered using the <a href="./?path=/docs/components-resultsblock--variants" target="_top">ResultsBlock</a> component internally. ' +
          'See its documentation for available layout and display options (`aspectRatio`, `minCardWidth`, `gap`, `showTitle`, etc.).',
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
      description:
        'Currency symbol for product prices. For additional results layout options see <a href="./?path=/docs/components-resultsblock--variants" target="_top">ResultsBlock</a>.',
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
    componentOverrides: {
      description:
        'Override any sub-component with custom render props or React nodes.\n\n' +
        '- `header` — Replace the chat header\n' +
        '- `welcomeScreen.title` — Replace the welcome title\n' +
        '- `welcomeScreen.input` — Replace the welcome input\n' +
        '- `welcomeScreen.suggestedQuestions` — Replace suggestion chips\n' +
        '- `input` — Replace the chat input\n' +
        '- `userMessage` — Replace user message bubbles\n' +
        '- `aiMessage.loader` — Replace the typing indicator\n' +
        '- `aiMessage.text` — Replace AI response text\n' +
        '- `resultsBlock.groupTitle` — Replace group titles\n' +
        '- `resultsBlock.viewMore` — Replace view more buttons\n' +
        '- `resultsBlock.carousel` — Override carousel sub-components',
      control: false,
      table: {
        category: 'Overrides',
        type: { summary: 'ChatComponentOverrides' },
        defaultValue: { summary: 'undefined' },
      },
    },
    initialThreadId: {
      description:
        'Seed the thread id (e.g. loaded from browser storage) to resume a prior conversation. ' +
        'Read once on mount; the thread id is then tracked internally across turns and reset when ' +
        '`clearHistory()` is called on the chat handle.',
      control: 'text',
      table: {
        category: 'Content',
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
      },
    },
    translations: {
      description:
        'Translation overrides for internationalizing UI strings. All keys are optional.\n\n' +
        '- `CioAsa.header.title`\n' +
        '- `CioAsa.header.close`\n' +
        '- `CioAsa.input.placeholder`\n' +
        '- `CioAsa.input.ariaLabel`\n' +
        '- `CioAsa.input.sendAriaLabel`\n' +
        '- `CioAsa.welcome.title`\n' +
        '- `CioAsa.welcome.placeholder`\n' +
        '- `CioAsa.welcome.sendButton`\n' +
        '- `CioAsa.welcome.inputAriaLabel`\n' +
        '- `CioAsa.welcome.sendAriaLabel`\n' +
        '- `CioAsa.welcome.suggestionsAriaLabel`\n' +
        '- `CioAsa.messageList.ariaLabel`\n' +
        '- `CioAsa.typingIndicator.ariaLabel`\n' +
        '- `CioAsa.userMessage.ariaLabel`\n' +
        '- `CioAsa.results.viewMore`\n' +
        '- `CioAsa.results.addToCart`\n' +
        '- `CioAsa.results.saleBadge`\n' +
        '- `CioAsa.error.message`',
      control: 'object',
      table: {
        category: 'Translations',
        type: { summary: 'Translations' },
      },
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
