import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import ChatInput from '../../../src/components/Chat/ChatInput';

describe('ChatInput (SSR)', () => {
  it('renders a labelled, empty input into the server markup', () => {
    const html = renderServerSide(<ChatInput onSubmit={jest.fn()} />);

    expect(html).toContain('placeholder="Ask a question about this product"');
    expect(html).toContain('aria-label="Type your message"');
    expect(html).toContain('value=""');
  });

  it('renders the send button disabled because the input starts empty', () => {
    const html = renderServerSide(<ChatInput onSubmit={jest.fn()} />);

    expect(html).toContain('aria-label="Send message"');
    expect(html).toContain('disabled');
  });

  it('renders the input disabled while streaming', () => {
    const html = renderServerSide(<ChatInput onSubmit={jest.fn()} isDisabled />);

    expect(html).toMatch(/class="cio-asa-chat-input__field"[^>]*disabled/);
  });

  it('uses translation overrides for the placeholder and labels', () => {
    const html = renderServerSide(
      <ChatInput
        onSubmit={jest.fn()}
        translations={{
          'CioAsa.input.placeholder': 'Poser une question',
          'CioAsa.input.ariaLabel': 'Votre message',
        }}
      />,
    );

    expect(html).toContain('placeholder="Poser une question"');
    expect(html).toContain('aria-label="Votre message"');
  });

  it('does not call onSubmit during server rendering', () => {
    const onSubmit = jest.fn();

    renderServerSide(<ChatInput onSubmit={onSubmit} />);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders a component override with the current input render props', () => {
    const html = renderServerSide(
      <ChatInput
        onSubmit={jest.fn()}
        componentOverrides={{
          reactNode: ({ placeholder, isDisabled }) => (
            <form data-disabled={String(isDisabled)}>{placeholder}</form>
          ),
        }}
      />,
    );

    expect(html).toContain('data-disabled="false"');
    expect(html).toContain('Ask a question about this product');
    expect(html).not.toContain('cio-asa-chat-input__field');
  });
});
