import React from 'react';
import { renderServerSide, textOf } from '../../test-utils.server';
import WelcomeScreen from '../../../src/components/Chat/WelcomeScreen';

describe('WelcomeScreen (SSR)', () => {
  it('renders the title and input into the server markup', () => {
    const html = renderServerSide(<WelcomeScreen onSend={jest.fn()} />);

    expect(html).toContain('Shopping Assistant');
    expect(html).toContain('placeholder="Ask anything"');
    expect(html).toContain('aria-label="Type your question"');
  });

  it('renders every suggestion chip', () => {
    const html = renderServerSide(
      <WelcomeScreen onSend={jest.fn()} suggestions={['Find me a gift', 'What is on sale?']} />,
    );

    expect(html).toContain('Find me a gift');
    expect(html).toContain('What is on sale?');
    expect(html).toContain('aria-label="Suggested questions"');
  });

  it('omits the suggestions nav when there are no suggestions', () => {
    const html = renderServerSide(<WelcomeScreen onSend={jest.fn()} />);

    expect(html).not.toContain('cio-asa-welcome-screen__suggestions');
  });

  it('omits the close button unless onClose is supplied', () => {
    const withoutClose = renderServerSide(<WelcomeScreen onSend={jest.fn()} />);
    const withClose = renderServerSide(<WelcomeScreen onSend={jest.fn()} onClose={jest.fn()} />);

    expect(withoutClose).not.toContain('cio-asa-welcome-screen__close');
    expect(withClose).toContain('cio-asa-welcome-screen__close');
  });

  it('renders the terms node when provided', () => {
    const html = renderServerSide(
      <WelcomeScreen onSend={jest.fn()} termsText={<span>Terms apply</span>} />,
    );

    expect(html).toContain('Terms apply');
    expect(html).toContain('cio-asa-welcome-screen__terms');
  });

  it('marks the input row as disabled when disabled', () => {
    const html = renderServerSide(<WelcomeScreen onSend={jest.fn()} disabled />);

    expect(html).toContain('cio-asa-welcome-screen__input-row--disabled');
  });

  it('does not call onSend during server rendering', () => {
    const onSend = jest.fn();

    renderServerSide(<WelcomeScreen onSend={onSend} suggestions={['Anything?']} />);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('renders a title component override', () => {
    const html = renderServerSide(
      <WelcomeScreen
        onSend={jest.fn()}
        componentOverrides={{ title: { reactNode: ({ text }) => <h1>{text} v2</h1> } }}
      />,
    );

    expect(textOf(html)).toContain('Shopping Assistant v2');
    expect(html).not.toContain('cio-asa-welcome-screen__title');
  });
});
