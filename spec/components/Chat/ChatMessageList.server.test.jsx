import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import ChatMessageList from '../../../src/components/Chat/ChatMessageList';

const conversation = [
  { id: 'm1', role: 'user', text: 'Show me running shoes', status: 'done' },
  { id: 'm2', role: 'assistant', text: 'Here are a few picks', status: 'done' },
];

const withResults = [
  {
    id: 'm3',
    role: 'assistant',
    text: 'Found these',
    status: 'done',
    groups: [
      {
        group: { display_name: 'Running shoes', value: 'running-shoes' },
        searchResults: [{ value: 'Trail Runner', data: { id: 'p1', price: 99 } }],
      },
    ],
  },
];

describe('ChatMessageList (SSR)', () => {
  it('renders an accessible log region', () => {
    const html = renderServerSide(<ChatMessageList messages={[]} />);

    expect(html).toContain('role="log"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Chat messages"');
  });

  it('renders both user and assistant turns into the server markup', () => {
    const html = renderServerSide(<ChatMessageList messages={conversation} />);

    expect(html).toContain('Show me running shoes');
    expect(html).toContain('Here are a few picks');
    expect(html).toContain('cio-asa-user-message');
    expect(html).toContain('cio-asa-ai-message');
  });

  it('renders the results block for assistant messages carrying groups', () => {
    const html = renderServerSide(<ChatMessageList messages={withResults} />);

    expect(html).toContain('Running shoes');
    expect(html).toContain('Trail Runner');
    expect(html).toContain('cio-asa-results-block');
  });

  it('omits the results block when a message has no groups', () => {
    const html = renderServerSide(<ChatMessageList messages={conversation} />);

    expect(html).not.toContain('cio-asa-results-block');
  });

  it('renders an empty list without a DOM or scroll APIs', () => {
    expect(() => renderServerSide(<ChatMessageList messages={[]} />)).not.toThrow();
  });

  it('passes translations down to the child messages', () => {
    const html = renderServerSide(
      <ChatMessageList
        messages={conversation}
        translations={{
          'CioAsa.messageList.ariaLabel': 'Verlauf',
          'CioAsa.userMessage.ariaLabel': 'Du sagtest',
        }}
      />,
    );

    expect(html).toContain('aria-label="Verlauf"');
    expect(html).toContain('aria-label="Du sagtest"');
  });
});
