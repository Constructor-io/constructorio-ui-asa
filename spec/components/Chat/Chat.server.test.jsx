import React from 'react';
import { renderServerSideWithCioAsa } from '../../test-utils.server';
import Chat from '../../../src/components/Chat/Chat';
import { createMockCioClient } from '../../local_examples/mockCioClient';
import { DEMO_API_KEY } from '../../../src/constants';

describe('Chat (SSR)', () => {
  it('renders the welcome screen into the server markup', () => {
    const { client } = createMockCioClient();

    const html = renderServerSideWithCioAsa(<Chat />, { cioClient: client });

    expect(html).toContain('cio-asa-chat-view--welcome');
    expect(html).toContain('Shopping Assistant');
    expect(html).toContain('placeholder="Ask anything"');
  });

  it('renders the dialog landmark labelled by the chat title', () => {
    const { client } = createMockCioClient();

    const html = renderServerSideWithCioAsa(<Chat />, { cioClient: client });

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-labelledby="cio-asa-chat-title"');
    expect(html).toContain('id="cio-asa-chat-title"');
  });

  it('renders initial suggestions and terms text', () => {
    const { client } = createMockCioClient();

    const html = renderServerSideWithCioAsa(
      <Chat initialSuggestions={['Best gift under $50']} termsText={<span>AI generated</span>} />,
      { cioClient: client },
    );

    expect(html).toContain('Best gift under $50');
    expect(html).toContain('AI generated');
  });

  it('applies a custom className to the root container', () => {
    const { client } = createMockCioClient();

    const html = renderServerSideWithCioAsa(<Chat className='my-chat' />, { cioClient: client });

    expect(html).toContain('my-chat');
  });

  it('does not open a stream while rendering on the server', () => {
    const { client, getAgentResultsStream } = createMockCioClient();

    renderServerSideWithCioAsa(<Chat />, { cioClient: client });

    expect(getAgentResultsStream).not.toHaveBeenCalled();
  });

  it('requires a cioClient on the server, since an apiKey alone cannot build one', () => {
    // useCioClient only instantiates the JS client in the browser, so SSR
    // consumers must pass a client explicitly.
    expect(() => renderServerSideWithCioAsa(<Chat />, { apiKey: DEMO_API_KEY })).toThrow(
      /requires a configured cioClient and domain/,
    );
  });
});
