import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import UserMessage from '../../../components/Chat/UserMessage';
import AiMessage from '../../../components/Chat/AiMessage';
import ChatMessageList from '../../../components/Chat/ChatMessageList';
import ResultsBlock from '../../../components/ResultsBlock/ResultsBlock';
import '../../../components/Chat/UserMessage.css';
import '../../../components/Chat/AiMessage.css';
import '../../../components/Chat/TypingIndicator.css';
import '../../../components/Chat/ChatMessageList.css';
import '../../../components/ResultsBlock/ResultsBlock.css';
import { ChatMessage } from '../../../types';

const PRODUCT_IMAGE =
  'https://example.com/images/product.jpg';

const meta: Meta = {
  title: 'Components/Chat/Dialogue',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Chat dialogue components — user bubbles, AI responses, and loading states.\n\n' +
          '**User bubble types:**\n' +
          '- **Short reply** — 1-line short reply, hugs content horizontally.\n' +
          '- **Long reply** — multi-line reply, fills container horizontally.\n\n' +
          '**AI reply types:**\n' +
          '- **Loading** — displays typing indicator in a bubble.\n' +
          '- **Text** — displays text in a grey bubble.\n' +
          '- **Show products** — grey reply bubble + product results section below.\n\n' +
          '**Component overrides:**\n' +
          '`AiMessage` accepts a `componentOverrides` prop to replace default sub-components:\n' +
          '- `loader` — replaces the default `TypingIndicator`.\n' +
          '- `text` — replaces the default AI text renderer.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        style={{
          width: '508px',
          background: 'rgba(248, 249, 252, 1)',
          padding: '20px',
          borderRadius: '12px',
        }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const UserShortReply: StoryObj = {
  name: 'User - Short reply',
  parameters: {
    docs: {
      description: {
        story: 'A short 1-line reply from the shopper. The bubble hugs the content horizontally.',
      },
    },
  },
  render: () => <UserMessage text='Hello this is a short reply!' />,
};

export const UserLongReply: StoryObj = {
  name: 'User - Long reply',
  parameters: {
    docs: {
      description: {
        story:
          'A multi-line reply from the shopper. The bubble fills the container horizontally while hugging content vertically.',
      },
    },
  },
  render: () => (
    <UserMessage text='This is a quite long reply from the shopper, which requires to display more than 1 line' />
  ),
};

export const AiLoading: StoryObj = {
  name: 'AI - Loading',
  parameters: {
    docs: {
      description: {
        story:
          'Displays the typing indicator in a bubble. Shown while waiting for the AI response.',
      },
    },
  },
  render: () => <AiMessage message={{ id: '1', role: 'assistant', text: '', status: 'loading' }} />,
};

export const AiTextReply: StoryObj = {
  name: 'AI - Text reply',
  parameters: {
    docs: {
      description: {
        story: 'A text reply from the AI in a grey bubble. Fills container width.',
      },
    },
  },
  render: () => (
    <AiMessage
      message={{
        id: '1',
        role: 'assistant',
        text: "Hello! I'm your shopping assistant. Try one of the following popular questions.",
        status: 'done',
      }}
    />
  ),
};

export const AiWithProducts: StoryObj = {
  name: 'AI - Show products',
  parameters: {
    docs: {
      description: {
        story:
          'AI reply bubble with a product results section below. You can swap this list with a customized version.',
      },
    },
  },
  render: () => (
    <>
      <AiMessage
        message={{
          id: '1',
          role: 'assistant',
          text: 'Hi there! For work essentials, you might find these categories and products suitable.',
          status: 'done',
        }}
      />
      <ResultsBlock
        groups={[
          {
            group: { display_name: 'Work Essentials', data: { display_name: 'Work Essentials' } },
            searchResults: [
              {
                value: 'Classic Fit Blazer',
                data: { id: '1', image_url: PRODUCT_IMAGE, price: 150 },
              },
              { value: 'Slim Dress Pants', data: { id: '2', image_url: PRODUCT_IMAGE, price: 89 } },
              {
                value: 'Oxford Button-Down Shirt',
                data: { id: '3', image_url: PRODUCT_IMAGE, price: 65 },
              },
              { value: 'Leather Belt', data: { id: '4', image_url: PRODUCT_IMAGE, price: 45 } },
            ],
          },
        ]}
        onViewMore={(group) => alert(`View more: ${group.display_name}`)}
      />
    </>
  ),
};

function ThinkingLoader() {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : `${prev}.`));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='cio-asa-ai-message__bubble'>
      <div className='cio-asa-ai-message__text' style={{ color: '#666', fontStyle: 'italic' }}>
        Thinking{dots}
      </div>
    </div>
  );
}

export const AiCustomLoader: StoryObj = {
  name: 'AI - Custom loader override',
  parameters: {
    docs: {
      description: {
        story:
          'Override the default typing indicator via `componentOverrides.loader`. ' +
          'This example shows a dynamic "Thinking..." loader similar to Claude.',
      },
    },
  },
  render: () => (
    <AiMessage
      message={{ id: '1', role: 'assistant', text: '', status: 'loading' }}
      componentOverrides={{
        loader: { reactNode: <ThinkingLoader /> },
      }}
    />
  ),
};

export const AiCustomText: StoryObj = {
  name: 'AI - Custom text override',
  parameters: {
    docs: {
      description: {
        story:
          'Override the default AI text via `componentOverrides.text.reactNode`. ' +
          'Receives `{ text }` render props.',
      },
    },
  },
  render: () => (
    <AiMessage
      message={{
        id: '1',
        role: 'assistant',
        text: 'Here are some recommendations for you!',
        status: 'done',
      }}
      componentOverrides={{
        text: {
          reactNode: ({ text }) => (
            <div
              style={{
                padding: '14px',
                background: '#e8f4fd',
                borderRadius: '12px',
                border: '1px solid #b8dff5',
                fontSize: '14px',
              }}>
              {text}
            </div>
          ),
        },
      }}
    />
  ),
};

const conversationMessages: ChatMessage[] = [
  { id: '1', role: 'user', text: 'Essential clothing for work', status: 'done' },
  {
    id: '2',
    role: 'assistant',
    text: 'Hi there! For work essentials, you might find these categories and products suitable.',
    status: 'done',
    groups: [
      {
        group: { display_name: 'Work Essentials', data: { display_name: 'Work Essentials' } },
        searchResults: [
          { value: 'Classic Fit Blazer', data: { id: '1', image_url: PRODUCT_IMAGE, price: 150 } },
          { value: 'Slim Dress Pants', data: { id: '2', image_url: PRODUCT_IMAGE, price: 89 } },
          {
            value: 'Oxford Button-Down Shirt',
            data: { id: '3', image_url: PRODUCT_IMAGE, price: 65 },
          },
          { value: 'Leather Belt', data: { id: '4', image_url: PRODUCT_IMAGE, price: 45 } },
        ],
      },
    ],
  },
  { id: '3', role: 'user', text: 'Show me vintage shirts', status: 'done' },
  { id: '4', role: 'assistant', text: '', status: 'loading' },
];

export const FullConversation: StoryObj = {
  name: 'Full conversation',
  parameters: {
    docs: {
      description: {
        story:
          'A full conversation flow showing user messages, AI text replies, product results, and loading state.',
      },
    },
  },
  render: () => (
    <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <ChatMessageList messages={conversationMessages} />
    </div>
  ),
};
