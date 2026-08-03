import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import AiMessage from '../../../src/components/Chat/AiMessage';

const baseMessage = { id: 'msg-1', role: 'assistant', text: '', status: 'done' };

describe('AiMessage (SSR)', () => {
  it('renders the assistant text into the server markup', () => {
    const html = renderServerSide(
      <AiMessage message={{ ...baseMessage, text: 'Here are some options' }} />,
    );

    expect(html).toContain('Here are some options');
    expect(html).not.toContain('cio-asa-ai-message__bubble--error');
  });

  it('renders the typing indicator while loading with no content yet', () => {
    const html = renderServerSide(<AiMessage message={{ ...baseMessage, status: 'loading' }} />);

    expect(html).toContain('cio-asa-typing-indicator');
    expect(html).toContain('aria-label="Assistant is typing"');
  });

  it('does not render the typing indicator once text has streamed in', () => {
    const html = renderServerSide(
      <AiMessage message={{ ...baseMessage, status: 'loading', text: 'Looking…' }} />,
    );

    expect(html).toContain('Looking');
    expect(html).not.toContain('cio-asa-typing-indicator');
  });

  it('falls back to the error copy when an errored message has no text', () => {
    const html = renderServerSide(<AiMessage message={{ ...baseMessage, status: 'error' }} />);

    expect(html).toContain('I can&#x27;t assist you with that request.');
    expect(html).toContain('cio-asa-ai-message__bubble--error');
  });

  it('uses a translated error message when provided', () => {
    const html = renderServerSide(
      <AiMessage
        message={{ ...baseMessage, status: 'error' }}
        translations={{ 'CioAsa.error.message': 'Something went wrong' }}
      />,
    );

    expect(html).toContain('Something went wrong');
  });

  it('renders nothing visible for an empty done message', () => {
    const html = renderServerSide(<AiMessage message={baseMessage} />);

    expect(html).not.toContain('cio-asa-ai-message__bubble');
    expect(html).not.toContain('cio-asa-typing-indicator');
  });
});
